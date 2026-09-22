// Teamuitslag van een gereden ZRL-race, voor de raceweekpagina.
//
// Dezelfde berekening als de live stand (`loadZrlLive`), maar dan één getal: de
// plaats van ons team in zijn divisie. De live stand is er voor tijdens de race;
// dit is er voor daarna, dus de uitkomst wordt een stuk langer bewaard.
//
// Twee wachten, want een verkeerde plaats is erger dan geen plaats:
// - de uitslag van Zwift moet definitief zijn;
// - de segmentpassages moeten er nog zijn. Zwift geeft die maar een tijd terug;
//   zonder passages telt alleen FIN mee en zou de stand er kloppend uitzien
//   terwijl hij het niet is.

import { unstable_cache } from "next/cache";
import { loadZrlLive, type ZrlLiveView } from "@/lib/zrl-live/snapshot";

export type ZrlTeamResult = {
  /** Plaats van ons team in de divisie. */
  rank: number;
  /** Aantal teams in de stand. */
  teams: number;
  points: number;
  riders: number;
};

/** Onder deze dekking van de verwachte doorkomsten rekenen we niet. */
const MIN_COVERAGE = 0.8;

/** Een ZRL-race duurt ongeveer drie kwartier; daarna pas rekenen. */
export const RACE_OVER_AFTER_MS = 90 * 60 * 1000;

/**
 * De plaats van ons team uit een doorgerekende stand, of null als de stand niet
 * betrouwbaar genoeg is om een plaats te tonen.
 */
export function teamResultOf(view: ZrlLiveView): ZrlTeamResult | null {
  if (!view.score.final || !view.ownTeam) return null;
  const own = view.score.teams.find((team) => team.team === view.ownTeam);
  if (!own) return null;

  const finishers = view.score.riders.filter((rider) => !rider.void).length;
  const expected = finishers * view.score.passes.length;
  const seen = view.score.passes.reduce((total, pass) => total + pass.crossings.length, 0);
  if (expected === 0 || seen / expected < MIN_COVERAGE) return null;

  return { rank: own.rank, teams: view.score.teams.length, points: own.total, riders: own.riders };
}

async function computeTeamResult(eventId: string): Promise<ZrlTeamResult | null> {
  const outcome = await loadZrlLive(eventId);
  return outcome.status === "ok" ? teamResultOf(outcome.view) : null;
}

// De race is gereden, dus de uitkomst verandert niet meer. Zes uur cache houdt
// het aantal Zwift-aanroepen laag als meerdere leden de raceweek openen.
const cachedTeamResult = unstable_cache(computeTeamResult, ["zrl-team-result", "v1"], {
  revalidate: 6 * 60 * 60,
});

/**
 * De teamuitslag per gereden teamevent. Events die nog niet gereden zijn slaan
 * we over: dan valt er niets te halen en hoeven we Zwift niet te bevragen.
 */
export async function loadZrlTeamResults(
  events: Array<{ id: string; startAt: string }>,
  now = Date.now(),
): Promise<Map<string, ZrlTeamResult>> {
  const ridden = events.filter((event) => {
    const start = Date.parse(event.startAt);
    return Number.isFinite(start) && now - start > RACE_OVER_AFTER_MS;
  });
  const results = new Map<string, ZrlTeamResult>();
  await Promise.all(
    ridden.map(async (event) => {
      try {
        const result = await cachedTeamResult(event.id);
        if (result) results.set(event.id, result);
      } catch {
        // Zwift plat of traag: dan toont de raceweek gewoon geen plaats.
      }
    }),
  );
  return results;
}
