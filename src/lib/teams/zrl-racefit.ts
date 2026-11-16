// Racefit in de ZRL-teamindeling (2026-11-16): één W/kg per renner op het
// parcours van de race van die week, met het parcoursmodel van de Club Ladder.
//
// - Gewicht per duur: `zwiftRouteDemand` (15 s, 1, 5 en 20 minuten, met de
//   rondes en de klimmen van de route). Bij een tijdrit (Time Trial, TTT, Race
//   of Truth in de titel) schuift het naar 5 en 20 minuten, zonder sprint.
// - Per renner het 90-dagenvermogen (ZwiftRacing `power_wkg`), met gewicht
//   omgerekend naar 75 kg op de hellingen waar elke duur telt (`routeWkg`, zoals
//   de ladder); zonder gewicht gewoon W/kg.
// - Daarover een meetkundig gemiddelde, gewogen naar het parcours. Ontbreekt een
//   duur, dan telt het gewicht over de duren die er wel zijn, tegenover het
//   gemiddelde van de lijst per duur (zoals `strengths` in rank-pairs.ts), zodat
//   een ontbrekende 15 s niet als zwak of sterk telt. Met alle vier de duren is
//   het precies het gewogen meetkundig gemiddelde van de eigen waarden.
// - Geleend (2026-11-16): heeft de race van een subteam nog geen route, omdat
//   hij nog niet aan zijn Zwift-event hangt, dan geldt de route van een race in
//   dezelfde week en dezelfde categorie (bijvoorbeeld Zwiftladies B voor B1).
//   Nooit uit een andere categorie: WTRL laat A/B soms een andere route rijden
//   dan C/D. Of het een tijdrit is, volgt de eigen titel.

import { zwiftRouteDemand, type DurationTerrain, type DurationWeights } from "@/lib/club-ladder/routes";
import { routeWkg } from "@/lib/club-ladder/rider-weight";
import { DURATIONS, type PowerWkg } from "@/lib/club-ladder/team-power";

export type RaceCourse = {
  key: string;
  name: string;
  laps: number;
  timeTrial: boolean;
  weights: DurationWeights;
  terrain: DurationTerrain;
  /** Het team waarvan de route geleend is; null bij de eigen route. */
  borrowedFrom: string | null;
};

/** Een race van een subteam in een raceweek. */
export type TeamRace = {
  teamId: string;
  title: string;
  zwiftRouteId: number | null;
  laps: number | null;
  /** Categorieletter van het team (B voor B1 en Bdev); zonder categorie leent hij niets. */
  category?: string | null;
};

/** Een race van een ander team in dezelfde week, om de route van te lenen als de categorie klopt. */
export type BorrowRace = { source: string; category: string | null; zwiftRouteId: number | null; laps: number | null };

export type WeekCourses = {
  courses: Record<string, RaceCourse>;
  /** Per subteam de route van zijn race. */
  teamCourse: Record<string, string>;
  /** De route die de meeste teams rijden, voor wie nog niet is ingedeeld. */
  defaultCourse: string | null;
};

export function isTimeTrialTitle(title: string) {
  return /time\s*trial|\bTTT\b|race of truth/i.test(title);
}

/**
 * Bij een tijdrit valt de sprint weg en telt 1 minuut half; dat gewicht gaat
 * gelijk naar 5 en 20 minuten. Het klimmen blijft zoals het parcours het vraagt.
 */
export function timeTrialWeights(weights: DurationWeights): DurationWeights {
  const freed = weights.s15 + weights.m1 / 2;
  return { s15: 0, m1: weights.m1 / 2, m5: weights.m5 + freed / 2, m20: weights.m20 + freed / 2 };
}

