import * as cheerio from "cheerio";
import { assertSafeUrl } from "@/lib/net/safe-fetch";
import { getClub } from "@/lib/club";

export const CLUB_LADDER_FIXTURE_URL = "https://ladder.cycleracing.club/fixture/";

export type LadderSignup = {
  zwiftId: number;
  name: string;
  /** Startplek die de captain gaf (1, 2, …), of null als de renner niet rijdt. */
  position: number | null;
};

export type LadderFixturePage = {
  /** Het Zwift-event van de wedstrijd (verborgen veld `zwiftEventId`). */
  zwiftEventId: number | null;
  routeName: string | null;
  laps: number | null;
  km: number | null;
  home: LadderSignup[];
  away: LadderSignup[];
};

/** De wedstrijdpagina stuurt zonder geldige sessie door naar /signin. */
export class LadderLoginError extends Error {}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function positive(value: string | undefined) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

// Opmaak van /fixture/<id> (november 2026). Het Zwift-event staat in het
// verborgen veld input#fixture_zid[name=zwiftEventId]. Tab Info: route in .card-img-overlay
// .h2, rondes in .h3, afstand in .lapsConv. Tab Signups: per ploeg een
// section.homeTeamSignins / .awayTeamSignins met tr[data-rider-id] (de Zwift-ID);
// .mergeTeamSignins herhaalt beide en blijft erbuiten. De startplek staat in
// .position-indicator; een renner zonder nummer rijdt niet.
export function parseLadderFixturePage(html: string): LadderFixturePage {
  const $ = cheerio.load(html);
  const overlay = $("#pane-info .card-img-overlay").first();
  const lapsText = clean(overlay.find(".h3").first().text()).match(/laps\s*(\d+)/i)?.[1];
  const kmText = clean(overlay.find(".lapsConv").first().text()).match(/(\d+(?:\.\d+)?)\s*km/i)?.[1];

  const side = (selector: string) => {
    const riders = new Map<number, LadderSignup>();
    $(`${selector} tr[data-rider-id]`).each((_, tr) => {
      const row = $(tr);
      const zwiftId = positive(row.attr("data-rider-id"));
      if (!zwiftId || riders.has(zwiftId)) return;
      const indicator = row.find(".position-indicator").first();
      riders.set(zwiftId, {
        zwiftId,
        name: clean(row.find(".sticky-truncate").first().text()),
        position: positive(clean(indicator.text())),
      });
    });
    return [...riders.values()];
  };

  return {
    zwiftEventId: positive($("input#fixture_zid, input[name='zwiftEventId']").first().attr("value")),
    routeName: clean(overlay.find(".h2").first().text()) || null,
    laps: positive(lapsText),
    km: kmText ? Number(kmText) : null,
    home: side("section.homeTeamSignins"),
    away: side("section.awayTeamSignins"),
  };
}

export async function fetchLadderFixturePage(fixtureId: number, cookie: string): Promise<LadderFixturePage> {
  const clubShort = (await getClub()).texts.shortName;
  const url = `${CLUB_LADDER_FIXTURE_URL}${fixtureId}`;
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
  if (!res.ok) throw new Error(`Ladderwedstrijd ${fixtureId} gaf HTTP ${res.status}.`);
  return parseLadderFixturePage(await res.text());
}
