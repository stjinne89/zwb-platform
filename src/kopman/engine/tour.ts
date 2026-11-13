// Stage races (docs/kopman-breder.md, built 2026-11-13): a tour is one slot in
// a calendar, ridden stage by stage. Every team keeps the same five riders for
// the whole tour, kracht carries over from stage to stage, and three
// classifications run alongside: time, points and mountains.
import { cardById } from "./cards";
import { buildCourse, courseWeights, fitFor } from "./course";
import type { Placing } from "./race";
import { rivalsIn } from "./teams";
import { raceById, tourById } from "./world";
import { PLAYER_TEAM, type TourDef } from "./types";

/** Seconds off the time of the first three of a stage. */
export const BONUS_SECONDS = [10, 6, 4];
/** Points classification per stage place; a flat stage counts double. */
export const STAGE_POINTS = [25, 20, 16, 14, 12, 10, 8, 6, 4, 2];
/** Mountains classification per stage place; a mountain stage counts double, a hilly one once, others not. */
export const KOM_POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
/** Share of the missing kracht a rider gets back overnight; the fysio adds his bonus for your riders. */
export const TOUR_RECOVERY = 0.5;
/** A rider who does not finish a stage loses this much on the last finisher. */
export const DNF_PENALTY = 300;

export type TourState = {
  /** Stages ridden so far. */
  stage: number;
  /** Your five, fixed at the first stage. */
  riders: string[];
  /** Rider id → team id, for everyone in the tour. */
  team: Record<string, string>;
  time: Record<string, number>;
  points: Record<string, number>;
  kom: Record<string, number>;
  /** Kracht at the end of the last stage. */
  kracht: Record<string, number>;
  /** What the stages so far brought you. */
  coins: number;
  seasonPoints: number;
};

export const tourOf = (id: string): TourDef | undefined => tourById.get(id);

export function newTour(): TourState {
  return { stage: 0, riders: [], team: {}, time: {}, points: {}, kom: {}, kracht: {}, coins: 0, seasonPoints: 0 };
}

/** How a stage counts for the points and the mountains. */
export function stageWeights(raceId: string) {
  const def = raceById.get(raceId)!;
  const course = buildCourse(def);
  const climbs = course.features.filter((f) => f.kind === "klim").length;
  return { points: !course.tt && climbs === 0 ? 2 : 1, kom: course.tt ? 0 : def.kind === "rit" ? 2 : climbs ? 1 : 0 };
}

/**
 * The five every rival team rides the tour with: its best over all stages,
 * without the riders you start with.
 */
export function tourRivals(tour: TourDef, mine: string[]): Record<string, string[]> {
  const weights = tour.stages.map((id) => courseWeights(buildCourse(raceById.get(id)!)));
  const taken = new Set(mine);
  return Object.fromEntries(rivalsIn(tour.stages[0]).map((t) => {
    const ranked = t.riders.filter((id) => !taken.has(id)).map((id) => ({ id, fit: weights.reduce((sum, w) => sum + fitFor(cardById(id), w), 0) }));
    ranked.sort((a, b) => b.fit - a.fit || a.id.localeCompare(b.id));
    return [t.id, ranked.slice(0, 5).map((x) => x.id)];
  }));
}

/** Adds a stage to the classifications; `kracht` is what everyone ended it with. */
export function bookStage(tour: TourState, raceId: string, placings: Placing[], kracht: Record<string, number>): TourState {
  const w = stageWeights(raceId);
  const last = Math.max(0, ...placings.filter((p) => p.place > 0).map((p) => p.time ?? 0));
  const time = { ...tour.time }, points = { ...tour.points }, kom = { ...tour.kom }, team = { ...tour.team };
  for (const p of placings) {
    team[p.id] = p.team;
    const done = p.place > 0 && p.time !== null;
    time[p.id] = (time[p.id] ?? 0) + (done ? p.time! - (BONUS_SECONDS[p.place - 1] ?? 0) : last + DNF_PENALTY);
    if (p.place >= 1) {
      points[p.id] = (points[p.id] ?? 0) + (STAGE_POINTS[p.place - 1] ?? 0) * w.points;
      kom[p.id] = (kom[p.id] ?? 0) + (KOM_POINTS[p.place - 1] ?? 0) * w.kom;
    }
  }
  const riders = tour.riders.length ? tour.riders : placings.filter((p) => p.team === PLAYER_TEAM).map((p) => p.id);
  return { ...tour, stage: tour.stage + 1, riders, team, time, points, kom, kracht: { ...kracht } };
}

export type GcRow = { id: string; team: string; time: number; gap: number };

/** The general classification: lowest time first. */
export function generalOf(tour: TourState): GcRow[] {
  const rows = Object.entries(tour.time).map(([id, time]) => ({ id, team: tour.team[id] ?? "", time }));
  rows.sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  const best = rows[0]?.time ?? 0;
  return rows.map((r) => ({ ...r, gap: r.time - best }));
}

/** The leader of a points table, ties going to the better time; none without points. */
function leaderOf(table: Record<string, number>, tour: TourState): string | null {
  const order = new Map(generalOf(tour).map((r, i) => [r.id, i]));
  const rows = Object.entries(table).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0));
  return rows[0]?.[0] ?? null;
}

export type Jerseys = { geel: string | null; groen: string | null; berg: string | null };

export function jerseysOf(tour: TourState): Jerseys {
  return { geel: generalOf(tour)[0]?.id ?? null, groen: leaderOf(tour.points, tour), berg: leaderOf(tour.kom, tour) };
}
