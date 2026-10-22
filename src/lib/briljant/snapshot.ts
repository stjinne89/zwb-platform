// Van verzamelde waarden naar de rij in zwbriljant_snapshots (0265), plus de
// weken voor de consistentie en de terugblik uit intervals.icu. Puur: de server
// levert de waarden aan.
//
// In de rij komen alleen niveaus, de score en de consistentie; welke bronnen er
// waren staat als ja/nee in `provenance`. Nooit watt, W/kg, gewicht, CTL of ZRS.

import { wattsAtDuration } from "@/lib/teams/power-profile";
import { SCALE_VERSION } from "./norms";
import {
  consistencyFrom,
  facetLevels,
  scoreFor,
  type BriljantInput,
  type ConsistencyInput,
  type ConsistencyWeek,
  type FatigueInput,
  type Facet,
} from "./score";

export type BriljantSources = {
  /** Met welke schalen dit is gerekend (`SCALE_VERSION`). */
  scale: string;
  power: boolean;
  fatigue: boolean;
  ctl: boolean;
  zrs: boolean;
  rides: boolean;
  /** Bij een terugblik: over welke periode die is gemaakt ("alles" = de hele historie). */
  terugblik?: string;
  /**
   * Bij een terugblik, racen: "historie" is de ZRS van toen (uit de laatste race tot
   * het maandeinde), "geen" is gezocht maar niet gevonden (dan blijft de ZRS van nu).
   * Ontbreekt het, dan zoekt de wekelijkse job nog.
   */
  racen?: "historie" | "geen";
  /**
   * Bij een weeksnapshot: of de wellness uit intervals.icu binnenkwam. False laat de
   * wekelijkse job het opnieuw proberen; ontbreekt het (van vóór 2026-10-22) en is
   * fitheid leeg bij een lid met intervals.icu, dan ook.
   */
  wellness?: boolean;
};

