// Welke vijf de tegenstander meeneemt: zijn beste sprint-, klim-, punch- of
// overallploeg uit wie de laatste tien ladderraces voor hem reed.
//
// Tot 2026-11-04 rekende het advies met de vijf besten per duur uit al die
// renners, een ploeg die niet bestaat: de beste sprinter en de beste klimmer
// tegelijk. Nu kiezen we vijf echte renners. Per renner een score: zijn W/kg
// per duur (omgerekend naar 75 kg op de helling, zoals in `rider-weight.ts`)
// tegenover het meetkundig gemiddelde van de groep, gewogen per duur.
//
// Overall is het gemiddelde over alle ladderparcoursen, met hun eigen weging.
// Sprint, Klim en Punch hebben een vast profiel (eigen vuistregel, vraag van de
// eigenaar). Niet de routetypes: die geven ook bergop nog een derde aan 15 s en
// 1 min, waardoor een "klimploeg" uit sprinters bestond.

import { averageWeight, MIN_WEIGHTS, routeWkg } from "./rider-weight";
import { ladderRouteOptions, type DurationTerrain, type DurationWeights } from "./routes";
import { DURATIONS, sameTeam, type PowerWkg, type StoredMatch } from "./team-power";

export type SquadFocus = "overall" | "sprint" | "klim" | "punch";
export const SQUAD_FOCUSES: SquadFocus[] = ["overall", "sprint", "klim", "punch"];
export const SQUAD_FOCUS_LABELS: Record<SquadFocus, string> = { overall: "Overall", sprint: "Sprint", klim: "Klim", punch: "Punch" };

type Profile = { weights: DurationWeights; terrain: DurationTerrain };

const onSlope = (pct: number): DurationTerrain => ({
  s15: [{ pct, share: 1 }],
  m1: [{ pct, share: 1 }],
  m5: [{ pct, share: 1 }],
  m20: [{ pct, share: 1 }],
});

/** Sprint op het vlakke, punch en klim op 6%. */
const PROFILES: Record<Exclude<SquadFocus, "overall">, Profile> = {
  sprint: { weights: { s15: 0.6, m1: 0.3, m5: 0.1, m20: 0 }, terrain: onSlope(0) },
  punch: { weights: { s15: 0.2, m1: 0.5, m5: 0.3, m20: 0 }, terrain: onSlope(6) },
  klim: { weights: { s15: 0, m1: 0.1, m5: 0.4, m20: 0.5 }, terrain: onSlope(6) },
};

/** Zoveel recente ladderraces van de tegenstander tellen. */
export const RECENT_RACES = 10;
const SQUAD_SIZE = 5;
/** Score van een renner zonder bruikbaar vermogen: altijd achteraan, zonder NaN in de sortering. */
const NO_SCORE = -1e9;

export type RecentRider = { zwiftId: number; name: string; races: number };
export type RecentSquad = { riders: RecentRider[]; races: number };

/**
 * Wie de laatste `limit` ladderraces voor dit team reed, en in hoeveel ervan.
 * De naam uit de nieuwste race. Alleen races waarvan we de renners hebben.
 */
export function recentTeamRiders(matches: StoredMatch[], team: string, limit = RECENT_RACES): RecentSquad {
  const own = matches
    .filter((match) => (sameTeam(match.challenger, team) || sameTeam(match.opponent, team)) && match.riders.some((rider) => sameTeam(rider.team, team)))
    .sort((a, b) => b.racedOn.localeCompare(a.racedOn) || b.resultId - a.resultId)
    .slice(0, limit);
  const riders = new Map<number, RecentRider>();
  for (const match of own) {
    const seen = new Set<number>();
    for (const rider of match.riders) {
      if (!rider.zwiftId || !sameTeam(rider.team, team) || seen.has(rider.zwiftId)) continue;
      seen.add(rider.zwiftId);
      const known = riders.get(rider.zwiftId);
      if (known) known.races += 1;
      else riders.set(rider.zwiftId, { zwiftId: rider.zwiftId, name: rider.name, races: 1 });
    }
  }
  return {
    riders: [...riders.values()].sort((a, b) => b.races - a.races || a.name.localeCompare(b.name, "nl")),
    races: own.length,
  };
}

export type PoolRider = { zwiftId: number; name: string; races: number; wkg: PowerWkg; weightKg: number | null };

const validKg = (kg: number | null) => kg != null && kg >= 30 && kg <= 200;

/** Score per renner voor dit type parcours; 0 is gemiddeld voor deze groep. */
export function focusScores(pool: PoolRider[], focus: SquadFocus, options: Profile[] = ladderRouteOptions()): Map<number, number> {
  const routes = focus === "overall" ? options : [PROFILES[focus]];
  const useWeight = pool.filter((rider) => validKg(rider.weightKg)).length >= MIN_WEIGHTS;
  const fallback = averageWeight(pool);
  const sums = new Map<number, { total: number; routes: number }>(pool.map((rider) => [rider.zwiftId, { total: 0, routes: 0 }]));
  for (const route of routes) {
    const values = pool.map((rider) => {
      const kg = validKg(rider.weightKg) ? rider.weightKg! : fallback;
      return useWeight && kg ? routeWkg(rider.wkg, kg, route.terrain) : rider.wkg;
    });
    const reference = DURATIONS.map((d) => {
      const logs = values.map((v) => v[d]).filter((v): v is number => v != null && v > 0).map(Math.log);
      return logs.length ? logs.reduce((a, b) => a + b, 0) / logs.length : null;
    });
    pool.forEach((rider, index) => {
      let sum = 0;
      let weightSum = 0;
      DURATIONS.forEach((d, i) => {
        const value = values[index][d];
        const ref = reference[i];
        if (value == null || value <= 0 || ref == null || !route.weights[d]) return;
        sum += route.weights[d] * (Math.log(value) - ref);
        weightSum += route.weights[d];
      });
      if (weightSum > 0) {
        const entry = sums.get(rider.zwiftId)!;
        entry.total += sum / weightSum;
        entry.routes += 1;
      }
    });
  }
  return new Map([...sums].map(([id, { total, routes }]) => [id, routes > 0 ? total / routes : NO_SCORE]));
}

/** De vijf met de hoogste score voor dit type; bij gelijke score wie vaker reed. */
export function pickFive(pool: PoolRider[], focus: SquadFocus, options?: Profile[]): PoolRider[] {
  const scores = focusScores(pool, focus, options);
  return [...pool]
    .sort(
      (a, b) =>
        (scores.get(b.zwiftId) ?? NO_SCORE) - (scores.get(a.zwiftId) ?? NO_SCORE) ||
        b.races - a.races ||
        a.name.localeCompare(b.name, "nl"),
    )
    .slice(0, SQUAD_SIZE);
}
