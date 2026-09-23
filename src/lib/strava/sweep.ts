// De nachtelijke opruiming van Strava-koppelingen.
//
// Strava's afwijzing van onze capaciteitsaanvraag: "Apps that actively manage
// deauthorization maintain a lower connected athlete count, which directly impacts
// your eligibility for capacity increases." Dit bestand is dat actieve beheer.
//
// Drie stappen per run, in deze volgorde:
//   1. openstaande deauthorisaties opnieuw proberen (de call kan gefaald hebben);
//   2. afgeronde deauthorisaties opruimen (data wissen, rij weg);
//   3. het inactiviteitsbeleid toepassen (waarschuwen, later opheffen).

import { accessTokenFor, type StravaConnection } from "@/lib/strava/client";
import { deauthorizeStravaAthlete } from "@/lib/strava/deauthorize";
import {
  evaluateInactivity,
  loginRuleFor,
  revocationPatch,
  type LoginRuleConfig,
  StravaConnectionRevokedError,
  type RevokedReason,
} from "@/lib/strava/lifecycle";
import { purgeStravaDataForProfile } from "@/lib/strava/retention";
import { sendNotificationToMembers } from "@/lib/push/send";

type ConnectionRow = StravaConnection & {
  scope: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  deauthorized_at: string | null;
  inactivity_warned_at: string | null;
};

const CONNECTION_COLUMNS =
  "profile_id, strava_athlete_id, access_token, refresh_token, expires_at, scope, revoked_at, revoked_reason, deauthorized_at, inactivity_warned_at";

export type SweepResult = {
  deauthorized: number;
  deauthorizeFailed: number;
  purged: number;
  warned: number;
  revokedForInactivity: number;
  errors: string[];
};

/**
 * Heft één koppeling op: eerst Strava vertellen, dan pas markeren.
 *
 * Mislukt de call, dan blijft de rij staan met revoked_at gezet en
 * deauthorized_at leeg — de app negeert 'm vanaf nu, maar we houden de token nog
 * even zodat de sweeper het opnieuw kan proberen. Weggooien zou betekenen dat de
 * atleet voorgoed in onze cap blijft hangen zonder dat we er nog bij kunnen.
 */
export async function revokeStravaConnection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
  reason: RevokedReason,
): Promise<{ deauthorized: boolean; error?: string }> {
  const { data } = await admin
    .from("strava_connections")
    .select(CONNECTION_COLUMNS)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!data) return { deauthorized: true };
  const connection = data as ConnectionRow;

  let deauthorized = false;
  let error: string | undefined;

  try {
    const accessToken = await accessTokenFor(admin, connection);
    const result = await deauthorizeStravaAthlete(accessToken);
    if (result.ok) deauthorized = true;
    else error = result.error;
  } catch (err) {
    if (err instanceof StravaConnectionRevokedError) {
      // De grant bestond al niet meer; er valt niets meer in te trekken.
      deauthorized = true;
    } else {
      error = err instanceof Error ? err.message : "Deauthorisatie faalde.";
    }
  }

  await admin
    .from("strava_connections")
    .update(revocationPatch(reason, { deauthorized, error: error ?? null }))
    .eq("profile_id", profileId);

  return { deauthorized, error };
}

/**
 * Opheffen én meteen opruimen. Voor de knop van het lid zelf en voor de
 * beheerdersactie: die willen direct resultaat zien, niet pas na de nachtrun.
 *
 * Lukt de deauthorisatie niet, dan blijft de rij (gemarkeerd) staan zodat de
 * sweeper het opnieuw probeert — de data wordt dan ook nog niet gewist, want het
 * lid is op Strava's kant nog gekoppeld.
 */
export async function revokeAndCleanupStravaConnection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
  reason: RevokedReason,
): Promise<{ deauthorized: boolean; purged: boolean; error?: string }> {
  const revoked = await revokeStravaConnection(admin, profileId, reason);
  if (!revoked.deauthorized) {
    return { deauthorized: false, purged: false, error: revoked.error };
  }

  await purgeStravaDataForProfile(admin, profileId);
  await admin.from("strava_connections").delete().eq("profile_id", profileId);
  return { deauthorized: true, purged: true };
}

