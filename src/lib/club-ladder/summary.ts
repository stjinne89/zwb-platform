import * as cheerio from "cheerio";
import { normalizeTeamName } from "@/lib/ladder";
import { assertSafeUrl } from "@/lib/net/safe-fetch";

export const CLUB_LADDER_SUMMARY_URL = "https://ladder.cycleracing.club/summary";

export type ClubLadderStanding = {
  position: number;
  name: string;
  /** Team-ID van de ladder (`data-team-id`), of null als hij ontbreekt. */
  ladderTeamId: number | null;
  region: string;
  /** Laatste uitslagen in de volgorde van de ladder: W (ook een verdedigde plek) of L. */
  form: string[];
  /** "▲ 2", "▼", "=" of null. */
  move: string | null;
};

export type ClubLadderFixture = {
  /** Wedstrijdnummer van de ladder (`/fixture/<id>`), of null als het ontbreekt. */
  fixtureId: number | null;
  /** YYYY-MM-DD (UTC), of null als de dag niet te lezen is. */
  date: string | null;
  /** HH:MM in UTC, zoals de ladder hem toont. */
  time: string;
  /** ISO-tijdstip in UTC, of null zonder datum. */
  startsAt: string | null;
  home: string;
  away: string;
  homeId: number | null;
  awayId: number | null;
  route: string | null;
  powerups: string[];
};

/** Een gespeelde wedstrijd uit de uitslagentab; de uitdager staat links. */
export type ClubLadderResult = {
  /** ID van de openbare uitslagpagina (`/public/result/<id>`). */
  resultId: number;
  /** YYYY-MM-DD (UTC). */
  date: string;
  /** HH:MM in UTC. */
  time: string;
  route: string | null;
  challenger: string;
  challengerScore: number;
  opponent: string;
  opponentScore: number;
  stage: string | null;
};

export type ClubLadderSummary = {
  standings: ClubLadderStanding[];
  fixtures: ClubLadderFixture[];
  results: ClubLadderResult[];
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

      const teamId = Number(row.attr("data-team-id"));
      const ladderTeamId = Number.isSafeInteger(teamId) && teamId > 0 ? teamId : null;
      rows.push({ position, name, ladderTeamId, region, form, move });
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
// tr.fixToday/tr.fixFuture[data-id] met tijd, thuis- en uitploeg, route en powerups.
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

    const id = (value: string | undefined) => {
      const number = Number(value);
      return Number.isSafeInteger(number) && number > 0 ? number : null;
    };
    fixtures.push({
      fixtureId: id(row.attr("data-id")),
      date,
      time,
      startsAt: date ? `${date}T${time.padStart(5, "0")}:00Z` : null,
      home,
      away,
      homeId: id(row.find("td.homeTeam .teamOpener").attr("data-team-id")),
      awayId: id(row.find("td.awayTeam .teamOpener").attr("data-team-id")),
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

// Uitslagen staan in .resTable (november 2026): per dag een tbody.dateBundle[data-date],
// dan tr.pubResultOpener[data-id] met tijd, route, uitdager, twee scores, tegenstander en fase.
function parseResults($: cheerio.CheerioAPI) {
  const results: ClubLadderResult[] = [];
  $("table.resTable tbody.dateBundle").each((_, body) => {
    const date = clean($(body).attr("data-date") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    $(body)
      .find("tr.pubResultOpener")
      .each((__, tr) => {
        const row = $(tr);
        const cells = row.children("td");
        const resultId = Number(row.attr("data-id"));
        const time = clean(cells.eq(0).text());
        const challenger = clean(row.find("td.homeTeam").text());
        const opponent = clean(row.find("td.awayTeam").text());
        const scores = row
          .find("td.score")
          .map((___, td) => Number(clean($(td).text())))
          .get();
        if (!Number.isSafeInteger(resultId) || resultId <= 0 || !/^\d{1,2}:\d{2}$/.test(time)) return;
        if (!challenger || !opponent || scores.length < 2 || !scores.every(Number.isFinite)) return;
        results.push({
          resultId,
          date,
          time: time.padStart(5, "0"),
          route: clean(cells.eq(1).text()) || null,
          challenger,
          challengerScore: scores[0],
          opponent,
          opponentScore: scores[1],
          stage: clean(cells.last().text()) || null,
        });
      });
  });
  return results;
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
    results: parseResults($),
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
  // Geen LADDER_COOKIE: ingelogd stuurt /summary door naar het persoonlijke
  // dashboard, zonder stand en wedstrijden. De pagina is openbaar.

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
