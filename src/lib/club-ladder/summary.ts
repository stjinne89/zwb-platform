import * as cheerio from "cheerio";
import { normalizeTeamName } from "@/lib/ladder";
import { assertSafeUrl } from "@/lib/net/safe-fetch";

export const CLUB_LADDER_SUMMARY_URL = "https://ladder.cycleracing.club/summary";

export type ClubLadderStanding = {
  position: number;
  name: string;
  region: string;
  /** Laatste uitslagen in de volgorde van de ladder: W (ook een verdedigde plek) of L. */
  form: string[];
  /** "▲ 2", "▼", "=" of null. */
  move: string | null;
};

export type ClubLadderFixture = {
  /** YYYY-MM-DD (UTC), of null als de dag niet te lezen is. */
  date: string | null;
  /** HH:MM in UTC, zoals de ladder hem toont. */
  time: string;
  /** ISO-tijdstip in UTC, of null zonder datum. */
  startsAt: string | null;
  home: string;
  away: string;
  route: string | null;
  powerups: string[];
};

export type ClubLadderSummary = {
  standings: ClubLadderStanding[];
  fixtures: ClubLadderFixture[];
  fetchedAt: string;
  sourceUrl: string;
};

const MOVE_SYMBOLS: Record<string, string> = { upMove: "▲", downMove: "▼", staticMove: "=" };

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

// Opmaak van /summary (oktober 2026): per regio een section.aLadder met een h2
// en rijen tr.ladderRow. De World-ladder (section.pLadder) telt alle regio's
// samen opnieuw en blijft buiten de stand, anders staat elk team er twee keer in.
function parseStandings($: cheerio.CheerioAPI) {
  const rows: ClubLadderStanding[] = [];

  $("section.aLadder").each((_, section) => {
    const block = $(section);
    if (block.hasClass("pLadder")) return;
    const region = clean(block.children("h2").first().text()).toUpperCase() || "Club Ladder";

    block.find("tr.ladderRow").each((__, tr) => {
      const row = $(tr);
      const position = Number(row.attr("data-position") ?? clean(row.find("td.nposCol").text()));
      const name = clean(row.find("td.highlightBold").text());
      if (!Number.isFinite(position) || position <= 0 || !name) return;

      const form = row
        .find(".formSquare")
        .map((___, square) => clean($(square).text()).toUpperCase())
        .get()
        .filter((result) => result === "W" || result === "L");

      const bubble = row.find(".movebubble").first().clone();
      bubble.find("span").remove();
      const symbol = Object.entries(MOVE_SYMBOLS).find(([cls]) => bubble.hasClass(cls))?.[1];
      const steps = clean(bubble.text()).match(/\d+/)?.[0];
      const move = symbol ? (steps && symbol !== "=" ? `${symbol} ${steps}` : symbol) : null;

      rows.push({ position, name, region, form, move });
    });
  });

  return rows;
}

function dayToDate(label: string, fetchedAt: Date) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) return label;
  const offset = /^today$/i.test(label) ? 0 : /^tomorrow$/i.test(label) ? 1 : null;
  if (offset == null) return null;
  const day = new Date(fetchedAt);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}

// Wedstrijden staan in de tabel van .fixtureTab: een tr.dayBounds per dag, dan
// tr.fixToday/tr.fixFuture met tijd, thuis- en uitploeg, route en powerups.
function parseFixtures($: cheerio.CheerioAPI, fetchedAt: Date) {
  const fixtures: ClubLadderFixture[] = [];
  let date: string | null = null;

  $(".fixtureTab tr").each((_, tr) => {
    const row = $(tr);
    if (row.hasClass("dayBounds")) {
      date = dayToDate(clean(row.text()), fetchedAt);
      return;
    }
    const home = clean(row.find("td.homeTeam").text());
    const away = clean(row.find("td.awayTeam").text());
    const time = clean(row.children("td").first().text());
    if (!home || !away || !/^\d{1,2}:\d{2}$/.test(time)) return;

    fixtures.push({
      date,
      time,
      startsAt: date ? `${date}T${time.padStart(5, "0")}:00Z` : null,
      home,
      away,
      route: clean(row.children("td").eq(3).text()) || null,
      powerups: row
        .find("img.pup-small")
        .map((__, img) => $(img).attr("title") ?? "")
        .get()
        .filter(Boolean),
    });
  });

  return fixtures;
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

export function parseClubLadderSummary(html: string, now = new Date()): ClubLadderSummary {
  const $ = cheerio.load(html);
  return {
    standings: dedupeStandings(parseStandings($)),
    fixtures: parseFixtures($, now),
    fetchedAt: now.toISOString(),
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
