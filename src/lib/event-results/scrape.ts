import * as cheerio from "cheerio";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalize, nameTokens } from "@/lib/text/normalize";

export type MatchedVia =
  | "member_name"
  | "strava_name"
  | "roster"
  | "zwb_mention";

export type ScrapedResult = {
  scrapedName: string;
  position: number | null;
  timeText: string | null;
  timeSeconds: number | null;
  matchedVia: MatchedVia;
  profileId: string | null;
};

export type ScrapeOutcome = {
  ok: boolean;
  results: ScrapedResult[];
  error?: string;
  provider?: string;
};

type MemberCandidate = {
  profileId: string | null;
  tokens: string[]; // volledige naam-tokens (≥2 tekens)
  initials: string[]; // losse initialen (1 teken), bv. de "C" in "Casper C"
  norm: string; // volledige genormaliseerde naam
  via: MatchedVia;
};

// Eén uitslag-rij in genormaliseerde vorm. Generieke HTML-scraping vult alleen
// `cells` + `matchText`; de ChronoRace-adapter kent kolommen exact en vult ook
// `knownName/Position/Time`.
type RawRow = {
  cells: string[];
  matchText: string;
  knownName?: string | null;
  knownPosition?: number | null;
  knownTimeText?: string | null;
  knownTimeSeconds?: number | null;
};

const FETCH_TIMEOUT_MS = 20000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Tijd-patronen: "3:42:18", "3.42.18", "42:18", "1:02:03.4"
const TIME_HMS = /\b(\d{1,2})[:.](\d{2})[:.](\d{2})(?:[.,]\d{1,3})?\b/;
const TIME_MS = /\b(\d{1,3})[:.](\d{2})(?:[.,]\d{1,3})?\b/;

// Woordgrens-"zwb" (niet als deel van een ander woord).
const ZWB_MENTION = /(^|[^a-z0-9])zwb([^a-z0-9]|$)/i;

function timeToSeconds(text: string): number | null {
  const hms = text.match(TIME_HMS);
  if (hms) {
    const h = Number(hms[1]);
    const m = Number(hms[2]);
    const s = Number(hms[3]);
    if (m < 60 && s < 60) return h * 3600 + m * 60 + s;
  }
  const ms = text.match(TIME_MS);
  if (ms) {
    const m = Number(ms[1]);
    const s = Number(ms[2]);
    if (s < 60) return m * 60 + s;
  }
  return null;
}

function extractTime(rowText: string): {
  timeText: string | null;
  timeSeconds: number | null;
} {
  const hms = rowText.match(TIME_HMS);
  if (hms) {
    return { timeText: hms[0], timeSeconds: timeToSeconds(hms[0]) };
  }
  const ms = rowText.match(TIME_MS);
  if (ms) {
    return { timeText: ms[0], timeSeconds: timeToSeconds(ms[0]) };
  }
  return { timeText: null, timeSeconds: null };
}

// Eerste los geheel getal (1–9999), typisch de klassering vooraan de rij.
function extractPosition(cells: string[]): number | null {
  for (const cell of cells) {
    const m = cell.trim().match(/^(\d{1,4})\b/);
    if (m) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 9999) return n;
    }
  }
  return null;
}

