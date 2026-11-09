import * as cheerio from "cheerio";
import { assertSafeUrl } from "@/lib/net/safe-fetch";
import { LadderLoginError } from "./fixture-page";
import type { ClubLadderResult } from "./summary";
import { getClub } from "@/lib/club";

const TEAM_RESULTS_URL = "https://ladder.cycleracing.club/matchlist/results/";

/** Zoveel gereden wedstrijden per team bewaren we uit de geschiedenis (zoals `loadTeamMatches`). */
export const TEAM_HISTORY_LIMIT = 8;

const MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

/** "Wednesday, October 28, 2026" → "2026-10-28". */
function dayKey(text: string) {
  const match = /([a-z]+)\s+(\d{1,2}),\s*(\d{4})$/i.exec(clean(text));
  const month = match ? MONTHS[match[1].toLowerCase()] : undefined;
  return match && month ? `${match[3]}-${month}-${match[2].padStart(2, "0")}` : null;
}

/** "Castle Crit 6 laps", "Coastal Crown Loop 1 lap", "Legends and Lava 24.66 kms" → de routenaam. */
export function routeNameFromMatchlist(text: string) {
  return clean(text).replace(/\s+\d+(?:\.\d+)?\s*(?:laps?|kms?)$/i, "") || null;
}

// Uitslagen van één team, /matchlist/results/<team> (achter login, november 2026):
// table.resTable met tr.dayBounds (datum als tekst) en per wedstrijd
// tr.expandor[data-id] (het ID van /public/result/<id>) met tijd, uitdager, twee
// scores, tegenstander, route met rondes of afstand, en fase (Finished/Forfeit).
export function parseLadderTeamResults(html: string): ClubLadderResult[] {
  const $ = cheerio.load(html);
  const results: ClubLadderResult[] = [];
  let date: string | null = null;
  $("table.resTable tr").each((_, tr) => {
    const row = $(tr);
    if (row.hasClass("dayBounds")) {
      date = dayKey(row.text());
      return;
    }
    if (!row.hasClass("expandor") || !date) return;
    const resultId = Number(row.attr("data-id"));
    const time = clean(row.find("td.datecol").text());
    const challenger = clean(row.find("td.homeTeam").text());
    const opponent = clean(row.find("td.awayTeam").text());
    const scores = row
      .find("td.score")
      .map((__, td) => Number(clean($(td).text())))
      .get();
    if (!Number.isSafeInteger(resultId) || resultId <= 0 || !/^\d{1,2}:\d{2}$/.test(time)) return;
    if (!challenger || !opponent || scores.length < 2 || !scores.every(Number.isFinite)) return;
    const cells = row.children("td");
    results.push({
      resultId,
      date,
      time: time.padStart(5, "0"),
      route: routeNameFromMatchlist(cells.eq(cells.length - 2).text()),
      challenger,
      challengerScore: scores[0],
      opponent,
      opponentScore: scores[1],
      stage: clean(cells.last().text()) || null,
    });
  });
  return results;
}

/** De laatste gereden wedstrijden; een opgegeven wedstrijd (Forfeit) heeft geen renners. */
export function recentRacedResults(results: ClubLadderResult[], limit = TEAM_HISTORY_LIMIT) {
  return results
    .filter((result) => result.stage?.toLowerCase() !== "forfeit")
    .sort((a, b) => b.resultId - a.resultId)
    .slice(0, limit);
}

export async function fetchLadderTeamResults(team: string, cookie: string): Promise<ClubLadderResult[]> {
  const clubShort = (await getClub()).texts.shortName;
  const url = `${TEAM_RESULTS_URL}${encodeURIComponent(team)}`;
  await assertSafeUrl(url);
  const res = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": `${clubShort} Platform Club Ladder comparison`,
      Referer: "https://ladder.cycleracing.club/",
      Cookie: cookie,
    },
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (res.status >= 300 && res.status < 400) {
    throw new LadderLoginError("Ladder-sessie verlopen: vernieuw LADDER_COOKIE.");
  }
  if (!res.ok) throw new Error(`Uitslagen van ${team} gaven HTTP ${res.status}.`);
  return parseLadderTeamResults(await res.text());
}
