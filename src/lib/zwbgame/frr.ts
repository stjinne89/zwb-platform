import { pickOpponents, standings } from "./engine";
import { climbingShare, elevationAt } from "./routes";
import type { FrrStageKind, GameAccent, GameRider, GameRoute, RaceConfig, RaceState } from "./types";

/**
 * FRR tour rules (flammerougeracing.com/tour-rules, read 28 September 2026):
 * - GC: the lowest summed eGAP, the time behind the stage winner. Only riders who
 *   finish every stage are classified.
 * - Finish points on stage position, 25-20-16-13-11-10-9-8-7-6 for the top ten;
 *   a time trial doubles them.
 * - Segment points on the fastest time only (no FAL), multiplied by the climb's
 *   difficulty (CDR 1–5: ×1 to ×5) or the stage's sprint rating (SSR 1–5:
 *   ×1, ×1,1, ×1,3, ×1,5, ×1,7).
 * - Jerseys: GC, green (sprint points), polka (climb points), blue (all points).
 * - Broom wagon: finishing outside the stage cut costs 20 points on the tour total.
 * Our own choices, because FRR's tables are images that no longer load on its
 * site: points below tenth (5-4-3-2-1, then 1 for every finisher), the same scale
 * for segments (top fifteen), CDR from the climb's height gain, SSR from the stage
 * profile, and a broom wagon cut of 20 %.
 */
