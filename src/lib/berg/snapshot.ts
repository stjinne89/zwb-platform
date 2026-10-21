// Van verzamelde waarden naar de rij in zwbeter_berg_snapshots (0265), plus de
// weken voor de consistentie en de terugblik uit intervals.icu. Puur: de server
// levert de waarden aan.
//
// In de rij komen alleen niveaus, de score en de consistentie; welke bronnen er
// waren staat als ja/nee in `provenance`. Nooit watt, W/kg, gewicht, CTL of ZRS.

import { wattsAtDuration } from "@/lib/teams/power-profile";
import {
  consistencyFrom,
  ridgeLevels,
  scoreFor,
  type BergInput,
  type ConsistencyInput,
  type ConsistencyWeek,
  type FatigueInput,
  type Ridge,
} from "./score";

export type BergSources = {
  power: boolean;
  fatigue: boolean;
  ctl: boolean;
  zrs: boolean;
  rides: boolean;
};

export type SnapshotRow = {
  profile_id: string;
  week: string;
  score: number | null;
  ridges: Partial<Record<Ridge, number | null>>;
  consistency: number | null;
  source: "week" | "terugblik";
  provenance: BergSources;
};

export type CurvePoint = { seconds: number; watts: number };

/** Een rit: de dag ("YYYY-MM-DD", Amsterdam) en de minuten. */
export type RideDay = { day: string; minutes: number };

/** Maandag van de week van `day` ("YYYY-MM-DD"). */
export function mondayKey(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** De beste 20 minuten, anders de beste 5: vers en na elke vermoeide drempel. */
export function fatigueInputs(
  fresh: CurvePoint[],
  curves: Array<{ afterKj: number; points: CurvePoint[] }>,
): FatigueInput[] {
  return curves.flatMap((curve) => {
    for (const seconds of [1200, 300]) {
      const freshWatts = wattsAtDuration(fresh, seconds);
      const fatiguedWatts = wattsAtDuration(curve.points, seconds);
      if (freshWatts && fatiguedWatts) return [{ afterKj: curve.afterKj, freshWatts, fatiguedWatts }];
    }
    return [];
  });
}

const round2 = (value: number | null) => (value == null ? null : Math.round(value * 100) / 100);

export function snapshotFrom(args: {
  profileId: string;
  day: string;
  source: SnapshotRow["source"];
  input: BergInput;
  consistency: ConsistencyInput | null;
}): SnapshotRow {
  const ridges = ridgeLevels(args.input);
  const consistency = args.consistency ? (consistencyFrom(args.consistency)?.value ?? null) : null;
  const sources: BergSources = {
    power: ridges.sprint != null || ridges.anaeroob != null || ridges.vo2max != null || ridges.drempel != null,
    fatigue: ridges.durability != null,
    ctl: ridges.fitheid != null,
    zrs: ridges.racen != null,
    rides: (args.consistency?.weeks ?? []).some((week) => week.hours > 0),
  };
  return {
    profile_id: args.profileId,
    week: mondayKey(args.day),
    score: scoreFor(ridges, consistency),
    ridges: Object.fromEntries(Object.entries(ridges).map(([ridge, level]) => [ridge, round2(level)])),
    consistency,
    source: args.source,
    provenance: sources,
  };
}

/** Een geplande training uit het schema. */
export type PlannedWorkout = {
  day: string;
  minutes: number;
  status: "planned" | "completed" | "skipped";
};

/**
 * Een geplande week is een herstelweek als hij onder dit deel van de geplande
 * week ervoor zakt; de bovengrens van "grofweg 60-70%" uit schema-check.ts.
 */
export const RECOVERY_WEEK_SHARE = 0.75;

/**
 * De afgesloten weken vóór de week van `day` (precies `count`), oud naar nieuw:
 * gereden uren en of het schema er een herstelweek van maakte.
 */
export function consistencyWeeks(
  rides: RideDay[],
  planned: PlannedWorkout[],
  day: string,
  count: number,
): ConsistencyWeek[] {
  const current = mondayKey(day);
  const mondays = Array.from({ length: count }, (_, index) => shiftDay(current, -7 * (count - index)));
  const hours = new Map<string, number>();
  for (const ride of rides) {
    const monday = mondayKey(ride.day);
    hours.set(monday, (hours.get(monday) ?? 0) + Math.max(0, ride.minutes) / 60);
  }
  const plannedMinutes = new Map<string, number>();
  for (const workout of planned) {
    const monday = mondayKey(workout.day);
    plannedMinutes.set(monday, (plannedMinutes.get(monday) ?? 0) + Math.max(0, workout.minutes));
  }
  return mondays.map((monday) => {
    const plan = plannedMinutes.get(monday) ?? 0;
    const before = plannedMinutes.get(shiftDay(monday, -7)) ?? 0;
    return {
      monday,
      hours: Math.round((hours.get(monday) ?? 0) * 100) / 100,
      plannedRecovery: plan > 0 && before > 0 && plan < RECOVERY_WEEK_SHARE * before,
    };
  });
}

/**
 * Naleving: het deel van de geplande minuten dat gedaan is, over de afgesloten
 * weken vanaf `from` tot de week van `day`. Null zonder geplande trainingen.
 */
export function complianceFrom(planned: PlannedWorkout[], from: string, day: string): number | null {
  const end = mondayKey(day);
  const due = planned.filter((workout) => workout.day >= from && workout.day < end && workout.minutes > 0);
  const total = due.reduce((sum, workout) => sum + workout.minutes, 0);
  if (total === 0) return null;
  const done = due.filter((workout) => workout.status === "completed").reduce((sum, workout) => sum + workout.minutes, 0);
  return done / total;
}

/** Beschikbaarheid in uren per week uit `training_availability.minutes_by_day`. */
export function availabilityHours(minutesByDay: unknown): number | null {
  if (!minutesByDay || typeof minutesByDay !== "object") return null;
  const total = Object.values(minutesByDay as Record<string, unknown>).reduce<number>((sum, value) => {
    const minutes = Number(value);
    return Number.isFinite(minutes) && minutes > 0 ? sum + minutes : sum;
  }, 0);
  return total > 0 ? total / 60 : null;
}

/** W/kg per duur uit een curve, met het gewicht als de punten zelf geen W/kg hebben. */
export function powerFromCurve(
  points: Array<{ seconds: number; watts: number; wattsPerKg?: number | null }>,
  weightKg: number | null,
): BergInput["power"] {
  if (points.length === 0) return null;
  const at = (seconds: number) => {
    const watts = wattsAtDuration(points, seconds);
    if (!watts) return null;
    const point = points.find((candidate) => candidate.watts === watts);
    if (point?.wattsPerKg && point.wattsPerKg > 0) return point.wattsPerKg;
    return weightKg && weightKg > 0 ? watts / weightKg : null;
  };
  return { s15: at(15), m1: at(60), m5: at(300), m20: at(1200) };
}

/** De laatste dag van elk van de `months` maanden vóór `today`, oud naar nieuw. */
export function monthEnds(today: string, months: number): string[] {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: months }, (_, index) => {
    const offset = months - index;
    // Dag 0 van een maand is de laatste dag van de maand ervoor.
    return new Date(Date.UTC(year, month - offset, 0)).toISOString().slice(0, 10);
  });
}

/** Het datumbereik van intervals.icu voor 90 dagen tot en met `end`. */
export function curveRange(end: string): string {
  return `r.${shiftDay(end, -89)}.${end}`;
}
