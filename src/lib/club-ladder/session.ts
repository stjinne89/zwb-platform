import "server-only";

import { getClub } from "@/lib/club";
import { ladderCookie, LadderLoginError } from "@/lib/ladder";
import { createAdminClient } from "@/lib/supabase/admin";

// Sessie voor de pagina's van ladder.cycleracing.club achter login (aanmeldingen,
// captains, kerkhof, teamhistorie).
//
// De ladder logt alleen in via Google of Discord (het wachtwoordformulier haalt
// een script op /signin weg, gezien 2026-11-24), dus de server kan niet zelf
// inloggen. Een beheerder plakt de `connect.sid` op /beheer/koppelingen; die gaat
// naar `club_ladder_session` (0357), niet naar de env, zodat een nieuwe cookie
// geen deploy vraagt. LADDER_COOKIE werkt nog als terugval.
//
// De sessie loopt 24 uur na het laatste bezoek af, en elk bezoek verlengt hem.
// De healthcheck (elk uur) bezoekt daarom /dashboard met de cookie
// (`checkLadderSession`): zo blijft hij geldig zonder geplande Chrome-taak, en
// merkt de healthcheck het als hij toch verloopt.
//
// Volgorde bij lezen: het geheugen van deze server-instance, de tabel,
// LADDER_COOKIE. Stuurt de ladder door naar /signin, dan leest
// `renewLadderSession` de tabel opnieuw: misschien plakte iemand intussen een
// nieuwe cookie.

export const LADDER_ORIGIN = "https://ladder.cycleracing.club";
const TIMEOUT_MS = 15_000;

export const LADDER_SESSION_MISSING = "Geen ladder-sessie: plak een cookie op Beheer → Koppelingen.";
export const LADDER_SESSION_EXPIRED = "Ladder-sessie verlopen: plak een nieuwe cookie op Beheer → Koppelingen.";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type SessionRow = {
  cookie: string | null;
  renewed_at: string | null;
  login_error: string | null;
  login_error_at: string | null;
};

export type LadderSessionStatus = {
  /** Uit de tabel, uit LADDER_COOKIE, of geen. */
  source: "beheer" | "env" | null;
  /** Wanneer de cookie in beheer geplakt is. */
  savedAt: string | null;
  /** Sinds wanneer de ladder hem weigert; null = niet bekend als verlopen. */
  expiredAt: string | null;
};

let cached: string | null = null;

async function readRow(): Promise<SessionRow | null> {
  try {
    const { data, error } = await createAdminClient()
      .from("club_ladder_session")
      .select("cookie, renewed_at, login_error, login_error_at")
      .eq("id", true)
      .maybeSingle();
    return error ? null : ((data as SessionRow | null) ?? null);
  } catch {
    // Zonder service-rolsleutel of zonder 0357: alleen LADDER_COOKIE.
    return null;
  }
}

async function writeRow(values: Partial<SessionRow>) {
  try {
    await createAdminClient()
      .from("club_ladder_session")
      .upsert({ id: true, ...values, updated_at: new Date().toISOString() });
  } catch {
    // Zie readRow.
  }
}

/** Cookie uit de tabel. Niet `ladderCookie(undefined)`: dat leest LADDER_COOKIE. */
function rowCookie(row: SessionRow | null) {
  return ladderCookie(row?.cookie ?? null);
}

/** Voor tests: vergeet de sessie van deze instance. */
export function resetLadderSessionCache() {
  cached = null;
}

/** User agent voor verzoeken aan de ladder, ook voor `zmap-sync.ts`. */
export async function ladderUserAgent() {
  const club = await getClub();
  const site = club.settings.websiteUrl ? `; +${club.settings.websiteUrl}` : "";
  return `Mozilla/5.0 (compatible; ${club.texts.shortName}-Platform Club Ladder${site})`;
}

/**
 * Bezoekt /dashboard met de cookie: 200 is ingelogd, een doorverwijzing (naar
 * /signin) niet. Het bezoek verlengt de sessie met 24 uur.
 */
export async function ladderCookieWorks(
  cookie: string,
  options: { userAgent?: string; fetchImpl?: FetchLike } = {},
): Promise<boolean> {
  const request = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const res = await request(`${LADDER_ORIGIN}/dashboard`, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": options.userAgent ?? (await ladderUserAgent()),
      Referer: `${LADDER_ORIGIN}/`,
      Cookie: cookie,
    },
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  await res.body?.cancel().catch(() => undefined);
  if (res.status >= 300 && res.status < 400) return false;
  if (!res.ok) throw new Error(`Ladder gaf HTTP ${res.status}.`);
  return true;
}

