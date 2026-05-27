// Col-detector: scant Strava-activities op col-passages.
//
// Voor elke activity met een `summary_polyline` (in `raw.map.summary_polyline`)
// decoderen we de polyline naar een array van [lat, lon]-punten en checken
// of er minstens 1 punt binnen `detection_radius_m` van een col-summit ligt.
// Zo ja → de rider heeft die col gepasseerd.
//
// Optimalisatie: per activity precomputen we een bbox van de polyline,
// en filteren we cols vooraf op of hun summit binnen die bbox valt
// (met ruime marge voor de detection-radius). Brengt 10M Haversine-calls
// terug naar ~100K voor een 1300-rit backfill.

import polyline from "@mapbox/polyline";

const EARTH_R = 6371000; // meters

type LatLng = [number, number];

export type ColRecord = {
  slug: string;
  summit_lat: number;
  summit_lon: number;
  detection_radius_m: number;
};

type StoredActivity = {
  id: number;
  start_date: string;
  raw:
    | {
        map?: { summary_polyline?: string | null } | null;
      }
    | null;
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineMeters(a: LatLng, b: LatLng): number {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aa =
    sinDLat * sinDLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinDLon * sinDLon;
  return 2 * EARTH_R * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

type Bbox = { minLat: number; maxLat: number; minLon: number; maxLon: number };

function bboxOf(points: LatLng[]): Bbox | null {
  if (points.length === 0) return null;
  let minLat = points[0][0];
  let maxLat = points[0][0];
  let minLon = points[0][1];
  let maxLon = points[0][1];
  for (const [lat, lon] of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  return { minLat, maxLat, minLon, maxLon };
}

/**
 * Vergroot bbox met een marge in graden (~1°≈111km op evenaar, ~70km op
 * NL-breedte). 0.01° = ~1.1km — ruim genoeg voor 500m detection radius.
 */
function expandBbox(b: Bbox, margin: number): Bbox {
  return {
    minLat: b.minLat - margin,
    maxLat: b.maxLat + margin,
    minLon: b.minLon - margin,
    maxLon: b.maxLon + margin,
  };
}

function bboxContains(b: Bbox, lat: number, lon: number): boolean {
  return lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon;
}

/**
 * Decodeer + match voor één activity. Geeft de col-slugs terug die zijn
 * gepasseerd. Lege array als de polyline ontbreekt of geen match.
 */
export function detectColsInActivity(
  activity: StoredActivity,
  cols: ColRecord[],
): string[] {
  const enc = activity.raw?.map?.summary_polyline;
  if (!enc) return [];

  let points: LatLng[];
  try {
    points = polyline.decode(enc) as LatLng[];
  } catch {
    return [];
  }
  if (points.length === 0) return [];

  const bbox = bboxOf(points);
  if (!bbox) return [];
  // Marge ~1.5km voor detection radius (worst case 500m + sampling-slack)
  const expanded = expandBbox(bbox, 0.015);

  const hits: string[] = [];
  for (const col of cols) {
    if (!bboxContains(expanded, col.summit_lat, col.summit_lon)) continue;
    const summit: LatLng = [col.summit_lat, col.summit_lon];
    const passed = points.some(
      (p) => haversineMeters(p, summit) <= col.detection_radius_m,
    );
    if (passed) hits.push(col.slug);
  }
  return hits;
}

type ClimbedRow = {
  profile_id: string;
  col_slug: string;
  first_activity_id: number;
  first_climbed_at: string;
  last_activity_id: number;
  last_climbed_at: string;
  times_climbed: number;
  updated_at: string;
};

/**
 * Scan alle (of een subset) activities van een profiel en upsert
 * profile_climbed_cols. Schrijft via de meegegeven supabase-client
 * (admin-client voor RLS-bypass tijdens sync/recompute).
 *
 * Wanneer activityIds wordt meegegeven, scant alleen die — bedoeld
 * voor incrementele sync. Anders: alle activities van het profiel.
 */
export async function syncClimbedColsForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  activityIds?: number[],
): Promise<{ scanned: number; newCols: number }> {
  const { data: colsRows } = await supabase
    .from("cols")
    .select("slug, summit_lat, summit_lon, detection_radius_m");
  const cols = ((colsRows ?? []) as ColRecord[]).map((c) => ({
    ...c,
    summit_lat: Number(c.summit_lat),
    summit_lon: Number(c.summit_lon),
  }));
  if (cols.length === 0) return { scanned: 0, newCols: 0 };

  // Voor de detector willen we ALLE activities van het profiel scannen,
  // niet alleen een subset — anders kunnen we times_climbed niet correct
  // berekenen (oudere ritten zouden uit de telling vallen). De
  // activityIds-parameter wordt nu genegeerd; behouden in API voor
  // toekomstige incrementele variant.
  void activityIds;

  const { data: activities } = await supabase
    .from("strava_activities")
    .select("id, start_date, raw")
    .eq("profile_id", profileId);
  const acts = (activities ?? []) as StoredActivity[];

  // Bouw per-col aggregaat: first/last activity + total count over hele
  // historie. Sorteer oudest eerst zodat first/last natuurlijk volgen.
  const sorted = [...acts].sort((a, b) =>
    a.start_date.localeCompare(b.start_date),
  );

  type Aggregate = {
    firstActivityId: number;
    firstClimbedAt: string;
    lastActivityId: number;
    lastClimbedAt: string;
    count: number;
  };
  const agg = new Map<string, Aggregate>();

  for (const act of sorted) {
    const slugs = detectColsInActivity(act, cols);
    for (const slug of slugs) {
      const cur = agg.get(slug);
      if (!cur) {
        agg.set(slug, {
          firstActivityId: act.id,
          firstClimbedAt: act.start_date,
          lastActivityId: act.id,
          lastClimbedAt: act.start_date,
          count: 1,
        });
      } else {
        cur.count += 1;
        cur.lastActivityId = act.id;
        cur.lastClimbedAt = act.start_date;
      }
    }
  }

  if (agg.size === 0) {
    return { scanned: acts.length, newCols: 0 };
  }

  // Diff-counter: hoeveel cols zijn er nieuw bijgekomen?
  const { data: existingRows } = await supabase
    .from("profile_climbed_cols")
    .select("col_slug")
    .eq("profile_id", profileId);
  const existing = new Set(
    ((existingRows ?? []) as { col_slug: string }[]).map((r) => r.col_slug),
  );

  const now = new Date().toISOString();
  const rowsToUpsert: ClimbedRow[] = Array.from(agg.entries()).map(
    ([slug, info]) => ({
      profile_id: profileId,
      col_slug: slug,
      first_activity_id: info.firstActivityId,
      first_climbed_at: info.firstClimbedAt,
      last_activity_id: info.lastActivityId,
      last_climbed_at: info.lastClimbedAt,
      times_climbed: info.count,
      updated_at: now,
    }),
  );

  // Echte upsert — bij conflict op (profile_id, col_slug) update we de
  // last_* + times_climbed met de actuele waarde. first_* blijft staan
  // (we sturen wel mee, maar bestaand record wint via on_conflict).
  const { error } = await supabase
    .from("profile_climbed_cols")
    .upsert(rowsToUpsert, { onConflict: "profile_id,col_slug" });
  if (error) {
    return { scanned: acts.length, newCols: 0 };
  }

  const newCount = Array.from(agg.keys()).filter(
    (slug) => !existing.has(slug),
  ).length;

  return { scanned: acts.length, newCols: newCount };
}
