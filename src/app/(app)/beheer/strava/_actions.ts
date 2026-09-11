"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  accessTokenFor,
  syncStravaActivitiesForUser,
  type StravaConnection,
} from "@/lib/strava/client";
import { syncClimbedColsForUser } from "@/lib/cols/detector";
import { syncColSegmentTimesForUser } from "@/lib/cols/segment-times";
import { evaluateMilestonesForUser } from "@/lib/achievements/milestone-evaluators";
import { hasActivityScope } from "@/lib/strava/scope";

export type AdminSyncResult =
  | { ok: false; error: string }
  | {
      ok: true;
      upserted: number;
      removed: number;
      totalSeen: number;
      nonCyclingSkipped: number;
      isFirstSync: boolean;
      done: boolean;
      stravaRateLimited: boolean;
      nextPage: number | null;
      afterTs: number;
    };

// Eén chunk van de sync voor een willekeurig lid, getriggerd door een
// beheerder. We houden 'm bewust licht (skipPostProcessing): de zware
// na-stappen (col-detector, segmenttijden, milestone-evaluators) lopen via de
// cron en de "Badges herberekenen"-knop, anders tikt een grote historie tegen
// de Netlify-functietimeout (~10s). Voor de statistieken volstaan de
// geïmporteerde ritten. De client rijgt de chunks aan elkaar.
export async function adminSyncStravaForProfile(options: {
  profileId: string;
  fullBackfill?: boolean;
  startPage?: number;
  afterTs?: number;
  chunkPages?: number;
}): Promise<AdminSyncResult> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false, error: "Niet ingelogd." };
  if (!access.has("community.manage")) {
    return { ok: false, error: "Geen recht om Strava-syncs te starten." };
  }

  const profileId = String(options.profileId ?? "").trim();
  if (!profileId) return { ok: false, error: "Ontbrekend profiel." };

  try {
    const admin = createAdminClient();
    const result = await syncStravaActivitiesForUser(admin, profileId, {
      fullBackfill: options.fullBackfill,
      startPage: options.startPage,
      afterTs: options.afterTs,
      chunkPages: options.chunkPages ?? 5,
      refreshAthleteInfo: options.startPage ? false : true,
      skipPostProcessing: true,
    });

    if (!result.ok) return { ok: false, error: friendlyError(result.error) };

    return {
      ok: true,
      upserted: result.upserted,
      removed: result.removed,
      totalSeen: result.totalSeen,
      nonCyclingSkipped: result.nonCyclingSkipped,
      isFirstSync: result.isFirstSync,
      done: result.done,
      stravaRateLimited: result.stravaRateLimited,
      nextPage: result.nextPage,
      afterTs: result.afterTs,
    };
  } catch (err) {
    return {
      ok: false,
      error: friendlyError(
        err instanceof Error ? err.message : "Strava-sync faalde.",
      ),
    };
  }
}

// Vertaal de ruwe Strava-foutmelding naar iets begrijpelijks. De
// activity:read-401 betekent dat het lid het activiteiten-vinkje niet aanzette;
// dat is alleen op te lossen door opnieuw te koppelen.
function friendlyError(message: string): string {
  if (/activity:read_permission|activity:read/i.test(message)) {
    return "Token mist het activiteiten-recht. Het lid moet Strava opnieuw koppelen en het vinkje voor activiteiten aanzetten.";
  }
  if (/401/.test(message)) {
    return "Strava-token geweigerd (401). Het lid moet Strava opnieuw koppelen.";
  }
  if (/429/.test(message)) {
    return "Strava rate-limit bereikt. Probeer het later opnieuw.";
  }
  return message;
}

export type AdminRecomputeResult =
  | { ok: false; error: string }
  | {
      ok: true;
      newCols: number;
      awarded: number;
      errors: string[];
      segmentTimesFetched: number;
      segmentTimesUpdated: number;
      segmentTimesRateLimited: boolean;
      segmentTimesSkipped: boolean;
    };

// Beklommen cols opnieuw detecteren + milestone-badges herberekenen voor één
// lid. Segmenttijden doen Strava-detailcalls, dus die vullen we in kleine
// batches aan. De client rijgt leden aan elkaar zodat we binnen timeouts en
// rate-limits blijven.
export async function adminRecomputeBadgesAndCols(
  profileId: string,
): Promise<AdminRecomputeResult> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false, error: "Niet ingelogd." };
  if (!access.has("community.manage")) {
    return { ok: false, error: "Geen recht om badges en cols te herberekenen." };
  }

  const id = String(profileId ?? "").trim();
  if (!id) return { ok: false, error: "Ontbrekend profiel." };

  try {
    const admin = createAdminClient();

    let newCols = 0;
    try {
      const cols = await syncClimbedColsForUser(admin, id);
      newCols = cols.newCols;
    } catch {
      // col-detectie is best-effort; badges draaien sowieso
    }

    let segmentTimesFetched = 0;
    let segmentTimesUpdated = 0;
    let segmentTimesRateLimited = false;
    let segmentTimesSkipped = false;

    try {
      const { data: connection, error } = await admin
        .from("strava_connections")
        .select(
          "profile_id, strava_athlete_id, access_token, refresh_token, expires_at, scope",
        )
        .eq("profile_id", id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!connection || !hasActivityScope(connection.scope)) {
        segmentTimesSkipped = true;
      } else {
        const accessToken = await accessTokenFor(
          admin,
          connection as StravaConnection,
        );
        const segmentResult = await syncColSegmentTimesForUser(
          admin,
          accessToken,
          id,
          { maxFetches: 10 },
        );
        segmentTimesFetched = segmentResult.fetched;
        segmentTimesUpdated = segmentResult.updated;
        segmentTimesRateLimited = segmentResult.rateLimited;
      }
    } catch {
      // Segmenttijden zijn best-effort; badges draaien sowieso.
      segmentTimesSkipped = true;
    }

    const result = await evaluateMilestonesForUser(admin, id);

    return {
      ok: true,
      newCols,
      awarded: result.awarded,
      errors: result.errors,
      segmentTimesFetched,
      segmentTimesUpdated,
      segmentTimesRateLimited,
      segmentTimesSkipped,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Badges en cols herberekenen faalde.",
    };
  }
}

