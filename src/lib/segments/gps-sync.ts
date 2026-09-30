// Eigen segment- en coltijden van één rit wegschrijven (matcher: gps-efforts.ts).
//
// - Segmenten: elk segment uit de registry (zwb_segment_maps) met een lijn in het
//   gebied van de rit. De lijn komt van Strava; zo meten eigen tijden over
//   hetzelfde stuk als Strava-tijden en passen ze in één klassement (keuze
//   Stijn, 2026-09-30). Een poging landt in strava_activity_segment_efforts met
//   `raw.source = "gps"` en een effort_uid die met "gps:" begint, zodat het
//   klassement en de KOM's hem zonder Strava-koppeling meetellen (0199).
// - Cols met een Strava-segment krijgen hun tijd via dat segment. Cols zonder
//   segment hebben een startpunt uit een openbare bron; die tijden staan in
//   `raw.gps_col_times` van de rit en gaan via gps-col-times.ts naar
//   profile_climbed_cols.

import { decode } from "@mapbox/polyline";
import {
  matchColClimb,
  matchSegmentLine,
  type LatLon,
  type TimedPoint,
} from "./gps-efforts";

export const GPS_SOURCE = "gps";
export const GPS_EFFORT_PREFIX = "gps:";

export type GpsColTime = { slug: string; seconds: number; started_at: string };

type SegmentCandidate = {
  id: number | string;
  name: string | null;
  distance_m: number | null;
  average_grade: number | null;
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

async function segmentsInBox(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  box: ReturnType<typeof bboxOf>,
): Promise<SegmentCandidate[]> {
  const all: SegmentCandidate[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("zwb_segment_maps")
      .select("id, name, distance_m, average_grade, polyline")
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
 * Meet en bewaart de eigen tijden van één rit. Vervangt eerdere eigen pogingen
 * van die rit; pogingen van Strava blijven staan.
 */
export async function storeGpsEfforts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
  activityId: number | string,
  points: TimedPoint[],
): Promise<{ segments: number; cols: number }> {
  const box = points.length >= 2 ? bboxOf(points) : null;

  const rows: Record<string, unknown>[] = [];
  if (box) {
    for (const segment of await segmentsInBox(admin, box)) {
      const line = lineOf(segment.polyline);
      if (line.length < 2) continue;
      matchSegmentLine(points, line).forEach((effort, index) => {
        const startedAt = new Date(effort.startMs).toISOString();
        rows.push({
          effort_uid: `${GPS_EFFORT_PREFIX}${activityId}:${segment.id}:${index}`,
          profile_id: profileId,
          activity_id: activityId,
          strava_segment_id: segment.id,
          segment_name: segment.name,
          elapsed_time_seconds: effort.seconds,
          moving_time_seconds: effort.seconds,
          distance_m: segment.distance_m,
          average_grade: segment.average_grade,
          start_lat: line[0][0],
          start_lon: line[0][1],
          end_lat: line[line.length - 1][0],
          end_lon: line[line.length - 1][1],
          started_at: startedAt,
          raw: { source: GPS_SOURCE },
        });
      });
    }
  }

  const { error: deleteError } = await admin
    .from("strava_activity_segment_efforts")
    .delete()
    .eq("profile_id", profileId)
    .eq("activity_id", activityId)
    .like("effort_uid", `${GPS_EFFORT_PREFIX}%`);
  if (deleteError) throw new Error(deleteError.message);
  if (rows.length > 0) {
    const { error } = await admin
      .from("strava_activity_segment_efforts")
      .upsert(rows, { onConflict: "effort_uid" });
    if (error) throw new Error(error.message);
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
    const had = Array.isArray(raw.gps_col_times) && raw.gps_col_times.length > 0;
    if (colTimes.length > 0 || had) {
      if (colTimes.length > 0) raw.gps_col_times = colTimes;
      else delete raw.gps_col_times;
      const { error } = await admin
        .from("strava_activities")
        .update({ raw })
        .eq("id", activityId)
        .eq("profile_id", profileId);
      if (error) throw new Error(error.message);
    }
  }

  return { segments: rows.length, cols: colTimes.length };
}