/** Stap 1: koppelingen die zijn opgeheven maar waar Strava nog niets van weet. */
export async function retryPendingDeauthorizations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  limit = 25,
): Promise<{ deauthorized: number; failed: number; errors: string[] }> {
  const { data } = await admin
    .from("strava_connections")
    .select("profile_id, revoked_reason")
    .not("revoked_at", "is", null)
    .is("deauthorized_at", null)
    .order("revoked_at", { ascending: true })
    .limit(limit);

  let deauthorized = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of (data ?? []) as Array<{
    profile_id: string;
    revoked_reason: string | null;
  }>) {
    const reason = (row.revoked_reason ?? "member") as RevokedReason;
    const result = await revokeStravaConnection(admin, row.profile_id, reason);
    if (result.deauthorized) deauthorized += 1;
    else {
      failed += 1;
      if (result.error) errors.push(`${row.profile_id}: ${result.error}`);
    }
  }

  return { deauthorized, failed, errors };
}

/**
 * Stap 2: alles opruimen van koppelingen waarvan Strava's kant echt los is.
 *
 * Hier landt het retentiebesluit: de ruwe Strava-data gaat weg, de afgeleide
 * clubdata (badges, ZWBlokken, onderhoud, coltijden) blijft.
 */
export async function purgeDeauthorizedConnections(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  limit = 25,
): Promise<{ purged: number; errors: string[] }> {
  const { data } = await admin
    .from("strava_connections")
    .select("profile_id")
    .not("deauthorized_at", "is", null)
    .order("deauthorized_at", { ascending: true })
    .limit(limit);

  let purged = 0;
  const errors: string[] = [];

  for (const row of (data ?? []) as Array<{ profile_id: string }>) {
    try {
      await purgeStravaDataForProfile(admin, row.profile_id);
      await admin
        .from("strava_connections")
        .delete()
        .eq("profile_id", row.profile_id);
      purged += 1;
    } catch (err) {
      errors.push(
        `${row.profile_id}: ${err instanceof Error ? err.message : "opruimen faalde"}`,
      );
    }
  }

  return { purged, errors };
}

/**
 * Stap 3: het inactiviteitsbeleid.
 *
 * Een koppeling die niets meer oplevert en waarvan het lid niet meer langskomt,
 * houdt een plek bezet die een actief lid kan gebruiken. Nooit stil: eerst een
 * waarschuwing, dan pas na de respijtperiode opheffen.
 */
export async function applyInactivityPolicy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  options: {
    inactiveMonths?: number;
    graceDays?: number;
    limit?: number;
    loginRule?: LoginRuleConfig | null;
  } = {},
): Promise<{ warned: number; revoked: number; errors: string[] }> {
  const inactiveMonths = Math.max(1, options.inactiveMonths ?? 12);
  const graceDays = Math.max(1, options.graceDays ?? 30);
  const limit = Math.max(1, options.limit ?? 50);
  const now = new Date();

  const { data } = await admin
    .from("strava_connections")
    .select("profile_id, connected_at, inactivity_warned_at")
    .is("revoked_at", null)
    // Zonder ordening geeft Postgres bij meer koppelingen dan `limit` een
    // willekeurige greep; dan wordt er nooit een hele ronde gemaakt.
    .order("connected_at", { ascending: true })
    .limit(limit);

  const rows = (data ?? []) as Array<{
    profile_id: string;
    connected_at: string | null;
    inactivity_warned_at: string | null;
  }>;
  if (rows.length === 0) return { warned: 0, revoked: 0, errors: [] };

  const lastSeen = await lastSeenByProfile(admin);
  if (!lastSeen) {
    // Eén van de twee signalen ontbreekt. Doorgaan zou betekenen dat we leden
    // waarschuwen op basis van halve informatie, en dit beleid neemt ze iets af.
    return {
      warned: 0,
      revoked: 0,
      errors: ["Inactiviteitsbeleid overgeslagen: laatst gezien niet leesbaar."],
    };
  }

  const errors: string[] = [];
  let loginRule = options.loginRule ?? null;
  if (loginRule && !lastSeen.reliable) {
    // Zonder member_last_seen() valt alleen last_sign_in_at terug, en die loopt
    // maanden achter bij wie ingelogd blijft. De loginregel zou dan juist de
    // trouwste bezoekers raken.
    loginRule = null;
    errors.push(
      "Loginregel overgeslagen: member_last_seen() niet beschikbaar (migratie 0189).",
    );
  }

  let warned = 0;
  let revoked = 0;

  for (const row of rows) {
    const { data: activity } = await admin
      .from("strava_activities")
      .select("start_date")
      .eq("profile_id", row.profile_id)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { decision, graceDays: warnGraceDays } = evaluateInactivity({
      lastActivityAt: (activity?.start_date as string | null) ?? null,
      lastSeenAt: lastSeen.byProfile.get(row.profile_id) ?? null,
      connectedAt: row.connected_at,
      inactivityWarnedAt: row.inactivity_warned_at,
      now,
      inactiveMonths,
      graceDays,
      loginRule,
    });

    try {
      if (decision === "active" && row.inactivity_warned_at) {
        // Weer actief: de waarschuwing vervalt.
        await admin
          .from("strava_connections")
          .update({ inactivity_warned_at: null })
          .eq("profile_id", row.profile_id);
        continue;
      }

      if (decision === "warn") {
        await admin
          .from("strava_connections")
          .update({ inactivity_warned_at: now.toISOString() })
          .eq("profile_id", row.profile_id);
        await sendNotificationToMembers(
          "on_strava_link_expiring",
          {
            title: "Je Strava-koppeling vervalt",
            body: `Open ZWB binnen ${warnGraceDays} dagen om je Strava-koppeling te houden.`,
            url: "/profiel#strava",
            tag: "strava-link-expiring",
          },
          { profileIds: [row.profile_id] },
        ).catch(() => null);
        warned += 1;
        continue;
      }

      if (decision === "revoke") {
        await revokeStravaConnection(admin, row.profile_id, "inactive");
        revoked += 1;
      }
    } catch (err) {
      errors.push(
        `${row.profile_id}: ${err instanceof Error ? err.message : "inactiviteitscheck faalde"}`,
      );
    }
  }

  return { warned, revoked, errors };
}

