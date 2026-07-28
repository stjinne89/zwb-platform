import { normalizePowerCurvePoints } from "@/lib/intervals/power-curve";
import { POWER_DURATIONS } from "@/lib/teams/power-profile";
import type { ComparisonRider, PowerCurvePoint } from "@/components/charts/power-curve-chart";

/** Kolommen die `comparisonRidersFromRows` verwacht. */
export const COMPARISON_RIDER_COLUMNS =
  "profile_id, rider_type, weight_kg, watts_15s, watts_30s, watts_1m, watts_2m, watts_5m, watts_10m, watts_20m, curve_points, profiles(display_name)";

/** Zelfde kolommen zonder curve_points, voor databases zonder die migratie. */
export const COMPARISON_RIDER_COLUMNS_LEGACY =
  "profile_id, rider_type, weight_kg, watts_15s, watts_30s, watts_1m, watts_2m, watts_5m, watts_10m, watts_20m, profiles(display_name)";

type PowerProfileRow = {
  profile_id: string;
  rider_type: string | null;
  weight_kg: number | string | null;
  watts_15s: number | null;
  watts_30s: number | null;
  watts_1m: number | null;
  watts_2m: number | null;
  watts_5m: number | null;
  watts_10m: number | null;
  watts_20m: number | null;
  curve_points?: unknown;
  profiles: { display_name: string | null } | Array<{ display_name: string | null }> | null;
};

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function profileName(profiles: PowerProfileRow["profiles"]) {
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  return profile?.display_name ?? "ZWB-lid";
}

/** Terugval op de zeven vaste duurtijden als er geen volledige curve is. */
function fixedPoints(row: PowerProfileRow): PowerCurvePoint[] {
  const values = [
    row.watts_15s,
    row.watts_30s,
    row.watts_1m,
    row.watts_2m,
    row.watts_5m,
    row.watts_10m,
    row.watts_20m,
  ];
  return POWER_DURATIONS.flatMap((duration, index) => {
    const watts = numberOrNull(values[index]);
    return watts == null ? [] : [{ seconds: duration.seconds, watts }];
  });
}

function storedCurvePoints(row: PowerProfileRow) {
  if (!Array.isArray(row.curve_points)) return [];
  const points = row.curve_points.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const point = value as Record<string, unknown>;
    const seconds = Number(point.seconds);
    const watts = Number(point.watts);
    const wattsPerKg = Number(point.wattsPerKg);
    if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(watts) || watts <= 0) {
      return [];
    }
    return [
      {
        seconds,
        watts,
        wattsPerKg: Number.isFinite(wattsPerKg) && wattsPerKg > 0 ? wattsPerKg : null,
      },
    ];
  });
  return normalizePowerCurvePoints(points);
}

/** Houdt de curve hanteerbaar voor de SVG zonder de vorm te verliezen. */
export function downsample(points: PowerCurvePoint[], limit = 260) {
  if (points.length <= limit) return points;
  const result: PowerCurvePoint[] = [];
  for (let index = 0; index < limit; index += 1) {
    const position = Math.round((index / (limit - 1)) * (points.length - 1));
    const point = points[position];
    if (!result.length || result[result.length - 1].seconds !== point.seconds) result.push(point);
  }
  return result;
}

/** Rijen uit `rider_power_profiles` omzetten naar vergelijkbare curves. */
export function comparisonRidersFromRows(rows: unknown[] | null): ComparisonRider[] {
  return ((rows ?? []) as unknown as PowerProfileRow[])
    .map((row) => {
      const storedPoints = storedCurvePoints(row);
      return {
        id: row.profile_id,
        name: profileName(row.profiles),
        riderType: row.rider_type,
        weightKg: numberOrNull(row.weight_kg),
        points: downsample(storedPoints.length >= 3 ? storedPoints : fixedPoints(row)),
        hasFullCurve: storedPoints.length >= 3,
      };
    })
    .filter((rider) => rider.points.length >= 3)
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
}
