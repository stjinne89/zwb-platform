// Garmin LiveTrack en Wahoo Live Track uitlezen.
//
// Geen officiële API: dit zijn de endpoints die de eigen webpagina's van
// Garmin en Wahoo gebruiken. Garmin vraagt sinds 2026 een CSRF-token; dat staat
// in <meta name="csrf-token"> van de sessiepagina en hoort bij de cookie
// livetrack_csrf. Met die twee lukt een gewone fetch, zonder browser
// (vastgesteld op 2026-09-28, zie docs/garmin-wahoo-live-tracking-onderzoek.md).
// Wahoo's live-pagina bevat de status als data-attributen en het spoor als
// FIT-data (zie fit-records.ts).

const USER_AGENT = "ZWB-platform live (+https://zwb-platform.netlify.app)";
const FETCH_TIMEOUT_MS = 6000;
const GARMIN_ORIGIN = "https://livetrack.garmin.com";

export type ExternalProvider = "garmin" | "wahoo";

export type ExternalLink = {
  provider: ExternalProvider;
  url: string;
};

export type GarminLink = {
  sessionId: string;
  token: string;
};

export type LivePoint = {
  lat: number;
  lng: number;
  altitude: number | null;
  speedKmh: number | null;
  recordedAt: string;
};

const GARMIN_LINK_RE =
  /https:\/\/livetrack\.garmin\.com\/session\/([0-9a-fA-F-]{8,64})\/token\/([0-9A-Za-z]{4,128})/;
const WAHOO_LINK_RE =
  /https:\/\/(?:[a-z0-9-]+\.)*(?:wahooligan|wahoofitness)\.com\/[^\s"'<>]*live[^\s"'<>]*/i;

/** Garmin-sessie en -token uit een LiveTrack-link. */
export function parseGarminLink(url: string): GarminLink | null {
  const match = url.match(GARMIN_LINK_RE);
  return match ? { sessionId: match[1], token: match[2] } : null;
}

/** Herken een Garmin- of Wahoo-livelink in een URL die een lid plakt. */
export function externalProviderForUrl(url: string): ExternalProvider | null {
  if (GARMIN_LINK_RE.test(url)) return "garmin";
  if (WAHOO_LINK_RE.test(url)) return "wahoo";
  return null;
}

/**
 * De LiveTrack-link uit de tekst of HTML van een mail. Een mail bevat ook
 * links naar support of afmelden; alleen een Garmin-sessielink of een
 * Wahoo-link met "live" in het pad telt.
 */
export function extractExternalLink(content: string): ExternalLink | null {
  const text = content.replace(/&amp;/g, "&");
  const garmin = text.match(GARMIN_LINK_RE);
  if (garmin) return { provider: "garmin", url: garmin[0] };
  const wahoo = text.match(WAHOO_LINK_RE);
  if (wahoo) return { provider: "wahoo", url: wahoo[0].replace(/[.,;)]+$/, "") };
  return null;
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isoTime(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    // Garmin gebruikt milliseconden; seconden komen niet voor, maar vang ze op.
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string" && value) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  return null;
}

/**
 * Eén Garmin-trackpoint naar een live_positions-punt. Het formaat verschilt
 * per generatie van de pagina, dus alle bekende veldnamen worden geprobeerd.
 */
export function normalizeGarminPoint(raw: unknown): LivePoint | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const position = (p.position ?? {}) as Record<string, unknown>;
  const meta = (p.metaData ?? p.metadata ?? {}) as Record<string, unknown>;

  const lat = finiteNumber(p.latitude ?? p.lat ?? position.lat);
  const lng = finiteNumber(p.longitude ?? p.lon ?? p.lng ?? position.lon ?? position.lng);
  const recordedAt = isoTime(p.dateTime ?? p.timestamp ?? p.time);
  if (lat === null || lng === null || !recordedAt) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (lat === 0 && lng === 0) return null;

  const speedMs = finiteNumber(p.speedMetersPerSec ?? p.speed ?? meta.SPEED);
  const altitude = finiteNumber(p.altitude ?? meta.ELEVATION);
  return {
    lat,
    lng,
    altitude: altitude === null ? null : Math.round(altitude * 100) / 100,
    speedKmh:
      speedMs === null ? null : Math.min(9999, Math.round(speedMs * 36) / 10),
    recordedAt,
  };
}

/** Trackpoints nieuwer dan `after`, oplopend op tijd. */
export function garminPointsAfter(data: unknown, after: string | null): LivePoint[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { trackPoints?: unknown })?.trackPoints)
      ? (data as { trackPoints: unknown[] }).trackPoints
      : [];
  const afterMs = after ? Date.parse(after) : -Infinity;
  return list
    .map(normalizeGarminPoint)
    .filter((p): p is LivePoint => p !== null && Date.parse(p.recordedAt) > afterMs)
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
}

export type GarminSessionState = {
  live: boolean;
  start: string | null;
};

/** Een Garmin-sessie loopt zolang hij zichtbaar is en het einde niet voorbij. */
export function garminSessionState(data: unknown, now = Date.now()): GarminSessionState {
  const s = (data ?? {}) as Record<string, unknown>;
  const start = isoTime(s.start);
  const end = isoTime(s.end);
  const viewable = s.viewable !== false;
  const live = viewable && (!end || Date.parse(end) > now);
  return { live, start };
}