export type LastSeen = {
  byProfile: Map<string, string | null>;
  /** false = alleen last_sign_in_at gelezen; die loopt achter bij wie ingelogd blijft. */
  reliable: boolean;
};

/**
 * Wanneer elk lid voor het laatst in de app was. Bron is `member_last_seen()`
 * (migratie 0189), die ook sessieverversingen meetelt. Bestaat die functie nog
 * niet, dan valt dit terug op auth.users.last_sign_in_at via de admin-API, met
 * `reliable: false`.
 *
 * Geeft null terug als geen van beide te lezen was. Dat verschil is belangrijk:
 * een lege map zou betekenen "niemand komt langs", en dan waarschuwen we leden
 * die dagelijks in de app zitten. Bij null slaan we het beleid deze run over.
 */
export async function lastSeenByProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): Promise<LastSeen | null> {
  try {
    const { data, error } = await admin.rpc("member_last_seen");
    if (!error && Array.isArray(data)) {
      const byProfile = new Map<string, string | null>();
      for (const row of data as Array<{
        profile_id: string;
        last_seen_at: string | null;
      }>) {
        byProfile.set(row.profile_id, row.last_seen_at ?? null);
      }
      return { byProfile, reliable: true };
    }
  } catch {
    // Val terug op de admin-API hieronder.
  }

  const byProfile = new Map<string, string | null>();
  try {
    for (let page = 1; page <= 5; page++) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) return null;
      const users = (data?.users ?? []) as Array<{
        id: string;
        last_sign_in_at?: string | null;
      }>;
      for (const user of users) {
        byProfile.set(user.id, user.last_sign_in_at ?? null);
      }
      if (users.length < 200) break;
    }
  } catch {
    return null;
  }
  return { byProfile, reliable: false };
}

function envInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** De athlete cap zoals Strava hem nu toestaat; met de hand bij te werken in de env. */
export function stravaAthleteCap(): number {
  return envInt("STRAVA_ATHLETE_CAP", 10);
}

/**
 * De loginregel uit de env. STRAVA_LOGIN_INACTIVITY_DAYS=0 zet hem uit, een
 * STRAVA_ATHLETE_CAP boven de 10 ook.
 */
export function loginRuleFromEnv(): LoginRuleConfig | null {
  return loginRuleFor({
    athleteCap: stravaAthleteCap(),
    days: envInt("STRAVA_LOGIN_INACTIVITY_DAYS", 90),
    graceDays: envInt("STRAVA_LOGIN_GRACE_DAYS", 14),
  });
}

export async function runStravaSweep(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  options: {
    inactiveMonths?: number;
    graceDays?: number;
    loginRule?: LoginRuleConfig | null;
  } = {},
): Promise<SweepResult> {
  const pending = await retryPendingDeauthorizations(admin);
  const purge = await purgeDeauthorizedConnections(admin);
  const inactivity = await applyInactivityPolicy(admin, {
    ...options,
    loginRule:
      options.loginRule === undefined ? loginRuleFromEnv() : options.loginRule,
  });

  return {
    deauthorized: pending.deauthorized,
    deauthorizeFailed: pending.failed,
    purged: purge.purged,
    warned: inactivity.warned,
    revokedForInactivity: inactivity.revoked,
    errors: [...pending.errors, ...purge.errors, ...inactivity.errors],
  };
}
