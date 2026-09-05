import { encryptSecret, decryptSecret } from "@/lib/crypto/secrets";
import { guessDiscipline } from "@/lib/maintenance/guess-discipline";
import { hasActivityWriteScope } from "@/lib/strava/scope";
import { isCyclingSportType } from "@/lib/strava/sports";
import { isInvalidGrant } from "@/lib/strava/deauthorize";
import {
  revocationPatch,
  StravaConnectionRevokedError,
} from "@/lib/strava/lifecycle";
import {
  loadRateLimitUsage,
  recordRateLimitUsage,
  shouldPauseForRateLimit,
} from "@/lib/strava/rate-limit-budget";

type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
  athlete?: {
    id?: number;
    username?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    // Strava's DetailedAthlete bevat ook profielfotos:
    // - profile: large (1024px)
    // - profile_medium: medium (~256px), ideaal voor avatar
    profile?: string | null;
    profile_medium?: string | null;
  };
};

export type StravaConnection = {
  profile_id: string;
  strava_athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

type StravaActivity = {
  id: number;
  name?: string;
  sport_type?: string;
  type?: string;
  start_date?: string;
  distance?: number;
  total_elevation_gain?: number;
  kudos_count?: number;
  moving_time?: number;
  elapsed_time?: number;
  trainer?: boolean;
  commute?: boolean;
};

function stravaEnv() {
  // .trim() vangt onzichtbare whitespace/newlines vanuit .env af.
  const clientId = process.env.STRAVA_CLIENT_ID?.trim();
  const clientSecret = process.env.STRAVA_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("STRAVA_CLIENT_ID en STRAVA_CLIENT_SECRET zijn nodig.");
  }

  // Strava client_id is altijd een numerieke string (meestal 5-6 cijfers).
  // Als die test faalt is er bijna zeker iets misgegaan met copy-paste.
  if (!/^\d+$/.test(clientId)) {
    throw new Error(
      `STRAVA_CLIENT_ID ziet er ongebruikelijk uit ("${clientId.slice(0, 20)}…"). Het hoort een puur numerieke string te zijn (5-6 cijfers). Controleer https://www.strava.com/settings/api → het bovenste veld "Client ID".`,
    );
  }

  return { clientId, clientSecret };
}

function formBody(values: Record<string, string>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) body.set(key, value);
  return body;
}

async function postToken(values: Record<string, string>) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody(values),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 && /Application/i.test(text) && /invalid/i.test(text)) {
      throw new Error(
        `Strava: STRAVA_CLIENT_ID/SECRET worden afgewezen. Check 3 dingen op https://www.strava.com/settings/api: (1) client_id is het bovenste veld en numeriek; (2) client_secret is met "Show" zichtbaar te maken; (3) "Authorization Callback Domain" matcht (alleen hostname, geen pad/https). Daarna .env.local + Netlify env opnieuw zetten en herstarten/redeployen.`,
      );
    }
    throw new Error(`Strava token request faalde (${res.status}): ${text.slice(0, 160)}`);
  }

  return (await res.json()) as StravaTokenResponse;
}

export function stravaAuthorizeUrl(redirectUri: string, state: string) {
  const { clientId } = stravaEnv();
  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  // approval_prompt=force zodat een scope-uitbreiding (profile:read_all, nodig
  // voor de fiets-/gear-data) ook bij al-gekoppelde leden opnieuw wordt
  // gevraagd; met "auto" hergebruikt Strava de oude toestemming zonder de
  // nieuwe scope. profile:read_all is vereist om bikes/shoes uit /athlete te
  // krijgen (gear ontbreekt anders volledig in de response). activity:write is
  // nodig om de ZWBeter Worden-samenvatting in de Strava-beschrijving te zetten;
  // leden die nog niet opnieuw hebben gekoppeld missen dat recht en worden
  // daarvoor stil overgeslagen (de rest van de sync blijft gewoon werken).
  url.searchParams.set("approval_prompt", "force");
  url.searchParams.set(
    "scope",
    "read,activity:read_all,activity:write,profile:read_all",
  );
  url.searchParams.set("state", state);
  return url;
}

