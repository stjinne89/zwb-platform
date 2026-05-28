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
};

type MemberCandidate = {
  profileId: string | null;
  tokens: string[]; // genormaliseerde naam-tokens (≥2 tekens)
  norm: string; // volledige genormaliseerde naam
  via: MatchedVia;
};

const FETCH_TIMEOUT_MS = 15000;
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

async function buildMemberCandidates(
  supabase: SupabaseClient,
): Promise<MemberCandidate[]> {
  const candidates: MemberCandidate[] = [];

  // 1. Goedgekeurde leden met hun display_name.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("is_approved", true);

  for (const p of profiles ?? []) {
    const name = (p.display_name ?? "").trim();
    if (!name) continue;
    const tokens = nameTokens(name);
    if (tokens.length === 0) continue;
    candidates.push({
      profileId: p.id,
      tokens,
      norm: normalize(name),
      via: "member_name",
    });
  }

  // 2. Strava athlete_name (echte voor+achternaam — beste bron voor gran fondos).
  const { data: stravaConns } = await supabase
    .from("strava_connections")
    .select("profile_id, athlete_name");

  for (const c of stravaConns ?? []) {
    const name = (c.athlete_name ?? "").trim();
    if (!name) continue;
    const tokens = nameTokens(name);
    if (tokens.length === 0) continue;
    candidates.push({
      profileId: c.profile_id,
      tokens,
      norm: normalize(name),
      via: "strava_name",
    });
  }

  // 3. Roster-namen (gekoppeld lid waar bekend).
  const { data: roster } = await supabase
    .from("roster_entries")
    .select("name, claimed_by");

  for (const r of roster ?? []) {
    const name = (r.name ?? "").trim();
    if (!name) continue;
    const tokens = nameTokens(name);
    if (tokens.length === 0) continue;
    candidates.push({
      profileId: r.claimed_by ?? null,
      tokens,
      norm: normalize(name),
      via: "roster",
    });
  }

  return candidates;
}

// Strikt: bij ≥2 tokens moeten ALLE tokens in de rij voorkomen (voor+achternaam),
// óf exacte genormaliseerde gelijkheid. Voorkomt false-positives op "Jan".
function matchCandidate(
  rowNorm: string,
  rowTokenSet: Set<string>,
  cand: MemberCandidate,
): boolean {
  if (cand.tokens.length >= 2) {
    return cand.tokens.every((t) => rowTokenSet.has(t));
  }
  // Eén token (mononiem): alleen exacte gelijkheid van de hele rij telt mee
  // is te streng; vereis dat het token een los woord in de rij is.
  return rowTokenSet.has(cand.tokens[0]) && cand.norm.length >= 4
    ? rowNorm.includes(cand.norm)
    : false;
}

export async function scrapeEventResults(
  supabase: SupabaseClient,
  _eventId: string,
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
  // Verwijder script/style zodat we geen JS-tekst meematchen.
  $("script, style, noscript").remove();

  const rows = $("tr");
  if (rows.length === 0) {
    return {
      ok: false,
      results: [],
      error:
        "Geen tabel-rijen gevonden. Waarschijnlijk een JavaScript-uitslagensite " +
        "(bv. Sporthive of MyLaps Speedhive) die niet server-side te scrapen is.",
    };
  }

  const candidates = await buildMemberCandidates(supabase);

  const out: ScrapedResult[] = [];
  const seen = new Set<string>();

  rows.each((_, el) => {
    const cells = $(el)
      .find("td, th")
      .map((__, c) => $(c).text().replace(/\s+/g, " ").trim())
      .get();
    const rowText = cells.join(" ").replace(/\s+/g, " ").trim();
    if (!rowText) return;

    const rowNorm = normalize(rowText);
    const rowTokenSet = new Set(nameTokens(rowText));

    // Beste kandidaat-match (prioriteit: strava_name > member_name > roster).
    let best: MemberCandidate | null = null;
    for (const cand of candidates) {
      if (matchCandidate(rowNorm, rowTokenSet, cand)) {
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
    let scrapedName = rowText;

    if (best) {
      matchedVia = best.via;
      profileId = best.profileId;
      // Naam: gebruik de cel die de meeste naam-tokens bevat als die er is.
      scrapedName = pickNameCell(cells, best.tokens) ?? rowText;
    } else if (ZWB_MENTION.test(rowText)) {
      matchedVia = "zwb_mention";
      profileId = null;
      scrapedName = pickLongestTextCell(cells) ?? rowText;
    }

    if (!matchedVia) return;

    const dedupeKey = profileId ?? `name:${normalize(scrapedName)}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    const { timeText, timeSeconds } = extractTime(rowText);
    const position = extractPosition(cells);

    out.push({
      scrapedName: scrapedName.slice(0, 200),
      position,
      timeText,
      timeSeconds,
      matchedVia,
      profileId,
    });
  });

  return { ok: true, results: out };
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
