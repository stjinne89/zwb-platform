import * as cheerio from "cheerio";
import { normalizeTeamName } from "@/lib/ladder";
import { assertSafeUrl } from "@/lib/net/safe-fetch";

export const CLUB_LADDER_SUMMARY_URL = "https://ladder.cycleracing.club/summary";

export type ClubLadderStanding = {
  position: number;
  name: string;
  region: string;
  club: string | null;
  avg: string | null;
  med: string | null;
  form: string[];
  move: string | null;
};

export type ClubLadderFixture = {
  date: string | null;
  time: string;
  raw: string;
};

export type ClubLadderSummary = {
  standings: ClubLadderStanding[];
  fixtures: ClubLadderFixture[];
  fetchedAt: string;
  sourceUrl: string;
};

const REGION_LABELS = new Set(["EMEA", "AMER", "APAC", "WOMEN", "MIXED"]);

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function moveText(value: string) {
  const match = value.match(/[▲▼=](?:\s*\d+)?|Bonus Drop/i);
  return match ? clean(match[0]) : null;
}

function isRegion(value: string) {
  return REGION_LABELS.has(value.toUpperCase());
}

function parseTableStandings(html: string) {
  const $ = cheerio.load(html);
  const rows: ClubLadderStanding[] = [];
  let region = "Club Ladder";

  $("h1,h2,h3,h4,table,tr").each((_, node) => {
    const element = $(node);
    const tag = node.type === "tag" ? node.name.toLowerCase() : "";
    const text = clean(element.text());
    if (!text) return;

    if (tag !== "tr" && isRegion(text)) {
      region = text.toUpperCase();
      return;
    }
    if (tag !== "tr") return;

    const cells = element
      .children("td,th")
      .map((__, cell) => clean($(cell).text()))
      .get()
      .filter(Boolean);
    if (cells.length < 2 || !/^\d{1,4}$/.test(cells[0])) return;

    const position = Number(cells[0]);
    const name = cells[1];
    if (!Number.isFinite(position) || !name || /^name$/i.test(name)) return;

    const form = cells.filter((cell) => /^[WL]$/i.test(cell)).map((cell) => cell.toUpperCase());
    rows.push({
      position,
      name,
      region,
      avg: cells[2] && !/^[WL]$/i.test(cells[2]) ? cells[2] : null,
      med: cells[3] && !/^[WL]$/i.test(cells[3]) ? cells[3] : null,
      club:
        cells[4] && !/^[WL]$/i.test(cells[4]) && !moveText(cells[4])
          ? cells[4]
          : null,
      form,
      move: moveText(cells.join(" ")),
    });
  });

  return rows;
}

function parseTextStandings(html: string) {
  const $ = cheerio.load(html);
  $("script,style,svg").remove();
  const lines = $("body")
    .text()
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);
  const rows: ClubLadderStanding[] = [];
  let region = "Club Ladder";
  let inRankings = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (isRegion(line)) {
      region = line.toUpperCase();
      inRankings = true;
      continue;
    }
    if (/^Pos\s+Name/i.test(line)) {
      inRankings = true;
      continue;
    }
    if (/^(Fixtures|Results|Riders|Belts|Captains)/i.test(line)) {
      inRankings = false;
      continue;
    }
    if (!inRankings) continue;

    const match = line.match(/^(\d{1,4})\s+(.+)$/);
    if (!match) continue;
    const position = Number(match[1]);
    const name = clean(match[2]);
    if (!Number.isFinite(position) || !name || /^Rung\s+/i.test(name)) continue;

    const chunk: string[] = [];
    for (let j = i + 1; j < Math.min(lines.length, i + 12); j += 1) {
      if (/^\d{1,4}\s+/.test(lines[j]) || isRegion(lines[j]) || /^Time \(UTC\)/i.test(lines[j])) {
        break;
      }
      chunk.push(lines[j]);
    }
    const form = chunk.filter((item) => /^[WL]$/i.test(item)).map((item) => item.toUpperCase());

    rows.push({
      position,
      name,
      region,
      avg: null,
      med: null,
      club: null,
      form,
      move: moveText(chunk.join(" ")),
    });
  }

  return rows;
}

function parseFixtures(html: string) {
  const $ = cheerio.load(html);
  $("script,style,svg").remove();
  const lines = $("body")
    .text()
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);
  const fixtures: ClubLadderFixture[] = [];
  let currentDate: string | null = null;

  for (const line of lines) {
    if (/^(Today|Tomorrow|\d{4}-\d{2}-\d{2})$/i.test(line)) {
      currentDate = line;
      continue;
    }
    const match = line.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
    if (!match) continue;
    fixtures.push({
      date: currentDate,
      time: match[1],
      raw: clean(match[2]),
    });
  }

  return fixtures.slice(0, 80);
}

function dedupeStandings(rows: ClubLadderStanding[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.region}:${row.position}:${normalizeTeamName(row.name)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseClubLadderSummary(html: string): ClubLadderSummary {
  const tableRows = parseTableStandings(html);
  const standings = dedupeStandings(tableRows.length > 0 ? tableRows : parseTextStandings(html));
  return {
    standings,
    fixtures: parseFixtures(html),
    fetchedAt: new Date().toISOString(),
    sourceUrl: CLUB_LADDER_SUMMARY_URL,
  };
}

export async function fetchClubLadderSummary(): Promise<ClubLadderSummary> {
  await assertSafeUrl(CLUB_LADDER_SUMMARY_URL);
  const headers: Record<string, string> = {
    Accept: "text/html,application/xhtml+xml",
    "User-Agent": "ZWB Platform Club Ladder comparison",
    Referer: "https://ladder.cycleracing.club/",
  };
  if (process.env.LADDER_COOKIE) headers.Cookie = process.env.LADDER_COOKIE;

  const res = await fetch(CLUB_LADDER_SUMMARY_URL, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Club Ladder summary gaf HTTP ${res.status}.`);
  return parseClubLadderSummary(await res.text());
}

export function findStandingWindow(
  standings: ClubLadderStanding[],
  aliases: string[],
  fallbackPosition: number | null,
) {
  const normalizedAliases = aliases.map(normalizeTeamName).filter(Boolean);
  const matchedIndex = standings.findIndex((row) =>
    normalizedAliases.includes(normalizeTeamName(row.name)),
  );
  const positionIndex =
    matchedIndex >= 0
      ? matchedIndex
      : fallbackPosition
        ? standings.findIndex((row) => row.position === fallbackPosition)
        : -1;
  if (positionIndex < 0) return { match: null, window: standings.slice(0, 12) };

  const match = standings[positionIndex];
  const sameRegion = standings.filter((row) => row.region === match.region);
  const localIndex = sameRegion.findIndex(
    (row) =>
      row.position === match.position &&
      normalizeTeamName(row.name) === normalizeTeamName(match.name),
  );
  const start = Math.max(0, localIndex - 5);
  return {
    match,
    window: sameRegion.slice(start, start + 11),
  };
}
