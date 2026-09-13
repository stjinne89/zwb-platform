import { normalizePowerCurvePoints } from "@/lib/intervals/power-curve";
import { AIR_DENSITY, DEFAULT_CDA, DEFAULT_CRR, DEFAULT_EQUIPMENT_KG, DRIVETRAIN_EFF, G } from "@/lib/ride-estimate";

export type SegmentTarget = "record" | "podium";
export type SegmentStatus = "likely" | "borderline" | "unreachable" | "unknown";
export type TrackPoint = { lat: number; lon: number; distance: number; altitude: number };
export type SegmentResult = { profileId: string; name: string; seconds: number; rank: number };
/** club = tijd van een ander lid; own = eigen PR, alleen als er geen clubdoel is. */
export type TargetKind = "club" | "own";
export type SegmentAssessment = { status: SegmentStatus; reason: string | null; targetSeconds: number | null; targetKind?: TargetKind | null; fastSeconds: number | null; slowSeconds: number | null };
export type SegmentItem = {
  id: string; name: string; distance: number | null; grade: number | null;
  start: [number, number] | null; line: [number, number][];
  riders: number; mine: number | null; rank: number | null; record: number | null;
  updatedAt: string | null; assessment: SegmentAssessment;
};
export type SegmentDetail = SegmentItem & { leaderboard: SegmentResult[]; hazardous: boolean };
export type MapCluster = { lat: number; lon: number; count: number };
export type SegmentPage = { items: SegmentItem[]; nextOffset: number | null; clusters: MapCluster[] };
export const STATUS_LABELS: Record<SegmentStatus, string> = {
  likely: "Kansrijk", borderline: "Op de grens", unreachable: "Buiten bereik", unknown: "Onvoldoende gegevens",
};

export function leaderboard(rows: Array<{ profileId: string; name: string; seconds: number }>): SegmentResult[] {
  const best = new Map<string, { profileId: string; name: string; seconds: number }>();
  for (const row of rows) {
    if (!Number.isFinite(row.seconds) || row.seconds <= 0) continue;
    if (!best.has(row.profileId) || row.seconds < best.get(row.profileId)!.seconds) best.set(row.profileId, row);
  }
  const sorted = [...best.values()].sort((a, b) => a.seconds - b.seconds || a.profileId.localeCompare(b.profileId));
  return sorted.map((row, i) => ({ ...row, rank: sorted.findIndex((r) => r.seconds === row.seconds) + 1 || i + 1 }));
}

export function targetTime(board: SegmentResult[], profileId: string, target: SegmentTarget): number | null {
  const opponents = board.filter((r) => r.profileId !== profileId);
  const threshold = opponents[target === "record" ? 0 : 2]?.seconds;
  // Strava elapsed times have integer-second precision; beating a time requires a full second.
  return threshold != null && threshold > 1 ? threshold - 1 : null;
}

/** Clubdoel waar dat bestaat; anders de eigen PR verbeteren, zodat een segment zonder tegenstander toch een inschatting krijgt. */
export function segmentTarget(board: SegmentResult[], profileId: string, target: SegmentTarget): { seconds: number; kind: TargetKind } | null {
  const club = targetTime(board, profileId, target);
  if (club != null) return { seconds: club, kind: "club" };
  const own = board.find((r) => r.profileId === profileId)?.seconds;
  return own != null && own > 1 ? { seconds: own - 1, kind: "own" } : null;
}

export function powerAt(points: Array<{ seconds: number; watts: number }>, seconds: number): number | null {
  if (!points.length || seconds < points[0].seconds || seconds > points[points.length - 1].seconds) return null;
  for (let i = 0; i < points.length; i++) {
    if (points[i].seconds === seconds) return points[i].watts;
    if (points[i].seconds > seconds) {
      const a = points[i - 1], b = points[i];
      const ratio = Math.log(seconds / a.seconds) / Math.log(b.seconds / a.seconds);
      return a.watts + ratio * (b.watts - a.watts);
    }
  }
  return null;
}

export function bearing(a: Pick<TrackPoint, "lat" | "lon">, b: Pick<TrackPoint, "lat" | "lon">): number {
  const rad = Math.PI / 180, delta = (b.lon - a.lon) * rad;
  return (Math.atan2(Math.sin(delta) * Math.cos(b.lat * rad), Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos(delta)) / rad + 360) % 360;
}