export function courseForRace(race: Omit<TeamRace, "teamId">): RaceCourse | null {
  if (race.zwiftRouteId == null) return null;
  const demand = zwiftRouteDemand(race.zwiftRouteId, race.laps ?? 1);
  if (!demand) return null;
  const timeTrial = isTimeTrialTitle(race.title);
  return {
    key: `${race.zwiftRouteId}:${demand.laps}:${timeTrial ? "tt" : "race"}`,
    name: demand.name,
    laps: demand.laps,
    timeTrial,
    weights: timeTrial ? timeTrialWeights(demand.weights) : demand.weights,
    terrain: demand.terrain,
    borrowedFrom: null,
  };
}

/** De route van de eerste race met een bruikbare route, met de eigen titel voor de tijdrit. */
function borrowedCourse(race: TeamRace, borrow: BorrowRace[]): RaceCourse | null {
  if (!race.category) return null;
  for (const source of borrow) {
    if (source.category !== race.category) continue;
    const course = courseForRace({ title: race.title, zwiftRouteId: source.zwiftRouteId, laps: source.laps });
    if (course) return { ...course, key: `${course.key}:${source.source}`, borrowedFrom: source.source };
  }
  return null;
}

/**
 * De routes van een raceweek per subteam; bij gelijke stand de eerste in de lijst.
 * Zonder eigen route leent een race die uit `borrow` (zelfde week en categorie).
 */
export function weekCourses(races: TeamRace[], borrow: BorrowRace[] = []): WeekCourses {
  const courses: Record<string, RaceCourse> = {};
  const teamCourse: Record<string, string> = {};
  const count = new Map<string, number>();
  for (const race of races) {
    const course = courseForRace(race) ?? borrowedCourse(race, borrow);
    if (!course) continue;
    courses[course.key] ??= course;
    if (teamCourse[race.teamId]) continue;
    teamCourse[race.teamId] = course.key;
    count.set(course.key, (count.get(course.key) ?? 0) + 1);
  }
  let defaultCourse: string | null = null;
  for (const [key, n] of count) if (defaultCourse == null || n > count.get(defaultCourse)!) defaultCourse = key;
  return { courses, teamCourse, defaultCourse };
}

export type RacefitRider = { key: string; wkg: PowerWkg | null; weightKg: number | null };

const validKg = (kg: number | null | undefined): kg is number => kg != null && kg >= 30 && kg <= 200;

/** Racefit per renner op dit parcours; null zonder vermogen. Op 0,01 W/kg. */
export function racefitScores(riders: RacefitRider[], course: RaceCourse): Record<string, number | null> {
  const values = riders.map((rider) => {
    if (!rider.wkg || !DURATIONS.some((d) => (rider.wkg![d] ?? 0) > 0)) return null;
    return validKg(rider.weightKg) ? routeWkg(rider.wkg, rider.weightKg, course.terrain) : rider.wkg;
  });

  // Per duur het gemiddelde (log) van de lijst, en het gewicht over de duren die iemand heeft.
  const reference = new Map<(typeof DURATIONS)[number], number>();
  for (const d of DURATIONS) {
    const logs = values.map((v) => v?.[d]).filter((v): v is number => v != null && v > 0).map(Math.log);
    if (logs.length > 0) reference.set(d, logs.reduce((sum, v) => sum + v, 0) / logs.length);
  }
  let baseWeight = 0;
  let base = 0;
  for (const [d, ref] of reference) {
    base += course.weights[d] * ref;
    baseWeight += course.weights[d];
  }

  const out: Record<string, number | null> = {};
  riders.forEach((rider, index) => {
    const value = values[index];
    let sum = 0;
    let weightSum = 0;
    for (const d of DURATIONS) {
      const v = value?.[d];
      const ref = reference.get(d);
      if (v == null || v <= 0 || ref === undefined || !(course.weights[d] > 0)) continue;
      sum += course.weights[d] * (Math.log(v) - ref);
      weightSum += course.weights[d];
    }
    out[rider.key] =
      weightSum > 0 && baseWeight > 0
        ? Math.round(Math.exp(base / baseWeight + sum / weightSum) * 100) / 100
        : null;
  });
  return out;
}
