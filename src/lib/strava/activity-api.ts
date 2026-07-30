// Losse Strava-calls per activiteit. Staat naast client.ts, net als de
// segment-/col-detailcalls: client.ts gaat over tokens en de activiteitensync.
//
// Dit is het enige plek in de app die naar Strava schrijft. Een PUT vervangt de
// beschrijving volledig, dus de aanroeper moet altijd eerst de huidige tekst
// ophalen — vandaar dat beide functies hier bij elkaar staan.

const STRAVA_API = "https://www.strava.com/api/v3";
// Strakker dan de 8s in client.ts: dit draait binnen het Netlify-budget van de
// sync, die er zelf al dicht tegenaan zit.
const TIMEOUT_MS = 6000;

export type StravaActivityDetail = {
  id: number;
  name?: string | null;
  description?: string | null;
  sport_type?: string | null;
  start_date?: string | null;
  moving_time?: number | null;
};

export type StravaApiFailure = {
  ok: false;
  status: number;
  rateLimited: boolean;
  /** 401/403: token of scope is stuk. Deze run niet opnieuw proberen. */
  authFailed: boolean;
  error: string;
  usage: StravaRateLimitUsage | null;
};

/** x-ratelimit-usage / -limit komen als "15min,daily"-paren terug. */
export type StravaRateLimitUsage = {
  shortTermUsed: number | null;
  shortTermLimit: number | null;
  dailyUsed: number | null;
  dailyLimit: number | null;
};

function parsePair(value: string | null): [number | null, number | null] {
  if (!value) return [null, null];
  const parts = value.split(",").map((part) => {
    const n = Number(part.trim());
    return Number.isFinite(n) ? n : null;
  });
  return [parts[0] ?? null, parts[1] ?? null];
}

export function readRateLimitUsage(headers: Headers): StravaRateLimitUsage | null {
  const [shortTermUsed, dailyUsed] = parsePair(headers.get("x-ratelimit-usage"));
  const [shortTermLimit, dailyLimit] = parsePair(headers.get("x-ratelimit-limit"));
  if (shortTermUsed == null && dailyUsed == null) return null;
  return { shortTermUsed, shortTermLimit, dailyUsed, dailyLimit };
}

/**
 * Zit de app dicht tegen de 15-minutenlimiet? Dan stoppen we liever dan dat we
 * de sync (badges, cols, segmenten) van andere leden opblazen. Rate limits zijn
 * bij Strava per applicatie, niet per gebruiker.
 */
export function nearRateLimit(usage: StravaRateLimitUsage | null, ratio = 0.7) {
  if (!usage?.shortTermUsed || !usage.shortTermLimit) return false;
  return usage.shortTermUsed >= usage.shortTermLimit * ratio;
}

function failure(
  status: number,
  error: string,
  headers?: Headers,
): StravaApiFailure {
  return {
    ok: false,
    status,
    rateLimited: status === 429,
    authFailed: status === 401 || status === 403,
    error,
    usage: headers ? readRateLimitUsage(headers) : null,
  };
}

/**
 * Detailobject van één activiteit. De activiteitenlijst uit client.ts geeft een
 * SummaryActivity terug, en die bevat géén description — daarom deze call.
 * Bewust zonder include_all_efforts: dat blaast de payload op.
 */
export async function fetchStravaActivityDetail(
  accessToken: string,
  activityId: number,
): Promise<
  { ok: true; detail: StravaActivityDetail; usage: StravaRateLimitUsage | null }
  | StravaApiFailure
> {
  try {
    const res = await fetch(`${STRAVA_API}/activities/${activityId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return failure(
        res.status,
        `Strava activiteit ophalen faalde (${res.status}): ${text.slice(0, 160)}`,
        res.headers,
      );
    }
    const detail = (await res.json()) as StravaActivityDetail;
    return { ok: true, detail, usage: readRateLimitUsage(res.headers) };
  } catch (err) {
    return failure(
      0,
      err instanceof Error ? err.message : "Strava activiteit ophalen faalde.",
    );
  }
}

/**
 * Zet de beschrijving. We sturen uitsluitend `description` mee, zodat naam,
 * gear, commute/trainer-vlaggen en sport_type onaangeroerd blijven — Strava
 * accepteert een gedeeltelijke body.
 */
export async function updateStravaActivityDescription(
  accessToken: string,
  activityId: number,
  description: string,
): Promise<{ ok: true; usage: StravaRateLimitUsage | null } | StravaApiFailure> {
  try {
    const res = await fetch(`${STRAVA_API}/activities/${activityId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ description }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return failure(
        res.status,
        `Strava beschrijving bijwerken faalde (${res.status}): ${text.slice(0, 160)}`,
        res.headers,
      );
    }
    return { ok: true, usage: readRateLimitUsage(res.headers) };
  } catch (err) {
    return failure(
      0,
      err instanceof Error ? err.message : "Strava beschrijving bijwerken faalde.",
    );
  }
}
