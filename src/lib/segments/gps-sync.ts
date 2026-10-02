// Eigen segment- en coltijden van één rit wegschrijven (matcher: gps-efforts.ts).
//
// Voor leden zonder Strava (GPX-upload, intervals.icu) meet ZWB zelf de tijd, en
// bewaart het resultaat in de rit:
// - `raw.gps_segment_times`: de snelste tijd per uitgekozen segment of col met
//   een Strava-segment. De lijn komt uit de registry (zwb_segment_maps) en is die
//   van Strava, zodat een eigen tijd over hetzelfde stuk gaat als een Strava-tijd
//   (keuze Stijn, 2026-09-30).
// - `raw.gps_col_times`: cols zonder segment, gemeten vanaf een startpunt uit een
//   openbare bron.
// cols/gps-col-times.ts zet beide door naar profile_climbed_cols en
// profile_completed_segments.
//
// Tot oktober 2026 landde een eigen segmenttijd als rij in
// strava_activity_segment_efforts, voor alle Strava-segmenten in het gebied. Met
// de verkenner en de KOM's is die tabel verdwenen (migratie 0212); alleen de
// uitgekozen segmenten en cols worden nog gemeten.

import { decode } from "@mapbox/polyline";
import {
  matchColClimb,
  matchSegmentLine,
  type LatLon,
  type TimedPoint,
} from "./gps-efforts";

export const GPS_SOURCE = "gps";

export type GpsColTime = { slug: string; seconds: number; started_at: string };
export type GpsSegmentTime = { segment_id: number | string; seconds: number; started_at: string };

type SegmentCandidate = {
  id: number | string;
  polyline: string | null;
};

type ColCandidate = {
  slug: string;
  summit_lat: number | string;
  summit_lon: number | string;
  start_lat: number | string;
  start_lon: number | string;
  detection_radius_m: number | null;
};

const PAGE = 500;
/** Ruim genoeg voor de straal van een startpunt en de corridor. */
const BBOX_MARGIN_DEG = 0.004;

function bboxOf(points: TimedPoint[]) {
  let south = Infinity;
  let north = -Infinity;
  let west = Infinity;
  let east = -Infinity;
  for (const point of points) {
    south = Math.min(south, point.lat);
    north = Math.max(north, point.lat);
    west = Math.min(west, point.lon);
    east = Math.max(east, point.lon);
  }
  return {
    south: south - BBOX_MARGIN_DEG,
    north: north + BBOX_MARGIN_DEG,
    west: west - BBOX_MARGIN_DEG,
    east: east + BBOX_MARGIN_DEG,
  };
}

/** Strava-segment-ID's van de uitgekozen segmenten en van cols met een segment. */
export async function curatedSegmentIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): Promise<number[]> {
  const [segments, cols] = await Promise.all([
    admin.from("zwb_segments").select("strava_segment_id").eq("active", true).not("strava_segment_id", "is", null),
    admin.from("cols").select("strava_segment_id").not("strava_segment_id", "is", null),
  ]);
  if (segments.error) throw new Error(segments.error.message);
  if (cols.error) throw new Error(cols.error.message);
  const rows = [...(segments.data ?? []), ...(cols.data ?? [])] as Array<{ strava_segment_id: number | string }>;
  return [...new Set(rows.map((row) => Number(row.strava_segment_id)))].filter(Number.isFinite);
}

async function segmentsInBox(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  box: ReturnType<typeof bboxOf>,
): Promise<SegmentCandidate[]> {
  const ids = await curatedSegmentIds(admin);
  if (ids.length === 0) return [];
  const all: SegmentCandidate[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("zwb_segment_maps")
      .select("id, polyline")
      .in("id", ids)
      .eq("private", false)
      .not("polyline", "is", null)
      .lte("south", box.north)
      .gte("north", box.south)
      .lte("west", box.east)
      .gte("east", box.west)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as SegmentCandidate[];
    all.push(...page);
    if (page.length < PAGE) break;
  }
  return all;
}

function lineOf(encoded: string | null): LatLon[] {
  if (!encoded) return [];
  try {
    return decode(encoded) as LatLon[];
  } catch {
    return [];
  }
}

/**
 * Meet en bewaart de eigen tijden van één rit. Vervangt wat er eerder voor die
 * rit gemeten was.
 */
export async function storeGpsEfforts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
  activityId: number | string,
  points: TimedPoint[],
): Promise<{ segments: number; cols: number }> {
  const box = points.length >= 2 ? bboxOf(points) : null;

  const segmentTimes: GpsSegmentTime[] = [];
  if (box) {
    for (const segment of await segmentsInBox(admin, box)) {
      const line = lineOf(segment.polyline);
      if (line.length < 2) continue;
      const efforts = matchSegmentLine(points, line);
      const best = efforts.reduce<(typeof efforts)[number] | null>(
        (fastest, effort) => (!fastest || effort.seconds < fastest.seconds ? effort : fastest),
        null,
      );
      if (best) {
        segmentTimes.push({
          segment_id: segment.id,
          seconds: best.seconds,
          started_at: new Date(best.startMs).toISOString(),
        });
      }
    }
  }

  const colTimes: GpsColTime[] = [];
  if (box) {
    const { data: colRows, error: colError } = await admin
      .from("cols")
      .select("slug, summit_lat, summit_lon, start_lat, start_lon, detection_radius_m")
      .is("strava_segment_id", null)
      .not("start_lat", "is", null)
      .not("start_lon", "is", null);
    if (colError) throw new Error(colError.message);
    for (const col of (colRows ?? []) as ColCandidate[]) {
      const summit: LatLon = [Number(col.summit_lat), Number(col.summit_lon)];
      if (summit[0] < box.south || summit[0] > box.north || summit[1] < box.west || summit[1] > box.east) continue;
      const start: LatLon = [Number(col.start_lat), Number(col.start_lon)];
      const efforts = matchColClimb(points, start, summit, col.detection_radius_m ?? 500);
      const best = efforts.reduce<(typeof efforts)[number] | null>(
        (fastest, effort) => (!fastest || effort.seconds < fastest.seconds ? effort : fastest),
        null,
      );
      if (best) {
        colTimes.push({ slug: col.slug, seconds: best.seconds, started_at: new Date(best.startMs).toISOString() });
      }
    }
  }

  const { data: activity, error: readError } = await admin
    .from("strava_activities")
    .select("raw")
    .eq("id", activityId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (activity) {
    const raw = { ...((activity.raw ?? {}) as Record<string, unknown>) };
    const had =
      (Array.isArray(raw.gps_col_times) && raw.gps_col_times.length > 0) ||
      (Array.isArray(raw.gps_segment_times) && raw.gps_segment_times.length > 0);
    if (colTimes.length > 0 || segmentTimes.length > 0 || had) {
      if (colTimes.length > 0) raw.gps_col_times = colTimes;
      else delete raw.gps_col_times;
      if (segmentTimes.length > 0) raw.gps_segment_times = segmentTimes;
      else delete raw.gps_segment_times;
      const { error } = await admin
        .from("strava_activities")
        .update({ raw })
        .eq("id", activityId)
        .eq("profile_id", profileId);
      if (error) throw new Error(error.message);
    }
  }

  return { segments: segmentTimes.length, cols: colTimes.length };
}
