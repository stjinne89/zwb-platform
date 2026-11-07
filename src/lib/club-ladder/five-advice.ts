// Onze vijf voor een ladderrace als er meer dan vijf beschikbaar zijn
// (2026-11-07, vraag eigenaar: ZWBeasts met zes voor de volgende wedstrijd).
//
// Per mogelijke vijf de verwachte uitslag tegen de vijf van de tegenstander,
// zoals het racebriefje rekent (`projectLadder`): sterkte op dit parcours, punten
// 10‥1, bij gelijke stand verliest de uitdager. Eén sterkte per renner over de
// hele groep, zodat elke vijf op dezelfde maat staat. Zonder parcours telt elke
// duur even zwaar. Puur: geen I/O.

import { LADDER_TEAM_SIZE, projectLadder, routeRatings, type LadderBriefingRider } from "./briefing";
import type { LadderMatchup, MatchupRider } from "./matchup";
import type { DurationWeights } from "./routes";
import { DURATIONS, type PowerWkg } from "./team-power";

/** Meer renners maakt te veel vijftallen; de sterksten tellen dan. */
const MAX_POOL = 10;

export type FiveOption = {
  /** Wie er rust, op volgorde van de matchup. */
  rest: Array<Pick<MatchupRider, "zwiftId" | "name" | "profileId">>;
  five: number[];
  ours: number;
  theirs: number;
  win: boolean;
};

export type FiveAdvice = {
  /** Beste eerst. */
  options: FiveOption[];
  /** Renners zonder vermogen: die rekent het advies niet mee. */
  withoutPower: Array<Pick<MatchupRider, "zwiftId" | "name" | "profileId">>;
};

const powerOf = (rider: MatchupRider): PowerWkg | null => {
  const wkg = rider.routeWkg ?? rider.wkg;
  return wkg && DURATIONS.some((d) => wkg[d] != null && wkg[d]! > 0) ? wkg : null;
};

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [...combinations(rest, size - 1).map((combo) => [first, ...combo]), ...combinations(rest, size)];
}

/**
 * Advies welke vijf van ons rijden. Null met vijf of minder renners met
 * vermogen, of zonder renners van de tegenstander om tegen te rekenen.
 */
export function ourFiveAdvice(matchup: LadderMatchup, weights: DurationWeights | null, challenger: boolean): FiveAdvice | null {
  const ours = matchup.ours.riders.filter((rider) => powerOf(rider));
  const theirsAll = matchup.theirs.riders.filter((rider) => powerOf(rider));
  if (ours.length <= LADDER_TEAM_SIZE || theirsAll.length === 0) return null;

  const all = [...ours, ...theirsAll];
  const ratings = routeRatings(all.map((rider) => ({ zwiftId: rider.zwiftId, wkg: powerOf(rider) })), weights);
  const rating = (rider: MatchupRider) => ratings.get(rider.zwiftId) ?? null;
  const byStrength = (a: MatchupRider, b: MatchupRider) => (rating(b) ?? 0) - (rating(a) ?? 0);
  // Meer dan vijf aangemeld bij de tegenstander: hij rijdt met zijn sterkste vijf.
  const theirs = [...theirsAll].sort(byStrength).slice(0, LADDER_TEAM_SIZE);
  const pool = new Set([...ours].sort(byStrength).slice(0, MAX_POOL).map((rider) => rider.zwiftId));
  const candidates = ours.filter((rider) => pool.has(rider.zwiftId));

  const asBriefing = (rider: MatchupRider, own: boolean): LadderBriefingRider => ({
    zwiftId: rider.zwiftId,
    name: rider.name,
    own,
    rating: rating(rider),
    wkg: rider.wkg,
    source: rider.source,
    racingScore: rider.racingScore,
  });
  const strength = (five: MatchupRider[]) => five.reduce((sum, rider) => sum + Math.log(rating(rider) ?? 1), 0);

  const options = combinations(candidates, LADDER_TEAM_SIZE).map((five) => {
    const projection = projectLadder([...five.map((rider) => asBriefing(rider, true)), ...theirs.map((rider) => asBriefing(rider, false))], challenger);
    const chosen = new Set(five.map((rider) => rider.zwiftId));
    return {
      option: {
        rest: ours.filter((rider) => !chosen.has(rider.zwiftId)).map(({ zwiftId, name, profileId }) => ({ zwiftId, name, profileId })),
        five: five.map((rider) => rider.zwiftId),
        ours: projection.ours,
        theirs: projection.theirs,
        win: projection.win,
      },
      strength: strength(five),
    };
  });
  // Grootste marge eerst; bij dezelfde marge de sterkste vijf.
  options.sort(
    (a, b) =>
      b.option.ours - b.option.theirs - (a.option.ours - a.option.theirs) ||
      Number(b.option.win) - Number(a.option.win) ||
      b.strength - a.strength,
  );

  return {
    options: options.map((row) => row.option),
    withoutPower: matchup.ours.riders.filter((rider) => !powerOf(rider)).map(({ zwiftId, name, profileId }) => ({ zwiftId, name, profileId })),
  };
}