export type SnapshotRow = {
  profile_id: string;
  week: string;
  score: number | null;
  facets: Partial<Record<Facet, number | null>>;
  consistency: number | null;
  source: "week" | "terugblik";
  provenance: BriljantSources;
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

/**
 * De beste minuut, vers en na elke vermoeide drempel; durabilityDecline kiest daar
 * de laagste stand uit (eigenaar, 2026-10-22). De minuut (eigenaar, 2026-10-21): korte
 * inspanningen rijd je na veel werk vaak, een volle 20 minuten bijna nooit, dus die
 * zeiden vooral dat je niet voluit reed, niet dat je inzakte.
 */
export function fatigueInputs(
  fresh: CurvePoint[],
  curves: Array<{ afterKj: number; points: CurvePoint[] }>,
): FatigueInput[] {
  return curves.flatMap((curve) => {
    for (const seconds of [60]) {
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
  input: BriljantInput;
  consistency: ConsistencyInput | null;
}): SnapshotRow {
  const facets = facetLevels(args.input);
  const consistency = args.consistency ? (consistencyFrom(args.consistency)?.value ?? null) : null;
  const sources: BriljantSources = {
    scale: SCALE_VERSION,
    power: facets.sprint != null || facets.anaeroob != null || facets.vo2max != null || facets.drempel != null,
    fatigue: facets.durability != null,
    ctl: facets.fitheid != null,
    zrs: facets.racen != null,
    rides: (args.consistency?.weeks ?? []).some((week) => week.hours > 0),
  };
  return {
    profile_id: args.profileId,
    week: mondayKey(args.day),
    score: scoreFor(facets, consistency),
    facets: Object.fromEntries(Object.entries(facets).map(([facet, level]) => [facet, round2(level)])),
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
  intensity?: string | null;
};

/**
 * Geschatte intensity factor van een geplande training naar zijn soort, voor de
 * geplande TSS (uren × IF² × 100). Een gemiddelde over de hele training, met
 * warming-up en herstel; een inschatting van ZWB, het schema kent geen TSS.
 */
const PLANNED_IF: Record<string, number> = {
  recovery: 0.55,
  endurance: 0.68,
  tempo: 0.78,
  threshold: 0.85,
  vo2max: 0.82,
  anaerobic: 0.78,
  race: 0.9,
};

/** De geschatte TSS van een geplande training. */
export function plannedTss(workout: Pick<PlannedWorkout, "minutes" | "intensity">): number {
  const factor = PLANNED_IF[workout.intensity ?? ""] ?? PLANNED_IF.endurance;
  return (Math.max(0, workout.minutes) / 60) * factor * factor * 100;
}

/**
 * Een geplande week is een herstelweek als hij onder dit deel van de geplande
 * week ervoor zakt; de bovengrens van "grofweg 60-70%" uit schema-check.ts.
 */
export const RECOVERY_WEEK_SHARE = 0.75;

/**
 * De afgesloten weken vóór de week van `day` (precies `count`), oud naar nieuw:
 * gereden uren, de geplande trainingstijd (de norm van die week) en of het schema
 * er een herstelweek van maakte.
 */
export function consistencyWeeks(
  rides: RideDay[],
  planned: PlannedWorkout[],
  day: string,
  count: number,
  /** TSS per dag uit intervals.icu; leeg of weggelaten zonder intervals.icu. */
  loads?: Map<string, number>,
): ConsistencyWeek[] {
  const current = mondayKey(day);
  const mondays = Array.from({ length: count }, (_, index) => shiftDay(current, -7 * (count - index)));
  const hours = new Map<string, number>();
  for (const ride of rides) {
    const monday = mondayKey(ride.day);
    hours.set(monday, (hours.get(monday) ?? 0) + Math.max(0, ride.minutes) / 60);
  }
  const plannedMinutes = new Map<string, number>();
  const plannedLoad = new Map<string, number>();
  for (const workout of planned) {
    const monday = mondayKey(workout.day);
    plannedMinutes.set(monday, (plannedMinutes.get(monday) ?? 0) + Math.max(0, workout.minutes));
    plannedLoad.set(monday, (plannedLoad.get(monday) ?? 0) + plannedTss(workout));
  }
  const weekLoad = new Map<string, number>();
  const firstLoadDay = loads && loads.size > 0 ? [...loads.keys()].sort()[0] : null;
  for (const [loadDay, load] of loads ?? []) {
    const monday = mondayKey(loadDay);
    weekLoad.set(monday, (weekLoad.get(monday) ?? 0) + Math.max(0, load));
  }
  return mondays.map((monday) => {
    const plan = plannedMinutes.get(monday) ?? 0;
    const before = plannedMinutes.get(shiftDay(monday, -7)) ?? 0;
    return {
      monday,
      hours: Math.round((hours.get(monday) ?? 0) * 100) / 100,
      plannedHours: plan > 0 ? Math.round((plan / 60) * 100) / 100 : null,
      plannedRecovery: plan > 0 && before > 0 && plan < RECOVERY_WEEK_SHARE * before,
      // Vanaf de eerste dag met belasting in intervals.icu; een week zonder is 0 TSS.
      load: firstLoadDay && shiftDay(monday, 6) >= firstLoadDay ? Math.round(weekLoad.get(monday) ?? 0) : null,
      plannedLoad: plan > 0 ? Math.round(plannedLoad.get(monday) ?? 0) : null,
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

/** W/kg per duur uit een curve, met het gewicht als de punten zelf geen W/kg hebben. */
export function powerFromCurve(
  points: Array<{ seconds: number; watts: number; wattsPerKg?: number | null }>,
  weightKg: number | null,
): BriljantInput["power"] {
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

/**
 * Hoeveel hele maanden vóór de maand van `today` de historie teruggaat, vanaf de
 * maand van `firstDay`; hooguit `max`. Nul zonder eerste dag.
 */
export function monthsSince(today: string, firstDay: string | null, max: number): number {
  if (!firstDay) return 0;
  const [todayYear, todayMonth] = today.split("-").map(Number);
  const [firstYear, firstMonth] = firstDay.split("-").map(Number);
  return Math.min(max, Math.max(0, (todayYear - firstYear) * 12 + (todayMonth - firstMonth)));
}

/** Van een terugblik de maanden vanaf de eerste met een score; daarna alles met score of consistentie. */
export function terugblikRows<T extends Pick<SnapshotRow, "score" | "consistency">>(rows: T[]): T[] {
  const first = rows.findIndex((row) => row.score != null);
  if (first < 0) return [];
  return rows.slice(first).filter((row) => row.score != null || row.consistency != null);
}

/**
 * Het maandeinde bij een terugblikweek: de maandag van de week waarin de maand
 * eindigt ligt in diezelfde maand (hooguit zes dagen ervoor), dus de laatste dag
 * van de maand van die maandag.
 */
export function monthEndOfWeek(week: string): string {
  const [year, month] = week.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/**
 * Welke races de ZRS op een maandeinde geven, in volgorde van proberen: om en om de
 * laatste race tot het maandeinde (de score erna) en de eerste erna (de score
 * ervoor), dan de race daarvoor en die daarna. `races` staat nieuw naar oud.
 */
export function raceCandidates<T extends { day: string }>(
  races: T[],
  monthEnd: string,
  tries: number,
): Array<{ race: T; use: "before" | "after" }> {
  const before = races.filter((race) => race.day <= monthEnd);
  const after = races.filter((race) => race.day > monthEnd).reverse();
  const out: Array<{ race: T; use: "before" | "after" }> = [];
  for (let index = 0; out.length < tries && (index < before.length || index < after.length); index++) {
    if (before[index]) out.push({ race: before[index], use: "after" });
    if (after[index] && out.length < tries) out.push({ race: after[index], use: "before" });
  }
  return out;
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