/** Een vaste Wahoo-link ("Share Forever"), zoals een lid hem plakt. */
export const WAHOO_PERMALINK_RE =
  /^https:\/\/(?:www\.)?wahooligan\.com\/users\/live\/[A-Za-z0-9_-]{10,64}$/;

export type WahooPage = {
  found: boolean;
  workoutState: string | null;
  secondsSinceUpdate: number | null;
};

/**
 * Status uit de data-attributen van Wahoo's live-pagina (.livetrack):
 * `data-workout-state` ("completed" na de rit) en `data-seconds-since-update`.
 * Een verlopen of ingetrokken link toont "User Not Found".
 */
export function parseWahooPage(html: string): WahooPage {
  if (/User Not Found/i.test(html)) {
    return { found: false, workoutState: null, secondsSinceUpdate: null };
  }
  const seconds = html.match(/data-seconds-since-update\s*=\s*["']?([\d.]+)/i)?.[1];
  const state = html.match(/data-workout-state\s*=\s*["']([^"']*)["']/i)?.[1];
  return {
    found: true,
    workoutState: state ? state.toLowerCase() : null,
    secondsSinceUpdate: seconds !== undefined ? Number(seconds) : null,
  };
}

/** Rijdt de renner nu: rit niet afgerond en recent data gestuurd. */
export function wahooIsRiding(page: WahooPage, maxIdleSeconds = 15 * 60): boolean {
  return (
    page.found &&
    page.workoutState !== "completed" &&
    page.secondsSinceUpdate !== null &&
    page.secondsSinceUpdate < maxIdleSeconds
  );
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": USER_AGENT, ...(init.headers ?? {}) },
  });
}

export type GarminAuth = { csrfToken: string; cookie: string };

/** CSRF-token en cookie uit de sessiepagina; bruikbaar voor elke sessie. */
export async function garminAuth(link: GarminLink): Promise<GarminAuth> {
  const res = await fetchWithTimeout(
    `${GARMIN_ORIGIN}/session/${link.sessionId}/token/${link.token}`,
    { headers: { Accept: "text/html" } },
  );
  if (!res.ok) throw new Error(`Garmin-pagina gaf HTTP ${res.status}.`);
  const html = await res.text();
  const csrfToken = html.match(/<meta[^>]+name="csrf-token"[^>]+content="([^"]+)"/)?.[1];
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter((c) => c.startsWith("livetrack_csrf="))
    .join("; ");
  if (!csrfToken || !cookie) throw new Error("Garmin-pagina gaf geen CSRF-token.");
  return { csrfToken, cookie };
}

async function garminJson(auth: GarminAuth, path: string, params: Record<string, string>) {
  const url = new URL(path, GARMIN_ORIGIN);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetchWithTimeout(url.toString(), {
    headers: {
      Accept: "application/json",
      Cookie: auth.cookie,
      "livetrack-csrf-token": auth.csrfToken,
    },
  });
  if (res.status === 404) return { status: 404 as const, data: null };
  if (!res.ok) throw new Error(`Garmin-API gaf HTTP ${res.status}.`);
  return { status: 200 as const, data: (await res.json()) as unknown };
}

export type GarminFetchResult =
  | { state: "live" | "ended"; points: LivePoint[] }
  | { state: "gone" };

/** Sessiestatus en nieuwe punten van één Garmin-rit. */
export async function fetchGarminSession(
  auth: GarminAuth,
  link: GarminLink,
  after: string | null,
): Promise<GarminFetchResult> {
  const session = await garminJson(auth, `/api/sessions/${link.sessionId}`, {
    token: link.token,
  });
  if (session.status === 404) return { state: "gone" };
  const { live, start } = garminSessionState(session.data);
  const begin = after ?? start;
  const track = await garminJson(
    auth,
    `/api/sessions/${link.sessionId}/track-points/common`,
    begin ? { token: link.token, begin } : { token: link.token },
  );
  return {
    state: live ? "live" : "ended",
    points: track.status === 404 ? [] : garminPointsAfter(track.data, after),
  };
}

/** De HTML van een Wahoo-live-pagina; null als de link niet (meer) bestaat. */
export async function fetchWahooPage(url: string): Promise<string | null> {
  const res = await fetchWithTimeout(url, { headers: { Accept: "text/html" } });
  if (res.status === 404 || res.status === 410) return null;
  if (!res.ok) throw new Error(`Wahoo-pagina gaf HTTP ${res.status}.`);
  return res.text();
}

/**
 * Health-check: werkt de route zonder browser nog? Een niet-bestaande sessie
 * hoort 404 te geven; 403 betekent dat Garmin de CSRF-aanpak weigert.
 */
export async function probeGarminLiveTrack(): Promise<number> {
  const link = { sessionId: "00000000-0000-0000-0000-000000000000", token: "ZWBHEALTH" };
  const auth = await garminAuth(link);
  const res = await fetchWithTimeout(
    `${GARMIN_ORIGIN}/api/sessions/${link.sessionId}?token=${link.token}`,
    {
      headers: {
        Accept: "application/json",
        Cookie: auth.cookie,
        "livetrack-csrf-token": auth.csrfToken,
      },
    },
  );
  return res.status;
}