export const FINISH_POINTS = [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export const SSR_MULTIPLIERS = [1, 1.1, 1.3, 1.5, 1.7];
export const BROOM_PENALTY = 20;
export const BROOM_CUT = 0.2;
export const TOUR_STAGES = 4;

export type FrrStage = { routeId: string; kind: FrrStageKind; ssr: number };
/** One stage, per rider in tour-field order. Times are race seconds; null did not finish. */
export type FrrStageResult = { times: (number | null)[]; finish: number[]; sprint: number[]; climb: number[]; broom: boolean[] };
export type FrrTour = { version: 1; seed: number; field: string[]; stages: FrrStage[]; results: FrrStageResult[] };

/** Climb difficulty from the height gained: our own scale of FRR's CDR 1–5. */
export function climbRating(route: GameRoute, accent: GameAccent) {
  const gain = elevationAt(route, accent.end) - elevationAt(route, accent.start);
  return gain < 30 ? 1 : gain < 60 ? 2 : gain < 120 ? 3 : gain < 250 ? 4 : 5;
}
/** Sprint rating per stage: a flat stage is one for the sprinters. */
const sprintRating = (route: GameRoute, kind: FrrStageKind) => (kind === "road" && climbingShare(route) < 0.004 ? 3 : 1);

/**
 * Four stages from the courses there are: a flat opener, a hilly stage, a time trial
 * on the flattest remaining course and a final stage. Routes repeat only when the
 * library has fewer than four.
 */
export function planTour(routes: GameRoute[], seed: number): FrrStage[] {
  if (!routes.length) return [];
  const byClimb = [...routes].sort((a, b) => climbingShare(a) - climbingShare(b) || a.id.localeCompare(b.id));
  const used = new Set<string>();
  const take = (list: GameRoute[]) => { const route = list.find((r) => !used.has(r.id)) ?? list[0]; used.add(route.id); return route; };
  const flat = take(byClimb), hilly = take([...byClimb].reverse());
  const tt = take(byClimb);
  const rest = routes.filter((r) => !used.has(r.id));
  const final = rest.length ? rest[seed % rest.length] : routes[seed % routes.length];
  return ([[flat, "road"], [hilly, "road"], [tt, "itt"], [final, "road"]] as const)
    .map(([route, kind]) => ({ routeId: route.id, kind, ssr: sprintRating(route, kind) }));
}
/** A new tour: the same field of riders around your level for every stage. */
export function newTour(roster: GameRider[], playerId: string, routes: GameRoute[], seed: number): FrrTour {
  const player = roster.find((r) => r.id === playerId);
  if (!player) throw new Error("Je renner ontbreekt.");
  const field = [playerId, ...pickOpponents({ seed }, roster, player).map((r) => r.id)];
  return { version: 1, seed, field, stages: planTour(routes, seed), results: [] };
}
export function stageConfig(tour: FrrTour, playerId: string): RaceConfig | null {
  const index = tour.results.length;
  const stage = tour.stages[index];
  if (!stage) return null;
  return { mode: "frr", routeId: stage.routeId, seed: (tour.seed + index * 7919) >>> 0, playerId, field: tour.field, stage: { index, kind: stage.kind } };
}

/** Points and times of one finished stage, in tour-field order. */
export function scoreStage(state: RaceState, tour: FrrTour): FrrStageResult {
  const stage = tour.stages[state.config.stage?.index ?? -1];
  if (!stage) throw new Error("Deze etappe hoort niet bij de tour.");
  const index = new Map(state.riders.map((r, i) => [r.rider.id, i]));
  const at = (id: string) => state.riders[index.get(id)!];
  const times = tour.field.map((id) => at(id)?.finishTime ?? null);
  const finish = tour.field.map(() => 0), sprint = tour.field.map(() => 0), climb = tour.field.map(() => 0);
  const double = stage.kind === "itt" ? 2 : 1;
  standings(state).filter((r) => r.finishTime !== null).forEach((r, place) => {
    finish[tour.field.indexOf(r.rider.id)] = (FINISH_POINTS[place] ?? 1) * double;
  });
  state.route.accents.forEach((accent, a) => {
    if (!accent.banner) return;
    const multiplier = accent.kind === "climb" ? climbRating(state.route, accent) : SSR_MULTIPLIERS[stage.ssr - 1];
    // Every passage of a segment scores on its own, also on a later lap.
    const passes = state.passes.filter((p) => p.a === a && p.e !== null).map((p) => ({ id: state.riders[p.r].rider.id, time: p.e! - p.s }));
    const laps = Math.max(...[0, ...tour.field.map((id) => passes.filter((p) => p.id === id).length)]);
    for (let lap = 0; lap < laps; lap++) {
      const lapPasses = tour.field.flatMap((id) => { const mine = passes.filter((p) => p.id === id)[lap]; return mine ? [mine] : []; })
        .sort((x, y) => x.time - y.time || x.id.localeCompare(y.id));
      lapPasses.slice(0, FINISH_POINTS.length).forEach((p, place) => {
        const points = Math.round(FINISH_POINTS[place] * multiplier);
        (accent.kind === "climb" ? climb : sprint)[tour.field.indexOf(p.id)] += points;
      });
    }
  });
  const winner = Math.min(...times.filter((t): t is number => t !== null));
  const broom = times.map((t) => t !== null && t > winner * (1 + BROOM_CUT));
  return { times, finish, sprint, climb, broom };
}

export type TourRider = { id: string; complete: boolean; gap: number; finish: number; sprint: number; climb: number; total: number; brooms: number };
/** Standings after the stages ridden: only riders who finished them all are classified. */
export function tourStandings(tour: FrrTour) {
  const riders: TourRider[] = tour.field.map((id, i) => {
    let gap = 0, finish = 0, sprint = 0, climb = 0, brooms = 0, complete = true;
    for (const stage of tour.results) {
      const winner = Math.min(...stage.times.filter((t): t is number => t !== null));
      const time = stage.times[i];
      if (time === null) complete = false; else gap += time - winner;
      finish += stage.finish[i]; sprint += stage.sprint[i]; climb += stage.climb[i]; brooms += stage.broom[i] ? 1 : 0;
    }
    return { id, complete, gap, finish, sprint, climb, brooms, total: finish + sprint + climb - brooms * BROOM_PENALTY };
  });
  const classified = riders.filter((r) => r.complete);
  const by = (key: (r: TourRider) => number, low = false) => [...classified].sort((a, b) => (low ? key(a) - key(b) : key(b) - key(a)) || a.id.localeCompare(b.id));
  return {
    riders,
    gc: by((r) => r.gap, true),
    // A points jersey needs points: at 0 for everyone nobody wears it.
    green: by((r) => r.sprint).filter((r) => r.sprint > 0),
    polka: by((r) => r.climb).filter((r) => r.climb > 0),
    blue: by((r) => r.total),
  };
}
export const tourDone = (tour: FrrTour) => tour.results.length >= tour.stages.length;