function secondsToClock(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

// Bouwt een kandidaat uit een naam. Splitst in volledige tokens (≥2 tekens) en
// losse initialen (1 teken). Geweigerd (null) als er geen voornaam + minstens
// één extra naamdeel is — een losse "Stijn" matcht anders een hele uitslag.
function toCandidate(
  name: string,
  profileId: string | null,
  via: MatchedVia,
): MemberCandidate | null {
  const parts = normalize(name)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const tokens = parts.filter((p) => p.length >= 2);
  const initials = parts.filter((p) => p.length === 1);
  // Minstens één volledige naam, en in totaal ≥2 naamdelen (voor- + achternaam
  // óf voornaam + initiaal zoals "Casper C").
  if (tokens.length < 1) return null;
  if (tokens.length + initials.length < 2) return null;
  return { profileId, tokens, initials, norm: normalize(name), via };
}

async function buildMemberCandidates(
  supabase: SupabaseClient,
): Promise<MemberCandidate[]> {
  const candidates: MemberCandidate[] = [];
  const push = (name: string, id: string | null, via: MatchedVia) => {
    const cand = toCandidate((name ?? "").trim(), id, via);
    if (cand) candidates.push(cand);
  };

  // 1. Goedgekeurde leden met hun display_name.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("is_approved", true);
  for (const p of profiles ?? []) push(p.display_name ?? "", p.id, "member_name");

  // 2. Strava athlete_name (echte voor+achternaam — beste bron voor gran fondos).
  const { data: stravaConns } = await supabase
    .from("strava_connections")
    .select("profile_id, athlete_name");
  for (const c of stravaConns ?? [])
    push(c.athlete_name ?? "", c.profile_id, "strava_name");

  // 3. Roster-namen (gekoppeld lid waar bekend).
  const { data: roster } = await supabase
    .from("roster_entries")
    .select("name, claimed_by");
  for (const r of roster ?? []) push(r.name ?? "", r.claimed_by ?? null, "roster");

  return candidates;
}

// Strikt: ALLE volledige naam-tokens van een lid moeten in de rij voorkomen.
// Bij een initiaal (bv. "Casper C") moet de rij óók een ander woord bevatten
// dat met die letter begint (de achternaam) — zo matcht "Casper C" wél
// "CARBAAT Casper", maar niet elke willekeurige Casper.
function matchCandidate(
  rowTokens: string[],
  rowTokenSet: Set<string>,
  cand: MemberCandidate,
): boolean {
  if (!cand.tokens.every((t) => rowTokenSet.has(t))) return false;
  if (cand.initials.length === 0) return true;
  return cand.initials.every((init) =>
    rowTokens.some((t) => t[0] === init && !cand.tokens.includes(t)),
  );
}

function rankVia(via: MatchedVia): number {
  switch (via) {
    case "strava_name":
      return 3;
    case "member_name":
      return 2;
    case "roster":
      return 1;
    default:
      return 0;
  }
}

// Kies de cel die de meeste van de naam-tokens bevat (anders null).
function pickNameCell(cells: string[], tokens: string[]): string | null {
  let bestCell: string | null = null;
  let bestScore = 0;
  for (const cell of cells) {
    const set = new Set(nameTokens(cell));
    const score = tokens.filter((t) => set.has(t)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCell = cell.trim();
    }
  }
  return bestScore > 0 ? bestCell : null;
}

// Voor zwb_mention: pak de langste tekst-cel die geen tijd/getal is (vaak de naam).
function pickLongestTextCell(cells: string[]): string | null {
  let best: string | null = null;
  for (const cell of cells) {
    const t = cell.trim();
    if (!t) continue;
    if (/^\d/.test(t)) continue; // skip positie/getal-cellen
    if (TIME_HMS.test(t) || TIME_MS.test(t)) continue; // skip tijd-cellen
    if (!best || t.length > best.length) best = t;
  }
  return best;
}

// Gedeelde matching-stap: filtert rijen tot ZWB'ers (+ zwb-vermeldingen) en
// bouwt ScrapedResult-records. Gebruikt `known*`-velden wanneer de adapter de
// kolommen exact kent; valt anders terug op heuristische extractie.
function matchRows(
  candidates: MemberCandidate[],
  rows: RawRow[],
): ScrapedResult[] {
  const out: ScrapedResult[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const matchText = row.matchText.trim();
    if (!matchText && !row.knownName) continue;

    const rowTokens = nameTokens(matchText);
    const rowTokenSet = new Set(rowTokens);

    let best: MemberCandidate | null = null;
    for (const cand of candidates) {
      if (matchCandidate(rowTokens, rowTokenSet, cand)) {
        if (
          !best ||
          rankVia(cand.via) > rankVia(best.via) ||
          (cand.profileId && !best.profileId)
        ) {
          best = cand;
        }
      }
    }

    let matchedVia: MatchedVia | null = null;
    let profileId: string | null = null;
    let scrapedName = row.knownName ?? matchText;

    if (best) {
      matchedVia = best.via;
      profileId = best.profileId;
      if (!row.knownName) {
        scrapedName = pickNameCell(row.cells, best.tokens) ?? matchText;
      }
    } else if (ZWB_MENTION.test(matchText)) {
      matchedVia = "zwb_mention";
      profileId = null;
      if (!row.knownName) {
        scrapedName = pickLongestTextCell(row.cells) ?? matchText;
      }
    }

    if (!matchedVia) continue;

    const dedupeKey = profileId ?? `name:${normalize(scrapedName)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    let position = row.knownPosition ?? null;
    let timeText = row.knownTimeText ?? null;
    let timeSeconds = row.knownTimeSeconds ?? null;
    if (position == null && timeText == null) {
      const t = extractTime(matchText);
      timeText = t.timeText;
      timeSeconds = t.timeSeconds;
      position = extractPosition(row.cells);
    }

    out.push({
      scrapedName: (scrapedName || matchText).slice(0, 200),
      position,
      timeText,
      timeSeconds,
      matchedVia,
      profileId,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// ChronoRace-adapter (ACN Timing, chronorace.be en vele sportives die op het
// ChronoRace-platform draaien). De SPA laadt uitslagen via een JSON-API:
//   {base}/results/table/search/{db}/{table}?srch={q}
// Eén brede zoekterm geeft de hele tabel terug; we matchen daarna lokaal.
// ---------------------------------------------------------------------------

const CHRONO_API_BASE = "https://prod.chronorace.be/api";
const CHRONO_SEARCH_LETTERS = ["e", "a", "i", "o", "n", "r", "s"];
const CHRONO_MAX_ROWS = 50000;

function parseChronoUrl(
  resultsUrl: string,
): { db: string; table: string } | null {
  let u: URL;
  try {
    u = new URL(resultsUrl);
  } catch {
    return null;
  }
  // Hash-route: #/events/{id}/ctx/{db}/.../home/{key}
  const hash = u.hash.replace(/^#\/?/, "");
  const segs = hash.split("/").filter(Boolean);
  const ctxIdx = segs.indexOf("ctx");
  const homeIdx = segs.indexOf("home");
  if (
    ctxIdx >= 0 &&
    homeIdx >= 0 &&
    segs[ctxIdx + 1] &&
    segs[homeIdx + 1]
  ) {
    return {
      db: decodeURIComponent(segs[ctxIdx + 1]),
      table: decodeURIComponent(segs[homeIdx + 1]),
    };
  }
  return null;
}

function isChronoRaceUrl(resultsUrl: string): boolean {
  let u: URL;
  try {
    u = new URL(resultsUrl);
  } catch {
    return false;
  }
  const host = u.hostname.toLowerCase();
  if (host.includes("acn-timing.com") || host.includes("chronorace.be")) {
    return true;
  }
  return u.hash.includes("/ctx/") && u.hash.includes("/home/");
}

type ChronoColumn = { Name?: string; DisplayName?: string; Type?: string };

function findChronoColumnIndex(
  columns: ChronoColumn[],
  keywords: string[],
): number {
  // Match op DisplayName (zonder '#') of Name, in volgorde van voorkeur.
  for (const kw of keywords) {
    for (let i = 0; i < columns.length; i++) {
      const dn = (columns[i].DisplayName ?? "").replace(/[#]/g, "").toLowerCase();
      const nm = (columns[i].Name ?? "").toLowerCase();
      if (dn === kw || nm.includes(kw)) return i;
    }
  }
  return -1;
}

function chronoCellTime(
  value: unknown,
): { text: string | null; seconds: number | null } {
  if (value == null || value === "") return { text: null, seconds: null };
  if (typeof value === "number") {
    if (value <= 0) return { text: null, seconds: null };
    // Grote getallen zijn milliseconden; kleinere seconden.
    const seconds = value >= 100000 ? value / 1000 : value;
    return { text: secondsToClock(seconds), seconds: Math.round(seconds) };
  }
  const str = String(value).trim();
  if (!str || /^0+([:.]0+)*$/.test(str)) return { text: null, seconds: null };
  const t = extractTime(str);
  return { text: t.timeText ?? str, seconds: t.timeSeconds };
}

async function chronoFetchTable(
  db: string,
  table: string,
): Promise<
  | { ok: true; columns: ChronoColumn[]; rows: unknown[][] }
  | { ok: false; error: string }
> {
  const byKey = new Map<string, unknown[]>();
  let columns: ChronoColumn[] = [];
  let total = Infinity;

  for (const letter of CHRONO_SEARCH_LETTERS) {
    const url =
      `${CHRONO_API_BASE}/results/table/search/` +
      `${encodeURIComponent(db)}/${encodeURIComponent(table)}?srch=${letter}`;
    let json: {
      Count?: number;
      TableDefinition?: { Columns?: ChronoColumn[] };
      Groups?: { SlaveRows?: unknown[][] }[];
    };
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          Referer: "https://www.acn-timing.com/",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        if (byKey.size > 0) break; // we hebben al data van een eerdere letter
        return {
          ok: false,
          error: `ChronoRace-API gaf status ${res.status}. Controleer de uitslag-URL.`,
        };
      }
      json = await res.json();
    } catch {
      if (byKey.size > 0) break;
      return {
        ok: false,
        error: "Kon de ChronoRace-uitslag niet ophalen (time-out of netwerk).",
      };
    }

    if (json.TableDefinition?.Columns && columns.length === 0) {
      columns = json.TableDefinition.Columns;
    }
    if (typeof json.Count === "number") total = json.Count;

    const nameIdxLocal = findChronoColumnIndex(columns, [
      "name",
      "nom",
      "naam",
    ]);
    const bibIdxLocal = findChronoColumnIndex(columns, ["nr", "dos", "bib"]);

    for (const g of json.Groups ?? []) {
      for (const r of g.SlaveRows ?? []) {
        if (!Array.isArray(r)) continue;
        const key =
          (bibIdxLocal >= 0 && r[bibIdxLocal] != null
            ? `b:${String(r[bibIdxLocal])}`
            : "") ||
          (nameIdxLocal >= 0 ? `n:${String(r[nameIdxLocal])}` : "") ||
          `i:${byKey.size}`;
        if (!byKey.has(key)) byKey.set(key, r);
        if (byKey.size >= CHRONO_MAX_ROWS) break;
      }
    }

    // Klaar zodra we alle rijen binnen hebben (of het maximum raken).
    if (byKey.size >= total || byKey.size >= CHRONO_MAX_ROWS) break;
  }

  if (columns.length === 0) {
    return {
      ok: false,
      error:
        "ChronoRace-uitslag leeg of niet gevonden. Open het juiste " +
        "uitslagen-tabblad op de timing-site en kopieer díe URL.",
    };
  }

  return { ok: true, columns, rows: [...byKey.values()] as unknown[][] };
}

async function scrapeChronoRace(
  candidates: MemberCandidate[],
  db: string,
  table: string,
): Promise<ScrapeOutcome> {
  const fetched = await chronoFetchTable(db, table);
  if (!fetched.ok) {
    return { ok: false, results: [], error: fetched.error, provider: "chronorace" };
  }

  const { columns, rows } = fetched;
  const nameIdx = findChronoColumnIndex(columns, ["name", "nom", "naam"]);
  const posIdx = findChronoColumnIndex(columns, [
    "pos",
    "plaats",
    "place",
    "plc",
    "overall",
  ]);
  const timeIdx = findChronoColumnIndex(columns, [
    "temps",
    "tijd",
    "time",
    "chip",
    "net",
    "gun",
    "total",
    "finish",
    "result",
  ]);

  const rawRows: RawRow[] = rows.map((r) => {
    const cells = r.map((c) => (c == null ? "" : String(c)));
    const name = nameIdx >= 0 ? cells[nameIdx] : "";
    let position: number | null = null;
    if (posIdx >= 0) {
      const m = cells[posIdx].match(/(\d{1,5})/);
      if (m) position = Number(m[1]);
    }
    const time = timeIdx >= 0 ? chronoCellTime(r[timeIdx]) : { text: null, seconds: null };
    return {
      cells,
      matchText: name,
      knownName: name || null,
      knownPosition: position,
      knownTimeText: time.text,
      knownTimeSeconds: time.seconds,
    };
  });

  const results = matchRows(candidates, rawRows);
  return { ok: true, results, provider: "chronorace" };
}

// ---------------------------------------------------------------------------
// Generieke HTML-tabel-adapter (Ultratiming, datasport, vele kleinere sites).
// ---------------------------------------------------------------------------

async function scrapeGenericHtml(
  candidates: MemberCandidate[],
  resultsUrl: string,
): Promise<ScrapeOutcome> {
  let html: string;
  try {
    const res = await fetch(resultsUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "nl,en;q=0.8",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) {
      return {
        ok: false,
        results: [],
        error: `Uitslag-pagina gaf status ${res.status}.`,
      };
    }
    html = await res.text();
  } catch (err) {
    return {
      ok: false,
      results: [],
      error:
        err instanceof Error && err.name === "TimeoutError"
          ? "Time-out bij ophalen van de uitslag-pagina."
          : "Kon de uitslag-pagina niet ophalen.",
    };
  }

  const $ = cheerio.load(html);
  $("script, style, noscript").remove();

  const trs = $("tr");
  if (trs.length === 0) {
    return {
      ok: false,
      results: [],
      error:
        "Geen tabel-rijen gevonden. Waarschijnlijk een JavaScript-uitslagensite " +
        "(bv. Sporthive of MyLaps Speedhive) die niet server-side te scrapen is.",
    };
  }

  const rawRows: RawRow[] = [];
  trs.each((_, el) => {
    const cells = $(el)
      .find("td, th")
      .map((__, c) => $(c).text().replace(/\s+/g, " ").trim())
      .get();
    const rowText = cells.join(" ").replace(/\s+/g, " ").trim();
    if (!rowText) return;
    rawRows.push({ cells, matchText: rowText });
  });

  const results = matchRows(candidates, rawRows);
  return { ok: true, results, provider: "html" };
}

export async function scrapeEventResults(
  supabase: SupabaseClient,
  _eventId: string,
  resultsUrl: string,
): Promise<ScrapeOutcome> {
  const candidates = await buildMemberCandidates(supabase);

  if (isChronoRaceUrl(resultsUrl)) {
    const parsed = parseChronoUrl(resultsUrl);
    if (parsed) {
      return scrapeChronoRace(candidates, parsed.db, parsed.table);
    }
    return {
      ok: false,
      results: [],
      provider: "chronorace",
      error:
        "ChronoRace/ACN-link herkend, maar kon de uitslag-tabel niet bepalen. " +
        "Open op de timing-site het tabblad met de uitslag en kopieer díe URL " +
        "(met /ctx/… en /home/… erin).",
    };
  }

  return scrapeGenericHtml(candidates, resultsUrl);
}
