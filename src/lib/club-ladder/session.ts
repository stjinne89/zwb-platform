import "server-only";

import { getClub } from "@/lib/club";
import { ladderCookie, LadderLoginError } from "@/lib/ladder";
import { createAdminClient } from "@/lib/supabase/admin";

// Sessie voor de pagina's van ladder.cycleracing.club achter login (aanmeldingen,
// captains, kerkhof, teamhistorie). Sinds 2026-11-24 logt ZWB zelf in met
// LADDER_EMAIL en LADDER_PASSWORD, zoals bij Zwift met ZWIFT_USERNAME en
// ZWIFT_PASSWORD. Daarvoor plakte de eigenaar de `connect.sid` uit Chrome in
// LADDER_COOKIE, en hield een geplande Chrome-taak die sessie warm.
//
// Volgorde: de cookie in het geheugen van deze server-instance, dan de bewaarde
// cookie in `club_ladder_session` (0357), dan LADDER_COOKIE. Stuurt de ladder door
// naar /signin, dan logt `renewLadderSession` opnieuw in en bewaart de nieuwe
// cookie in de tabel, niet in de env: een env-waarde vraagt een deploy. Elk
// bezoek verlengt de sessie met 24 uur, dus inloggen is alleen nodig na een dag
// zonder sync.
//
// Een mislukte login wordt 15 minuten niet herhaald (ook niet door andere
// instances, via `login_error_at`): een verkeerd wachtwoord bij elke sync opnieuw
// proberen kan het account blokkeren.
//
// Werkt zonder 0357 ook, dan alleen met de cookie in het geheugen.

const LADDER_ORIGIN = "https://ladder.cycleracing.club";
const TIMEOUT_MS = 15_000;
const RETRY_AFTER_FAILURE_MS = 15 * 60_000;

export const LADDER_SESSION_MISSING = "Geen ladder-sessie: zet LADDER_EMAIL en LADDER_PASSWORD.";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function ladderLoginConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.LADDER_EMAIL?.trim() && env.LADDER_PASSWORD);
}

/** Inloggegevens of een geplakte cookie: er is iets om de ladder mee te openen. */
export function ladderSessionConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return ladderLoginConfigured(env) || Boolean(ladderCookie(env.LADDER_COOKIE));
}

/** De `connect.sid` uit de Set-Cookie-headers van een antwoord. */
export function sessionCookieFrom(res: Response): string | null {
  const lines =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : (res.headers.get("set-cookie") ?? "").split(/,(?=\s*[\w.-]+=)/);
  for (const line of lines) {
    const match = line.match(/^\s*connect\.sid=([^;]+)/);
    if (match) return `connect.sid=${match[1]}`;
  }
  return null;
}

async function discard(res: Response) {
  await res.body?.cancel().catch(() => undefined);
}

/**
 * Logt in via het formulier op /signin en geeft de sessiecookie terug. Controleert
 * daarna met /dashboard, dat zonder login doorstuurt naar /signin: zo maakt het
 * niet uit hoe de ladder op een fout wachtwoord antwoordt.
 */
