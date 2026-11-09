import * as cheerio from "cheerio";
import { assertSafeUrl } from "@/lib/net/safe-fetch";
import { ladderResultUrl } from "./event-result";
import { getClub } from "@/lib/club";

export type LadderResultRider = {
  name: string;
  /** Finishplek in de wedstrijd, 1 = eerste. */
  position: number;
  points: number;
  /** Rijtijd in seconden, zoals de ladder hem toont. */
  timeS: number | null;
  /** Gemiddeld W/kg in deze wedstrijd. */
  avgWkg: number | null;
  /** Naam van het team waarvoor hij reed. */
  team: string;
};

export type LadderResultPage = {
  zwiftEventId: number | null;
  /** Zwift-routeId uit de routekaart (`/routeMap/<id>`). */
  zwiftRouteId: number | null;
  routeName: string | null;
  laps: number | null;
  riders: LadderResultRider[];
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function positive(value: string | undefined) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

/**
 * Openbare uitslagpagina van één wedstrijd (opmaak november 2026). Per renner
 * staat alleen welke kant won (riderWinScore of riderLoseScore); het team volgt
 * uit de score: de punten van de winnende kant tellen op tot de hoogste score.
 * Bij gelijke stand verliest de uitdager (race book), dus wint de tegenstander.
 */
export function parseLadderResultPage(html: string, teams: { challenger: string; opponent: string; challengerScore: number; opponentScore: number }): LadderResultPage {
  const $ = cheerio.load(html);
  const eventLink = $('a[href*="zwiftpower.com/events.php?zid="]').attr("href") ?? "";
  const zwiftEventId = positive(/zid=(\d+)/.exec(eventLink)?.[1]);
  const mapStyle = $(".specialBackgroundBefore").attr("style") ?? "";
  const zwiftRouteId = positive(/\/routeMap\/(\d+)/.exec(mapStyle)?.[1]);
  const routeName = clean($(".resultInfoSection .h2.card-text").first().text()) || null;
  const laps = positive(clean($(".resultInfoSection .dataFld").first().text()));

  const winner = teams.challengerScore > teams.opponentScore ? teams.challenger : teams.opponent;
  const loser = winner === teams.challenger ? teams.opponent : teams.challenger;
  const riders: LadderResultRider[] = [];
  $("table.resultTable tr[data-riderId]").each((index, tr) => {
    const row = $(tr);
    const score = row.find("td.riderScore");
    const name = clean(row.find("td.riderName").text());
    if (!name) return;
    riders.push({
      name,
      position: index + 1,
      points: Number(clean(score.text())) || 0,
      timeS: positive(clean(row.find("td.timeFormat").text())),
      avgWkg: positive(clean(row.find("td.powerFormat").text())),
      team: score.hasClass("riderWinScore") ? winner : loser,
    });
  });
  return { zwiftEventId: zwiftEventId && Number.isSafeInteger(zwiftEventId) ? zwiftEventId : null, zwiftRouteId, routeName, laps, riders };
}

export async function fetchLadderResultPage(resultId: number) {
  const clubShort = (await getClub()).texts.shortName;
  if (!Number.isSafeInteger(resultId) || resultId <= 0) throw new Error("Ongeldig uitslag-ID.");
  const url = ladderResultUrl(resultId);
  await assertSafeUrl(url);
  const res = await fetch(url, {
    headers: { Accept: "text/html", "User-Agent": `${clubShort} Platform Club Ladder comparison`, Referer: "https://ladder.cycleracing.club/" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Club Ladder-uitslag gaf HTTP ${res.status}.`);
  return res.text();
}
