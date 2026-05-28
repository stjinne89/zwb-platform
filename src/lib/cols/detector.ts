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
        map?: {
          summary_polyline?: string | null;
          polyline?: string | null;
        } | null;
      }
    | null;
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Minimale afstand (meters) van een summit-punt tot het lijnsegment a→b,
 * via equirectangulaire projectie met de summit als oorsprong. Voor de
 * korte afstanden op col-schaal (<10km) is dat ruim nauwkeurig genoeg.
 *
 * Cruciaal: Strava's summary_polyline is sterk gedecimeerd (punten staan
 * vaak honderden meters uit elkaar). Afstand tot losse punten meten mist
 * dan de top als die tússen twee punten valt. Segment-afstand vangt dat.
 */
function pointToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos(toRad(p[0]));

  // Projecteer naar lokaal vlak (meters) met p als oorsprong (0,0).
  const ax = (a[1] - p[1]) * mPerDegLon;
  const ay = (a[0] - p[0]) * mPerDegLat;
  const bx = (b[1] - p[1]) * mPerDegLon;
  const by = (b[0] - p[0]) * mPerDegLat;

  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    // a en b vallen samen → punt-afstand
    return Math.sqrt(ax * ax + ay * ay);
  }
  // Projecteer oorsprong op het segment, clamp t op [0,1].
  let t = -(ax * dx + ay * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.sqrt(cx * cx + cy * cy);
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
  // Voorkeur voor de gedetailleerde polyline (indien aanwezig), anders
  // de summary. De summary is gedecimeerd maar wordt door de segment-
  // afstandscheck goed afgevangen.
  const enc =
    activity.raw?.map?.polyline || activity.raw?.map?.summary_polyline;
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
  // Marge ~3km zodat ook de grootste detection-radii (tot ~1500m) plus
  // sampling-slack binnen de prefilter vallen.
  const expanded = expandBbox(bbox, 0.03);

  const hits: string[] = [];
  for (const col of cols) {
    if (!bboxContains(expanded, col.summit_lat, col.summit_lon)) continue;
    const summit: LatLng = [col.summit_lat, col.summit_lon];
    const radius = col.detection_radius_m;

    // Check elk lijnsegment van de polyline (niet alleen de vertices).
    let passed = false;
    for (let i = 1; i < points.length; i++) {
      if (pointToSegmentMeters(summit, points[i - 1], points[i]) <= radius) {
        passed = true;
        break;
      }
    }
    // Edge: polyline met 1 punt → val terug op punt-afstand.
    if (!passed && points.length === 1) {
      passed = pointToSegmentMeters(summit, points[0], points[0]) <= radius;
    }
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
 * Haal ALLE strava_activities (id, start_date, raw) van een profiel op,
 * gepagineerd via .range(). Supabase capt selects standaard op 1000
 * rijen — zonder paginatie missen we recente ritten bij riders met
 * >1000 activities.
 */
async function fetchAllActivities(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
): Promise<StoredActivity[]> {
  const PAGE = 500; // raw-JSON is groot, dus kleinere pagina's
  const all: StoredActivity[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("strava_activities")
      .select("id, start_date, raw")
      .eq("profile_id", profileId)
      .order("start_date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as StoredActivity[]));
    if (data.length < PAGE) break;
  }
  return all;
}

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

  // Gepagineerd ophalen — Supabase capt standaard op 1000 rijen.
  const acts = await fetchAllActivities(supabase, profileId);

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