/**
 * Strava's standaard ei-avatar wordt door /athlete teruggegeven als een
 * gebruiker geen foto heeft. We slaan die niet op — dan toont onze app
 * de initials-fallback.
 */
const STRAVA_DEFAULT_AVATAR_PATTERN = /avatar\/athlete\/(large|medium|small)\.(png|gif|jpg|jpeg)/i;

export function pickAthleteAvatarUrl(
  token: Pick<StravaTokenResponse, "athlete">,
): string | null {
  const url = token.athlete?.profile_medium ?? token.athlete?.profile ?? null;
  if (!url) return null;
  if (STRAVA_DEFAULT_AVATAR_PATTERN.test(url)) return null;
  return url;
}

export async function exchangeStravaCode(code: string) {
  const { clientId, clientSecret } = stravaEnv();
  return await postToken({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });
}

// Helper voor connect-route: bepaal de publieke base-URL voor redirect_uri.
// Netlify routet via interne URLs waardoor request.url niet betrouwbaar is.
export function publicBaseUrl(requestUrl: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl && /^https?:\/\//i.test(siteUrl)) return siteUrl;
  return requestUrl;
}

async function refreshStravaToken(refreshToken: string) {
  const { clientId, clientSecret } = stravaEnv();
  return await postToken({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
}

function isCyclingActivity(activity: StravaActivity) {
  return isCyclingSportType(activity.sport_type ?? activity.type);
}

export function weekStartDate(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function currentAchievementWeek() {
  return dateOnly(weekStartDate());
}

export async function accessTokenFor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  connection: StravaConnection,
) {
  const now = Math.floor(Date.now() / 1000);
  // Tokens kunnen versleuteld uit de DB komen; centraal ontsleutelen bij gebruik.
  if (connection.expires_at > now + 600) return decryptSecret(connection.access_token);

  let refreshed: StravaTokenResponse;
  try {
    refreshed = await refreshStravaToken(decryptSecret(connection.refresh_token));
  } catch (err) {
    // Een refresh-token die Strava niet meer accepteert betekent dat de atleet de
    // app op strava.com heeft ingetrokken. Tot nu toe kwam dat als generieke fout
    // naar boven en probeerde de cron dezelfde dode koppeling elke run opnieuw.
    // Nu markeren we 'm meteen: er valt niets meer te deauthoriseren, de grant is
    // al weg, dus deauthorized_at gaat direct mee.
    if (isInvalidGrant(err)) {
      await supabase
        .from("strava_connections")
        .update(
          revocationPatch("invalid_grant", {
            deauthorized: true,
            error: err instanceof Error ? err.message : String(err),
          }),
        )
        .eq("profile_id", connection.profile_id);
      throw new StravaConnectionRevokedError("invalid_grant");
    }
    throw err;
  }

  const { error } = await supabase
    .from("strava_connections")
    .update({
      access_token: encryptSecret(refreshed.access_token),
      refresh_token: encryptSecret(refreshed.refresh_token),
      expires_at: refreshed.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", connection.profile_id);

  if (error) throw new Error(error.message);
  return refreshed.access_token;
}

/**
 * Haal de actuele athlete-info op (foto, naam, FTP, etc.) en update
 * profiles.avatar_url als de gebruiker een echte Strava-foto heeft en
 * er nog geen handmatige avatar staat.
 */
export async function refreshStravaAthleteInfo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  accessToken: string,
): Promise<{ avatarUrl: string | null }> {
  try {
    const res = await fetch("https://www.strava.com/api/v3/athlete", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { avatarUrl: null };
    const athlete = (await res.json()) as {
      username?: string | null;
      profile?: string | null;
      profile_medium?: string | null;
    };

    const avatar = pickAthleteAvatarUrl({ athlete });

    // strava_connections.athlete_username updaten zodat /profiel-header
    // de handle kan tonen na een sync zonder reconnect.
    if (athlete.username) {
      await supabase
        .from("strava_connections")
        .update({ athlete_username: athlete.username })
        .eq("profile_id", profileId);
    }

    if (!avatar) return { avatarUrl: null };

    // Overschrijf alleen als er nog geen avatar is OF de bestaande is van
    // Strava's CDN (zodat een handmatige upload niet wordt vervangen).
    const { data: current } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", profileId)
      .single();
    const existing = current?.avatar_url as string | null | undefined;
    const isStravaCdn =
      !existing ||
      /strava|cloudfront\.net\/(avatar|pictures)/i.test(existing);
    if (isStravaCdn) {
      await supabase
        .from("profiles")
        .update({ avatar_url: avatar })
        .eq("id", profileId);
    }

    return { avatarUrl: avatar };
  } catch {
    return { avatarUrl: null };
  }
}

/**
 * Synct de fietsen ("gear") van het athlete-profiel naar strava_bikes.
 * /api/v3/athlete geeft bikes[] met levensduur-afstand (meters) terug — één
 * goedkope call. Best-effort: faalt stil zodat de activity-sync niet breekt.
 */
export async function syncStravaBikesForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  accessToken: string,
  options: { minIntervalHours?: number } = {},
): Promise<{ synced: number; skipped: boolean }> {
  try {
    const minIntervalHours = Math.max(0, options.minIntervalHours ?? 0);
    if (minIntervalHours > 0) {
      const cutoff = new Date(Date.now() - minIntervalHours * 3600_000);
      const { data: lastSync } = await supabase
        .from("strava_bikes")
        .select("synced_at")
        .eq("profile_id", profileId)
        .eq("source", "strava")
        .order("synced_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (
        lastSync?.synced_at &&
        new Date(String(lastSync.synced_at)).getTime() > cutoff.getTime()
      ) {
        return { synced: 0, skipped: true };
      }
    }

    const res = await fetch("https://www.strava.com/api/v3/athlete", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { synced: 0, skipped: false };
    const athlete = (await res.json()) as {
      bikes?: Array<{
        id?: string;
        name?: string | null;
        distance?: number;
        primary?: boolean;
        retired?: boolean;
        brand_name?: string | null;
        model_name?: string | null;
      }>;
    };

    const bikeIds = (athlete.bikes ?? [])
      .map((bike) => (bike.id ? String(bike.id) : null))
      .filter((id): id is string => Boolean(id));
    const existingBrandModels = new Map<string, string>();
    // Het fietstype wordt bij de eerste sync gegokt, maar een correctie van het
    // lid moet elke volgende sync overleven — dus lezen we de huidige waarde en
    // schrijven die terug.
    const existingDisciplines = new Map<string, string>();
    if (bikeIds.length > 0) {
      const { data: existingBikes } = await supabase
        .from("strava_bikes")
        .select("id, brand_model, discipline")
        .eq("profile_id", profileId)
        .eq("source", "strava")
        .in("id", bikeIds);
      for (const existingBike of existingBikes ?? []) {
        const brandModel = String(existingBike.brand_model ?? "").trim();
        if (brandModel) existingBrandModels.set(String(existingBike.id), brandModel);
        const discipline = String(existingBike.discipline ?? "").trim();
        if (discipline) existingDisciplines.set(String(existingBike.id), discipline);
      }
    }

    const rows = (athlete.bikes ?? [])
      .filter((b) => b.id)
      .map((b) => {
        const id = String(b.id);
        return {
          id,
          profile_id: profileId,
          name: b.name ?? null,
          brand_model:
            existingBrandModels.get(id) ??
            ([b.brand_name, b.model_name].filter(Boolean).join(" ") || null),
          distance_m: typeof b.distance === "number" ? b.distance : 0,
          is_primary: Boolean(b.primary),
          retired: Boolean(b.retired),
          discipline:
            existingDisciplines.get(id) ??
            guessDiscipline(b.name, [b.brand_name, b.model_name].filter(Boolean).join(" ")),
          source: "strava",
          synced_at: new Date().toISOString(),
        };
      });

    if (rows.length === 0) return { synced: 0, skipped: false };
    await supabase.from("strava_bikes").upsert(rows, { onConflict: "id" });
    return { synced: rows.length, skipped: false };
  } catch {
    return { synced: 0, skipped: false };
  }
}

export type SyncChunkOptions = {
  fullBackfill?: boolean;
  /** Athlete-profiel opnieuw ophalen. Voor frequente cronruns meestal false. */
  refreshAthleteInfo?: boolean;
  /** Voor resumable sync: vanaf welke Strava-pagina (1-based). Default 1. */
  startPage?: number;
  /** Unix-seconds; als gezet wordt deze gebruikt i.p.v. de smart-since-check. */
  afterTs?: number;
  /** Max aantal pagina's per server-invocation. Default 5 → ~5-8s wall clock. */
  chunkPages?: number;
  /** Begrens dure detailed-activity calls voor coltijden. */
  colSegmentMaxFetches?: number;
  /** Begrens extra detailed-activity calls voor ZWB Segments. */
  zwbSegmentMaxFetches?: number;
  /** Hoeveel Strava-beschrijvingen per run een ZWB-samenvatting krijgen. 0 = uit. */
  zwbSummaryMaxWrites?: number;
  /** Recent venster waarin Strava leidend is voor updates en verwijderingen. */
  reconciliationDays?: number;
  /**
   * Sla de zware na-sync-stappen over (watopia-kalibratie, col-detector,
   * segmenttijden, milestone-evaluators). De gear-/onderhoud-sync draait
   * altijd. Bedoeld voor de interactieve sync, die anders op een grote
   * historie tegen de Netlify-functietimeout (~10s) aanloopt; badges/cols
   * lopen dan via de cron en "Badges herberekenen".
   */
  skipPostProcessing?: boolean;
};

export async function syncStravaActivitiesForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  options: SyncChunkOptions = {},
) {
  const { data: connection, error } = await supabase
    .from("strava_connections")
    .select(
      "profile_id, strava_athlete_id, access_token, refresh_token, expires_at, scope, revoked_at",
    )
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!connection) {
    return { ok: false as const, error: "Koppel eerst Strava." };
  }
  // Een opgeheven koppeling wordt nooit meer gesynct; de rij bestaat alleen nog
  // tot de sweeper de deauthorisatie bij Strava heeft afgerond.
  if ((connection as { revoked_at?: string | null }).revoked_at) {
    return { ok: false as const, error: "Deze Strava-koppeling is opgeheven." };
  }

  const accessToken = await accessTokenFor(supabase, connection as StravaConnection);

  const startPage = Math.max(1, options.startPage ?? 1);
  const chunkPages = Math.max(1, options.chunkPages ?? 5);
  const reconciliationDays = Math.max(1, options.reconciliationDays ?? 30);

  // Avatar refresh: alleen op de eerste chunk (page 1) zodat we 'm niet
  // bij elke vervolg-call opnieuw doen.
  if (startPage === 1 && options.refreshAthleteInfo !== false) {
    await refreshStravaAthleteInfo(supabase, profileId, accessToken);
  }

  // Smart since-datum: bij eerste sync 5 jaar terug. Daarna halen we minimaal
  // de laatste 30 dagen opnieuw op, zodat Strava-naamswijzigingen doorkomen en
  // verwijderde device-dubbelen uit de lokale database kunnen worden gehaald.
  // Met fullBackfill=true overrulen we de DB-check zodat retroactieve
  // milestone-detectie mogelijk wordt zonder de DB te wissen.
  // afterTs override: client geeft 'm mee op vervolg-chunks zodat we niet
  // opnieuw rekenen (en daarmee per ongeluk de cursor verzetten).
  let isFirstSync = false;
  let after: number;
  if (typeof options.afterTs === "number") {
    after = options.afterTs;
    isFirstSync = Boolean(options.fullBackfill);
  } else if (options.fullBackfill) {
    isFirstSync = true;
    after = Math.floor((Date.now() - 5 * 365 * 86400_000) / 1000);
  } else {
    const { data: mostRecent } = await supabase
      .from("strava_activities")
      .select("start_date")
      .eq("profile_id", profileId)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    isFirstSync = !mostRecent?.start_date;
    const recentCutoff = Date.now() - reconciliationDays * 86400_000;
    const since = isFirstSync
      ? new Date(Date.now() - 5 * 365 * 86400_000)
      : new Date(
          Math.min(
            new Date(mostRecent!.start_date).getTime() - 86400_000,
            recentCutoff,
          ),
        );
    after = Math.floor(since.getTime() / 1000);
  }

  // Paginate door deze chunk. Per page upsert in 1 batch i.p.v. 100 calls.
  const PER_PAGE = 100;
  const PAGE_DELAY_MS = 200;

  let upserted = 0;
  let totalSeen = 0;
  let pagesScanned = 0;
  let nonCyclingSkipped = 0;
  let nextPage: number | null = null;
  let doneInThisChunk = false;
  let lastPageProcessed = startPage - 1;
  let stravaRateLimited = false;
  const remoteCyclingActivityIds = new Set<number>();

  // Strava's limieten gelden per applicatie. Het laatst waargenomen verbruik staat
  // in strava_api_usage, zodat een koud gestarte cronrun weet wat de vorige run
  // heeft opgemaakt — anders is een dagbudget bewaken onmogelijk.
  const budgetBefore = shouldPauseForRateLimit(await loadRateLimitUsage(supabase));
  if (budgetBefore.pause) {
    return {
      ok: true as const,
      upserted: 0,
      removed: 0,
      milestoneAwards: 0,
      milestoneErrors: [],
      colSegmentTimesFetched: 0,
      colSegmentTimesUpdated: 0,
      colSegmentTimesRateLimited: false,
      zwbSegmentsFetched: 0,
      zwbSegmentEffortsStored: 0,
      zwbSegmentsCompleted: 0,
      zwbSegmentsRateLimited: false,
      zwbSummariesWritten: 0,
      zwbSummariesSkipped: 0,
      zwbSummariesRateLimited: false,
      pagesScanned: 0,
      totalSeen: 0,
      nonCyclingSkipped: 0,
      isFirstSync,
      nextPage: startPage,
      afterTs: after,
      done: false,
      stravaRateLimited: true,
    };
  }

  for (let i = 0; i < chunkPages; i++) {
    const page = startPage + i;
    const url = new URL("https://www.strava.com/api/v3/athlete/activities");
    url.searchParams.set("after", String(after));
    url.searchParams.set("per_page", String(PER_PAGE));
    url.searchParams.set("page", String(page));

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      // Als enige call had deze geen timeout; een hangende fetch kostte de hele
      // Netlify-invocatie.
      signal: AbortSignal.timeout(15_000),
    });

    const usage = await recordRateLimitUsage(supabase, res.headers);

    if (res.status === 429) {
      // Rate-limited binnen deze chunk: geef cursor terug zodat de client
      // 'm na ~60s opnieuw probeert. We blokkeren niet de hele function.
      nextPage = page;
      stravaRateLimited = true;
      break;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Strava activiteiten ophalen faalde (${res.status}): ${text.slice(0, 160)}`,
      );
    }

    const rawBatch = (await res.json()) as StravaActivity[];
    pagesScanned++;
    lastPageProcessed = page;
    totalSeen += rawBatch.length;

    if (rawBatch.length === 0) {
      doneInThisChunk = true;
      break; // einde historie
    }

    const cycling = rawBatch.filter(isCyclingActivity);
    nonCyclingSkipped += rawBatch.length - cycling.length;
    for (const activity of cycling) {
      if (activity.id) remoteCyclingActivityIds.add(Number(activity.id));
    }

    if (cycling.length > 0) {
      const rows = cycling
        .filter((a) => a.id && a.start_date)
        .map((activity) => {
          const startDate = new Date(activity.start_date!);
          return {
            id: activity.id,
            profile_id: profileId,
            strava_athlete_id: Number(
              (connection as StravaConnection).strava_athlete_id,
            ),
            name: activity.name ?? "Strava activiteit",
            sport_type: activity.sport_type ?? activity.type ?? null,
            start_date: startDate.toISOString(),
            achievement_week: dateOnly(weekStartDate(startDate)),
            distance_m: activity.distance ?? 0,
            total_elevation_gain_m: activity.total_elevation_gain ?? 0,
            kudos_count: activity.kudos_count ?? 0,
            moving_time_seconds: activity.moving_time ?? 0,
            elapsed_time_seconds: activity.elapsed_time ?? 0,
            trainer: Boolean(activity.trainer),
            commute: Boolean(activity.commute),
            raw: activity,
            synced_at: new Date().toISOString(),
          };
        });

      // Batch upsert: 1 supabase-call i.p.v. 100. Stuk sneller.
      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from("strava_activities")
          .upsert(rows, { onConflict: "id" });
        if (upsertError) throw new Error(upsertError.message);
        upserted += rows.length;
      }
    }

    if (rawBatch.length < PER_PAGE) {
      doneInThisChunk = true;
      break; // laatste pagina
    }

    // Zit de app tegen de limiet, dan stoppen we netjes met een cursor in plaats
    // van door te rammen en de sync van andere leden op te blazen.
    if (shouldPauseForRateLimit(usage).pause) {
      nextPage = page + 1;
      stravaRateLimited = true;
      break;
    }

    // Kleine pauze tussen pages — beleefd zijn voor Strava's rate limit.
    if (i < chunkPages - 1) {
      await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
    }
  }

  if (!doneInThisChunk && nextPage === null) {
    // We hebben deze chunk voltooid maar nog niet het einde gezien → client
    // moet vanaf de volgende pagina verder gaan.
    nextPage = lastPageProcessed + 1;
  }

  const done = nextPage === null;
  let removed = 0;
  const removedActivityIds: number[] = [];

  // Alleen wissen als dit ene syncverzoek het volledige autoritatieve venster
  // vanaf pagina 1 heeft gezien. Bij pagination of een rate-limit slaan we de
  // reconciliatie over; een onvolledige Strava-response mag nooit data wissen.
  if (done && startPage === 1 && !stravaRateLimited) {
    const { data: localRows, error: localError } = await supabase
      .from("strava_activities")
      .select("id")
      .eq("profile_id", profileId)
      .gt("start_date", new Date(after * 1000).toISOString());
    if (localError) throw new Error(localError.message);

    const staleIds = ((localRows ?? []) as Array<{ id: number }>)
      .map((row) => Number(row.id))
      .filter((id) => !remoteCyclingActivityIds.has(id));

    for (let index = 0; index < staleIds.length; index += 100) {
      const batch = staleIds.slice(index, index + 100);
      const { error: deleteError, count } = await supabase
        .from("strava_activities")
        .delete({ count: "exact" })
        .eq("profile_id", profileId)
        .in("id", batch);
      if (deleteError) throw new Error(deleteError.message);
      removed += count ?? batch.length;
      removedActivityIds.push(...batch);
    }
  }

  // updated_at was tot nu toe tegelijk "token ververst" en "cronvolgorde".
  // last_synced_at maakt dat expliciet, zodat de reconcile op syncleeftijd kan
  // sorteren zonder dat een tokenrefresh iemand achteraan de rij zet.
  await supabase
    .from("strava_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      consecutive_failures: 0,
      last_error: null,
      last_error_at: null,
    })
    .eq("profile_id", profileId);

  // Milestone-evaluators: alleen op de laatste chunk, anders draaien we
  // 'm onnodig 10x op een halve dataset. Vóór de evaluators draaien we
  // de col-detector zodat A013-A019/A095 over de meest actuele set
  // climbed-cols beschikken.
  let milestoneAwards = 0;
  let milestoneErrors: string[] = [];
  let colSegmentTimesFetched = 0;
  let colSegmentTimesUpdated = 0;
  let colSegmentTimesRateLimited = false;
  let zwbSegmentsFetched = 0;
  let zwbSegmentEffortsStored = 0;
  let zwbSegmentsCompleted = 0;
  let zwbSegmentsRateLimited = false;
  let zwbSummariesWritten = 0;
  let zwbSummariesSkipped = 0;
  let zwbSummariesRateLimited = false;
  if (done) {
    // De nasync-stappen staan in post-sync.ts, omdat het webhook-pad exact
    // dezelfde stappen moet draaien voor de ritten die daar binnenkomen.
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const { runPostSyncForProfile } = await import("@/lib/strava/post-sync");
      const admin = createAdminClient();

      const skip = Boolean(options.skipPostProcessing);
      const maxColSegmentFetches = options.colSegmentMaxFetches ?? 20;

      const post = await runPostSyncForProfile(admin, profileId, accessToken, {
        gear: true,
        summaries: options.zwbSummaryMaxWrites ?? 1,
        hasActivityWriteScope: hasActivityWriteScope(
          (connection as { scope?: string | null }).scope,
        ),
        workoutCompletion: true,
        watopiaCalibration: !skip,
        colsDetector: !skip,
        zwblokken: !skip,
        colSegmentTimes: skip ? 0 : maxColSegmentFetches,
        // undefined = overslaan; 0 betekent "doorrekenen zonder nieuwe calls".
        zwbSegments: skip
          ? undefined
          : (options.zwbSegmentMaxFetches ?? maxColSegmentFetches),
        milestones: !skip,
        removedActivityIds: skip ? [] : removedActivityIds,
      });

      milestoneAwards = post.milestoneAwards;
      milestoneErrors = post.milestoneErrors;
      colSegmentTimesFetched = post.colSegmentTimesFetched;
      colSegmentTimesUpdated = post.colSegmentTimesUpdated;
      colSegmentTimesRateLimited = post.colSegmentTimesRateLimited;
      zwbSegmentsFetched = post.zwbSegmentsFetched;
      zwbSegmentEffortsStored = post.zwbSegmentEffortsStored;
      zwbSegmentsCompleted = post.zwbSegmentsCompleted;
      zwbSegmentsRateLimited = post.zwbSegmentsRateLimited;
      zwbSummariesWritten = post.zwbSummariesWritten;
      zwbSummariesSkipped = post.zwbSummariesSkipped;
      zwbSummariesRateLimited = post.zwbSummariesRateLimited;
    } catch (err) {
      milestoneErrors = [
        err instanceof Error
          ? err.message
          : "Milestonebadges beoordelen faalde.",
      ];
    }
  }

  return {
    ok: true as const,
    upserted,
    removed,
    milestoneAwards,
    milestoneErrors,
    colSegmentTimesFetched,
    colSegmentTimesUpdated,
    colSegmentTimesRateLimited,
    zwbSegmentsFetched,
    zwbSegmentEffortsStored,
    zwbSegmentsCompleted,
    zwbSegmentsRateLimited,
    zwbSummariesWritten,
    zwbSummariesSkipped,
    zwbSummariesRateLimited,
    pagesScanned,
    totalSeen,
    nonCyclingSkipped,
    isFirstSync,
    nextPage,
    afterTs: after,
    done,
    stravaRateLimited,
  };
}

export function athleteName(token: StravaTokenResponse) {
  const athlete = token.athlete;
  const name = [athlete?.firstname, athlete?.lastname].filter(Boolean).join(" ");
  return name || athlete?.username || null;
}
