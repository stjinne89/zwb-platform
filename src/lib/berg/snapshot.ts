// Van verzamelde waarden naar de rij in zwbeter_berg_snapshots (0265), en de
// terugblik uit intervals.icu. Puur: de server levert de waarden aan.
//
// In de rij komen alleen meters, de hoogte en de consistentie; welke bronnen er
// waren staat als ja/nee in `provenance`. Nooit watt, W/kg, gewicht, CTL of ZRS.

import { wattsAtDuration } from "@/lib/teams/power-profile";
import { consistency, heightFor, ridgeMeters, type BergInput, type FatigueInput, type Ridge, type RideDay } from "./score";

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
  height: number | null;
  ridges: Partial<Record<Ridge, number | null>>;
  consistency: number | null;
  source: "week" | "terugblik";
  provenance: BergSources;
};

export type CurvePoint = { seconds: number; watts: number };

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

const round = (value: number | null) => (value == null ? null : Math.round(value));

export function snapshotFrom(args: {
  profileId: string;
  day: string;
  source: SnapshotRow["source"];
  input: BergInput;
  rides: RideDay[] | null;
}): SnapshotRow {
  const ridges = ridgeMeters(args.input);
  const sources: BergSources = {
    power: ridges.explosief != null || ridges.duurvermogen != null,
    fatigue: ridges.durability != null,
    ctl: ridges.fitheid != null,
    zrs: ridges.racen != null,
    rides: args.rides != null && args.rides.length > 0,
  };
  return {
    profile_id: args.profileId,
    week: mondayKey(args.day),
    height: heightFor(ridges),
    ridges: Object.fromEntries(Object.entries(ridges).map(([ridge, meters]) => [ridge, round(meters)])),
    consistency: args.rides == null ? null : consistency(args.rides, args.day),
    source: args.source,
    provenance: sources,
  };
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