/** De sessie die er nu is: geheugen, tabel, LADDER_COOKIE. */
export async function storedLadderCookie(): Promise<string | null> {
  if (cached) return cached;
  const row = await readRow();
  cached = rowCookie(row) ?? ladderCookie();
  return cached;
}

/** Legt vast dat de ladder deze cookie weigert, zodat beheer het laat zien. */
async function markExpired(cookie: string) {
  const row = await readRow();
  if (rowCookie(row) !== cookie || row?.login_error_at) return;
  await writeRow({ login_error: "verlopen", login_error_at: new Date().toISOString() });
}

/**
 * Een andere sessie nadat `stale` naar /signin doorstuurde (of null als er geen
 * was): een cookie die intussen in beheer is geplakt, of LADDER_COOKIE. Gooit een
 * LadderLoginError als er geen andere is.
 */
export async function renewLadderSession(stale: string | null): Promise<string> {
  cached = null;
  const row = await readRow();
  const fresh = [rowCookie(row), ladderCookie()].find((cookie) => cookie && cookie !== stale);
  if (fresh) {
    cached = fresh;
    return fresh;
  }
  if (stale) {
    await markExpired(stale);
    throw new LadderLoginError(LADDER_SESSION_EXPIRED);
  }
  throw new LadderLoginError(LADDER_SESSION_MISSING);
}

/**
 * Voert `run` uit met de ladder-sessie. Stuurt de ladder door naar /signin
 * (LadderLoginError), dan één keer met een andere sessie als die er is.
 */
export async function withLadderSession<T>(run: (cookie: string) => Promise<T>): Promise<T> {
  const cookie = (await storedLadderCookie()) ?? (await renewLadderSession(null));
  try {
    return await run(cookie);
  } catch (err) {
    if (!(err instanceof LadderLoginError)) throw err;
    const fresh = await renewLadderSession(cookie);
    return run(fresh);
  }
}

// ------------------------------------------------------------ beheer

export async function ladderSessionStatus(): Promise<LadderSessionStatus> {
  const row = await readRow();
  if (rowCookie(row)) {
    return { source: "beheer", savedAt: row?.renewed_at ?? null, expiredAt: row?.login_error_at ?? null };
  }
  return { source: ladderCookie() ? "env" : null, savedAt: null, expiredAt: null };
}

/**
 * Bewaart een geplakte cookie, als de ladder er echt mee inlogt. Geeft een
 * foutmelding terug als dat niet zo is.
 */
export async function saveLadderCookie(
  raw: string,
  options: { fetchImpl?: FetchLike } = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cookie = ladderCookie(raw.slice(0, 4000));
  if (!cookie || !/^connect\.sid=\S+$/.test(cookie)) return { ok: false, error: "Geen connect.sid-cookie." };
  let works: boolean;
  try {
    works = await ladderCookieWorks(cookie, options);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Ladder niet bereikbaar." };
  }
  if (!works) return { ok: false, error: "De ladder kent deze cookie niet als ingelogd." };

  const { error } = await createAdminClient()
    .from("club_ladder_session")
    .upsert({
      id: true,
      cookie,
      renewed_at: new Date().toISOString(),
      login_error: null,
      login_error_at: null,
      updated_at: new Date().toISOString(),
    });
  if (error) return { ok: false, error: error.message };
  cached = cookie;
  return { ok: true };
}

// ------------------------------------------------------------ healthcheck

/**
 * Voor de healthcheck: bezoekt de ladder met de sessie (verlengt hem) en zegt of
 * hij nog geldig is. `configured` false: er is geen sessie.
 */
export async function checkLadderSession(
  options: { fetchImpl?: FetchLike } = {},
): Promise<{ configured: boolean; ok: boolean; detail: string }> {
  cached = null;
  const cookie = await storedLadderCookie();
  if (!cookie) return { configured: false, ok: true, detail: "geen sessie" };
  if (await ladderCookieWorks(cookie, options)) {
    const row = await readRow();
    if (row?.login_error_at && rowCookie(row) === cookie) {
      await writeRow({ login_error: null, login_error_at: null });
    }
    return { configured: true, ok: true, detail: "sessie geldig" };
  }
  await markExpired(cookie);
  return { configured: true, ok: false, detail: "sessie verlopen" };
}