export async function loginLadder(
  credentials: { email: string; password: string },
  options: { userAgent: string; fetchImpl?: FetchLike },
): Promise<string> {
  const request = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const base: RequestInit = { redirect: "manual", cache: "no-store" };
  const headers = { Accept: "text/html,application/xhtml+xml", "User-Agent": options.userAgent };

  // De inlogpagina geeft al een sessie mee; het formulier hoort daarbij.
  const page = await request(`${LADDER_ORIGIN}/signin`, {
    ...base,
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  let cookie = sessionCookieFrom(page);
  await discard(page);
  if (page.status >= 500) throw new LadderLoginError(`Inloggen op de ladder mislukt (HTTP ${page.status}).`);

  const res = await request(`${LADDER_ORIGIN}/signin`, {
    ...base,
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: LADDER_ORIGIN,
      Referer: `${LADDER_ORIGIN}/signin`,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: new URLSearchParams({
      email: credentials.email,
      password: credentials.password,
      returnTo: "",
      service: "clubladder",
    }).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  cookie = sessionCookieFrom(res) ?? cookie;
  await discard(res);
  if (res.status >= 500 || res.status === 429) {
    throw new LadderLoginError(`Inloggen op de ladder mislukt (HTTP ${res.status}).`);
  }
  if (!cookie) throw new LadderLoginError("Inloggen op de ladder gaf geen sessie terug.");

  const check = await request(`${LADDER_ORIGIN}/dashboard`, {
    ...base,
    headers: { ...headers, Cookie: cookie, Referer: `${LADDER_ORIGIN}/` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  await discard(check);
  if (check.status >= 300 && check.status < 400) {
    throw new LadderLoginError("Inloggen op de ladder mislukt: e-mail of wachtwoord klopt niet.");
  }
  if (!check.ok) throw new LadderLoginError(`Ladder na inloggen: HTTP ${check.status}.`);
  return cookie;
}

// ------------------------------------------------------------ opslag

type SessionRow = { cookie: string | null; login_error: string | null; login_error_at: string | null };

let cached: string | null = null;
let lastFailure: { at: number; message: string } | null = null;
let loginRequest: Promise<string> | null = null;

async function readRow(): Promise<SessionRow | null> {
  try {
    const { data, error } = await createAdminClient()
      .from("club_ladder_session")
      .select("cookie, login_error, login_error_at")
      .eq("id", true)
      .maybeSingle();
    return error ? null : ((data as SessionRow | null) ?? null);
  } catch {
    // Zonder service-rolsleutel of zonder 0357: alleen het geheugen.
    return null;
  }
}

async function writeRow(values: Partial<SessionRow> & { renewed_at?: string }) {
  try {
    await createAdminClient()
      .from("club_ladder_session")
      .upsert({ id: true, ...values, updated_at: new Date().toISOString() });
  } catch {
    // Zie readRow.
  }
}

/** Voor tests: vergeet de sessie van deze instance. */
export function resetLadderSessionCache() {
  cached = null;
  lastFailure = null;
  loginRequest = null;
}

/** De sessie die er nu is, zonder in te loggen: geheugen, tabel, LADDER_COOKIE. */
export async function storedLadderCookie(): Promise<string | null> {
  if (cached) return cached;
  const row = await readRow();
  if (row?.login_error && row.login_error_at) {
    lastFailure ??= { at: Date.parse(row.login_error_at), message: row.login_error };
  }
  cached = ladderCookie(row?.cookie) ?? ladderCookie();
  return cached;
}

async function login(): Promise<string> {
  const club = await getClub();
  const site = club.settings.websiteUrl ? `; +${club.settings.websiteUrl}` : "";
  try {
    const cookie = await loginLadder(
      { email: process.env.LADDER_EMAIL?.trim() ?? "", password: process.env.LADDER_PASSWORD ?? "" },
      { userAgent: `Mozilla/5.0 (compatible; ${club.texts.shortName}-Platform Club Ladder${site})` },
    );
    cached = cookie;
    lastFailure = null;
    await writeRow({ cookie, renewed_at: new Date().toISOString(), login_error: null, login_error_at: null });
    return cookie;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Inloggen op de ladder mislukt.";
    lastFailure = { at: Date.now(), message };
    await writeRow({ login_error: message, login_error_at: new Date().toISOString() });
    throw err instanceof LadderLoginError ? err : new LadderLoginError(message);
  }
}

/**
 * Een nieuwe sessie nadat `stale` naar /signin doorstuurde (of null als er geen
 * was). Neemt eerst een cookie die een andere instance al ververste; logt anders
 * zelf in. Gooit een LadderLoginError als er geen sessie te krijgen is.
 */
export async function renewLadderSession(stale: string | null): Promise<string> {
  if (cached && cached !== stale) return cached;
  cached = null;

  const row = await readRow();
  const stored = ladderCookie(row?.cookie);
  if (stored && stored !== stale) {
    cached = stored;
    return stored;
  }
  if (row?.login_error && row.login_error_at) {
    const at = Date.parse(row.login_error_at);
    if (!lastFailure || at > lastFailure.at) lastFailure = { at, message: row.login_error };
  }

  if (ladderLoginConfigured()) {
    if (lastFailure && Date.now() - lastFailure.at < RETRY_AFTER_FAILURE_MS) {
      throw new LadderLoginError(lastFailure.message);
    }
    // Gelijktijdige verzoeken delen één login.
    loginRequest ??= login().finally(() => {
      loginRequest = null;
    });
    return loginRequest;
  }

  // Zonder inloggegevens: alleen een andere geplakte cookie helpt nog.
  const env = ladderCookie();
  if (env && env !== stale) {
    cached = env;
    return env;
  }
  throw new LadderLoginError(stale ? "Ladder-sessie verlopen: zet LADDER_EMAIL en LADDER_PASSWORD." : LADDER_SESSION_MISSING);
}

/**
 * Voert `run` uit met de ladder-sessie. Stuurt de ladder door naar /signin
 * (LadderLoginError), dan één keer opnieuw inloggen en nog eens proberen.
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