export function validTrack(points: TrackPoint[]): boolean {
  return points.length >= 2 && points.every((p, i) =>
    [p.lat, p.lon, p.distance, p.altitude].every(Number.isFinite) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180 && p.distance >= 0 &&
    (i === 0 || p.distance > points[i - 1].distance));
}

export type Wind = { speedKmh: number; directionFrom: number };
/** Vector apparent wind: crosswind contributes to drag; meteorological direction is FROM. */
export function windSpeed(watts: number, gradient: number, mass: number, heading: number, wind: Wind, cda = DEFAULT_CDA): number | null {
  const angle = (wind.directionFrom - heading) * Math.PI / 180;
  const head = wind.speedKmh / 3.6 * Math.cos(angle), cross = wind.speedKmh / 3.6 * Math.sin(angle);
  const gravity = mass * G * (gradient + DEFAULT_CRR) / Math.sqrt(1 + gradient * gradient);
  const balance = (v: number) => (0.5 * AIR_DENSITY * cda * Math.hypot(v + head, cross) * (v + head) + gravity) * v - watts * DRIVETRAIN_EFF;
  let lo = 0.1, hi = 22;
  if (balance(lo) >= 0 || balance(hi) <= 0) return null;
  for (let i = 0; i < 45; i++) {
    const mid = (lo + hi) / 2;
    if (balance(mid) > 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

function predictedTime(track: TrackPoint[], curve: Array<{ seconds: number; watts: number }>, mass: number, wind: Wind, cda: number): number | null {
  const timeFor = (duration: number): number | null => {
    const watts = powerAt(curve, duration);
    if (watts == null) return null;
    let total = 0;
    for (let i = 1; i < track.length; i++) {
      const a = track[i - 1], b = track[i], distance = b.distance - a.distance;
      const speed = windSpeed(watts, (b.altitude - a.altitude) / distance, mass, bearing(a, b), wind, cda);
      if (speed == null) return null;
      total += distance / speed;
    }
    return total;
  };
  let lo = curve[0].seconds, hi = curve[curve.length - 1].seconds;
  const first = timeFor(lo), last = timeFor(hi);
  if (first == null || last == null || first < lo || last > hi) return null;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2, duration = timeFor(mid);
    if (duration == null) return null;
    if (duration > mid) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export function assessSegment(input: { targetSeconds: number | null; targetKind?: TargetKind | null; track: TrackPoint[]; curve: Array<{ seconds: number; watts: number }>; weight: number | null; wind: Wind | null; hazardous: boolean }): SegmentAssessment {
  const targetKind = input.targetSeconds == null ? null : input.targetKind ?? "club";
  const unknown = (reason: string): SegmentAssessment => ({ status: "unknown", reason, targetSeconds: input.targetSeconds, targetKind, fastSeconds: null, slowSeconds: null });
  if (input.targetSeconds == null) return unknown("Nog geen doeltijd");
  if (input.hazardous) return unknown("Gevaarlijk segment");
  if (!validTrack(input.track)) return unknown("Hoogteprofiel ontbreekt");
  if (!input.weight || !Number.isFinite(input.weight) || input.weight <= 0) return unknown("Gewicht ontbreekt");
  const curve = normalizePowerCurvePoints(input.curve);
  if (curve.length < 2) return unknown("Vermogenscurve ontbreekt");
  if (!input.wind || !Number.isFinite(input.wind.speedKmh) || input.wind.speedKmh < 0 || !Number.isFinite(input.wind.directionFrom)) return unknown("Weer ontbreekt");
  const times: number[] = [];
  for (const drag of [0.8, 1.2]) for (const windFactor of [0.8, 1.2]) {
    const time = predictedTime(input.track, curve, input.weight + DEFAULT_EQUIPMENT_KG, { ...input.wind, speedKmh: input.wind.speedKmh * windFactor }, DEFAULT_CDA * drag);
    if (time == null) return unknown("Buiten modelbereik");
    times.push(time);
  }
  const fastSeconds = Math.min(...times), slowSeconds = Math.max(...times);
  return { status: slowSeconds <= input.targetSeconds ? "likely" : fastSeconds <= input.targetSeconds ? "borderline" : "unreachable", reason: null, targetSeconds: input.targetSeconds, targetKind, fastSeconds, slowSeconds };
}

export function formatSegmentTime(value: number | null): string {
  if (value == null) return "—";
  const seconds = Math.round(value), hours = Math.floor(seconds / 3600);
  return `${hours ? `${hours}:` : ""}${hours ? String(Math.floor(seconds / 60) % 60).padStart(2, "0") : Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