// Eén keer aanroepen nadat een bulk-recompute klaar is: ververst de
// afgeleide pagina's zodat de nieuwe badges/cols overal zichtbaar worden.
export async function revalidateAfterRecompute() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.has("community.manage")) return;
  revalidatePath("/achievements");
  revalidatePath("/dashboard");
  revalidatePath("/leden");
  revalidatePath("/stats");
  revalidatePath("/profiel/segments");
}

// ──────────────────────────────────────────────────────────────────────
// Webhooks + koppelingbeheer
//
// De subscription moet vanuit de app aangemaakt kunnen worden en niet vanuit een
// script: Strava valideert de callback-URL met een live handshake, dus dit werkt
// alleen tegen productie, en na een domeinwijziging moet het opnieuw kunnen
// zonder deploy.
// ──────────────────────────────────────────────────────────────────────

export type SubscriptionState = {
  ok: boolean;
  error?: string;
  subscription?: { id: number; callbackUrl: string | null; createdAt: string | null } | null;
  expectedCallbackUrl?: string;
};

async function requireManager() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.has("community.manage")) {
    throw new Error("Geen rechten voor Strava-beheer.");
  }
  return supabase;
}

export async function adminViewStravaSubscription(): Promise<SubscriptionState> {
  try {
    await requireManager();
    const { viewSubscription, callbackUrl } = await import("@/lib/strava/subscription");
    const subscription = await viewSubscription();
    return {
      ok: true,
      subscription,
      expectedCallbackUrl: safeCallbackUrl(callbackUrl),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Subscription opvragen faalde.",
    };
  }
}

export async function adminCreateStravaSubscription(): Promise<SubscriptionState> {
  try {
    await requireManager();
    const { createSubscription, verifyToken, callbackUrl } = await import(
      "@/lib/strava/subscription"
    );
    const subscription = await createSubscription();

    const admin = createAdminClient();
    await admin.from("strava_webhook_subscriptions").upsert(
      {
        id: subscription.id,
        callback_url: subscription.callbackUrl ?? callbackUrl(),
        verify_token: verifyToken(),
        deleted_at: null,
      },
      { onConflict: "id" },
    );

    revalidatePath("/beheer/strava");
    return { ok: true, subscription };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Subscription aanmaken faalde.",
    };
  }
}

export async function adminDeleteStravaSubscription(
  id: number,
): Promise<SubscriptionState> {
  try {
    await requireManager();
    const { deleteSubscription } = await import("@/lib/strava/subscription");
    await deleteSubscription(id);

    const admin = createAdminClient();
    await admin
      .from("strava_webhook_subscriptions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    revalidatePath("/beheer/strava");
    return { ok: true, subscription: null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Subscription verwijderen faalde.",
    };
  }
}

/** Ruimt de koppeling van één lid op, inclusief deauthorisatie bij Strava. */
export async function adminRevokeStravaConnection(profileId: string) {
  try {
    await requireManager();
    const admin = createAdminClient();
    const { revokeAndCleanupStravaConnection } = await import("@/lib/strava/sweep");
    const result = await revokeAndCleanupStravaConnection(admin, profileId, "admin");
    revalidatePath("/beheer/strava");
    return {
      ok: true as const,
      deauthorized: result.deauthorized,
      error: result.error,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Koppeling opruimen faalde.",
    };
  }
}

/** Draait de nachtelijke opruiming nu, zodat een beheerder niet hoeft te wachten. */
export async function adminRunStravaSweep() {
  try {
    await requireManager();
    const admin = createAdminClient();
    const { runStravaSweep } = await import("@/lib/strava/sweep");
    const result = await runStravaSweep(admin);
    revalidatePath("/beheer/strava");
    return { ok: true as const, ...result };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Opruiming faalde.",
    };
  }
}

function safeCallbackUrl(build: () => string): string | undefined {
  try {
    return build();
  } catch {
    return undefined;
  }
}

/**
 * Draait de webhook-verwerker nu. Normaal doet de Netlify scheduled function
 * `strava-webhook-process` dit elke 5 minuten; deze knop bestaat om te kunnen
 * zien of het verwerken zélf werkt wanneer events blijven staan. Blijft de
 * wachtrij vollopen terwijl deze knop hem leegtrekt, dan ligt het aan de
 * scheduled function of aan STRAVA_SYNC_SECRET, niet aan de verwerking.
 */
export async function adminProcessStravaWebhookEvents() {
  try {
    await requireManager();
    const admin = createAdminClient();
    const { processStravaWebhookEvents } = await import(
      "@/lib/strava/webhook-processor"
    );
    const result = await processStravaWebhookEvents(admin, { maxEvents: 25 });
    revalidatePath("/beheer/strava");
    return { ok: true as const, ...result };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Events verwerken faalde.",
    };
  }
}
