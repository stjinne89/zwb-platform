// Fetch + parse de Club Ladder graveyard-pagina (achter login).
// Vereist LADDER_COOKIE env var met de ingelogde session cookie
// (bv. "connect.sid=s%3A...").

const GRAVEYARD_URL = "https://ladder.cycleracing.club/graveyard";

/**
 * LADDER_COOKIE als Cookie-header. Ook goed als alleen de waarde is geplakt
 * (zonder `connect.sid=`), tussen aanhalingstekens of met `Cookie:` ervoor
 * (2026-11-06: alleen de waarde gaf "sessie verlopen").
 */
export function ladderCookie(raw: string | null | undefined = process.env.LADDER_COOKIE): string | null {
  const value = (raw ?? "")
    .trim()
    .replace(/^cookie:\s*/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
  if (!value) return null;
  return /^[\w.-]+=/.test(value) ? value : `connect.sid=${value}`;
}

export type LadderGraveyardResult = {
  teamNames: string[];
  rawHtmlSnippet: string; // eerste 500 tekens voor debug
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

export async function fetchLadderGraveyard(
  cookie: string,
): Promise<LadderGraveyardResult> {
  const res = await fetch(GRAVEYARD_URL, {
    headers: {
      Cookie: cookie,
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (compatible; ZWB-Platform Ladder sync; +https://zwbcycling.nl)",
      Referer: "https://ladder.cycleracing.club/",
    },
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  // Redirect naar /signin = cookie is verlopen of ongeldig.
  if (res.status === 302 || res.status === 301) {
    throw new Error(
      "Ladder session-cookie verlopen of ongeldig. Log opnieuw in op ladder.cycleracing.club en kopieer de connect.sid cookie naar LADDER_COOKIE.",
    );
  }
  if (!res.ok) {
    throw new Error(`Ladder HTTP ${res.status}`);
  }

  const html = await res.text();

  // Heuristieken om team-namen te extracten. We weten nog niet de exacte
  // HTML-structuur; we proberen meerdere patronen.
  const teamNames = new Set<string>();

  // Patroon 1: <td class="teamname">NAME</td> of vergelijkbaar.
  for (const m of html.matchAll(/<td[^>]*class="[^"]*team[^"]*"[^>]*>([^<]+)<\/td>/gi)) {
    const name = decodeEntities(m[1]).trim();
    if (name) teamNames.add(name);
  }

  // Patroon 2: <span class="teamname">NAME</span>
  for (const m of html.matchAll(/<span[^>]*class="[^"]*teamname[^"]*"[^>]*>([^<]+)<\/span>/gi)) {
    const name = decodeEntities(m[1]).trim();
    if (name) teamNames.add(name);
  }

  // Patroon 3: <a href="/team/...">NAME</a>
  for (const m of html.matchAll(/<a[^>]*href="\/team[^"]+"[^>]*>([^<]+)<\/a>/gi)) {
    const name = decodeEntities(m[1]).trim();
    if (name) teamNames.add(name);
  }

  // Patroon 4: data-teamname attribuut
  for (const m of html.matchAll(/data-team(?:name)?="([^"]+)"/gi)) {
    const name = decodeEntities(m[1]).trim();
    if (name) teamNames.add(name);
  }

  return {
    teamNames: Array.from(teamNames),
    rawHtmlSnippet: html.slice(0, 500),
  };
}

// Fuzzy-vergelijk twee team-namen (negeer hoofdletters, spaties, brackets).
export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}
