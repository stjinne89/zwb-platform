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
import { trackFirst, uniqueRides } from "@/lib/rides/unique-rides";

type LatLng = [number, number];

export type ColRecord = {
  slug: string;
  summit_lat: number;
  summit_lon: number;
  detection_radius_m: number;
  ascent_m?: number | null;
};

type StoredActivity = {
  id: number;
  start_date: string;
  distance_m?: number | string | null;
  total_elevation_gain_m?: number | null;
  raw:
    | {
        total_elevation_gain?: number | null;
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

function activityElevationGain(activity: StoredActivity): number | null {
  const stored = activity.total_elevation_gain_m;
  if (typeof stored === "number" && Number.isFinite(stored)) return stored;
  const raw = activity.raw?.total_elevation_gain;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  return null;
}

function hasEnoughElevationForCol(
  activity: StoredActivity,
  col: ColRecord,
): boolean {
  const ascent = col.ascent_m;
  if (ascent == null || ascent < 500) return true;

  const gain = activityElevationGain(activity);
  if (gain == null) return true;

  const requiredGain = Math.min(300, ascent * 0.2);
  return gain >= requiredGain;
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
    if (!hasEnoughElevationForCol(activity, col)) continue;
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

// Alleen wat de detector uit raw leest. De hele raw-kolom ophalen kostte per
// binnengekomen rit de volledige historie van het lid aan egress (gemeten
// 2026-10-13: 77 MB raw tegenover 21 MB aan polylines over alle leden).
const DETECTOR_COLUMNS =
  "id, start_date, distance_m, total_elevation_gain_m, raw_elevation_gain:raw->total_elevation_gain, polyline:raw->map->>polyline, summary_polyline:raw->map->>summary_polyline";

type DetectorRow = {
  id: number;
  start_date: string;
  distance_m: number | string | null;
  total_elevation_gain_m: number | null;
  raw_elevation_gain: number | null;
  polyline: string | null;
  summary_polyline: string | null;
};

// Migratie 0255: per rit welke cols erin zitten, en tegen welke catalogus en
// welke versie van de rit dat is vastgesteld. Een run leest alleen deze kolommen
// en scant alleen ritten waarvan de sleutel niet meer klopt. De historie
// opnieuw doorlopen kostte 52% van de databasetijd (databasecheck 2026-10-20):
// raw->map laat Postgres per rij de hele raw uitpakken.
const SCAN_COLUMNS = "id, start_date, distance_m, synced_at, col_slugs, col_scan_key";
const SCAN_BATCH = 200;

type ScanRow = {
  id: number;
  start_date: string;
  distance_m: number | string | null;
  synced_at: string | null;
  col_slugs: string[] | null;
  col_scan_key: string | null;
};

export type ScannedRide = {
  id: number;
  start_date: string;
  distance_m?: number | string | null;
  col_slugs: string[];
};

export type ColAggregate = {
  firstActivityId: number;
  firstClimbedAt: string;
  lastActivityId: number;
  lastClimbedAt: string;
  count: number;
};

/** FNV-1a; kort en zonder imports, alleen om een wijziging te zien. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** Verandert zodra een col bijkomt, verdwijnt of een andere top of straal krijgt. */
export function colCatalogKey(cols: ColRecord[]): string {
  const parts = cols
    .map((c) =>
      [c.slug, c.summit_lat, c.summit_lon, c.detection_radius_m, c.ascent_m ?? ""].join(":"),
    )
    .sort();
  return fnv1a(parts.join("|"));
}

/** De sleutel van één rit: catalogus plus de laatste keer dat de rit is weggeschreven. */
export function rideScanKey(catalogKey: string, syncedAt: string | null): string {
  return `${catalogKey}@${syncedAt ?? ""}`;
}

/**
 * Per col de eerste en laatste rit en het aantal keer, over de unieke ritten.
 * Een rit met cols heeft per definitie een spoor, dus die wint van een kopie
 * zonder; tussen twee kopieën met spoor maakt het voor de telling niet uit.
 * Puur, zodat de telling in een unit-test vastligt.
 */
export function aggregateColPassages(rides: ScannedRide[]): {
  passages: Map<string, ColAggregate>;
  uniqueRides: number;
} {
  const unique = uniqueRides(rides, (ride) => (ride.col_slugs.length > 0 ? 2 : 0));
  const sorted = [...unique].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const agg = new Map<string, ColAggregate>();
  for (const ride of sorted) {
    for (const slug of ride.col_slugs) {
      const cur = agg.get(slug);
      if (!cur) {
        agg.set(slug, {
          firstActivityId: ride.id,
          firstClimbedAt: ride.start_date,
          lastActivityId: ride.id,
          lastClimbedAt: ride.start_date,
          count: 1,
        });
      } else {
        cur.count += 1;
        cur.lastActivityId = ride.id;
        cur.lastClimbedAt = ride.start_date;
      }
    }
  }
  return { passages: agg, uniqueRides: unique.length };
}

/**
 * Lichte kolommen van alle ritten; ritten met een verouderde sleutel worden
 * eerst gescand en weggeschreven. Null als migratie 0255 nog ontbreekt: de
 * aanroeper valt dan terug op de volledige scan.
 */
async function fetchScannedRides(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  cols: ColRecord[],
): Promise<ScannedRide[] | null> {
  const catalogKey = colCatalogKey(cols);
  const PAGE = 1000;
  const rows: ScanRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("strava_activities")
      .select(SCAN_COLUMNS)
      .eq("profile_id", profileId)
      .order("start_date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return null;
    if (!data || data.length === 0) break;
    rows.push(...(data as ScanRow[]));
    if (data.length < PAGE) break;
  }
  return scanAndCollect();

  async function scanAndCollect(): Promise<ScannedRide[] | null> {
    const stale = rows.filter((row) => row.col_scan_key !== rideScanKey(catalogKey, row.synced_at));
    for (let i = 0; i < stale.length; i += SCAN_BATCH) {
      const batch = stale.slice(i, i + SCAN_BATCH);
      const { data, error } = await supabase
        .from("strava_activities")
        .select(DETECTOR_COLUMNS)
        .in(
          "id",
          batch.map((row) => row.id),
        );
      if (error) return null;
      const byId = new Map(batch.map((row) => [Number(row.id), row]));
      const updates: Array<{ id: number; col_slugs: string[]; col_scan_key: string }> = [];
      for (const detail of (data ?? []) as DetectorRow[]) {
        const row = byId.get(Number(detail.id));
        if (!row) continue;
        const slugs = detectColsInActivity(storedFromDetector(detail), cols);
        row.col_slugs = slugs;
        row.col_scan_key = rideScanKey(catalogKey, row.synced_at);
        updates.push({ id: row.id, col_slugs: slugs, col_scan_key: row.col_scan_key });
      }
      // Niet bewaard is niet fout: de telling hieronder klopt, de volgende run
      // scant deze ritten opnieuw.
      if (updates.length > 0) {
        try {
          await supabase.rpc("set_activity_col_scans", { p_rows: updates });
        } catch {
          // zie hierboven
        }
      }
    }
    return rows.map((row) => ({
      id: row.id,
      start_date: row.start_date,
      distance_m: row.distance_m,
      col_slugs: row.col_slugs ?? [],
    }));
  }
}

function storedFromDetector(row: DetectorRow): StoredActivity {
  return {
    id: row.id,
    start_date: row.start_date,
    distance_m: row.distance_m,
    total_elevation_gain_m: row.total_elevation_gain_m,
    raw: {
      total_elevation_gain: row.raw_elevation_gain,
      map: { polyline: row.polyline, summary_polyline: row.summary_polyline },
    },
  };
}

/**
 * Een rit kreeg buiten de sync om een ander spoor of andere hoogtemeters (een
 * GPX aan een CSV-rit gehangen). Dan scant de detector hem de volgende keer
 * opnieuw. Best-effort: zonder migratie 0255 bestaat de kolom niet.
 */
export async function forgetColScans(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  activityIds: number[],
): Promise<void> {
  if (activityIds.length === 0) return;
  await supabase
    .from("strava_activities")
    .update({ col_scan_key: null })
    .eq("profile_id", profileId)
    .in("id", activityIds)
    .then(
      () => undefined,
      () => undefined,
    );
}

/**
 * Haal ALLE strava_activities van een profiel op, gepagineerd via .range().
 * Supabase capt selects standaard op 1000 rijen — zonder paginatie missen we
 * recente ritten bij riders met >1000 activities. Alleen nog de terugval voor
 * zolang migratie 0255 niet is toegepast.
 */
async function fetchAllActivities(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
): Promise<StoredActivity[]> {
  const PAGE = 500;
  const all: StoredActivity[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("strava_activities")
      .select(DETECTOR_COLUMNS)
      .eq("profile_id", profileId)
      .order("start_date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data as DetectorRow[]) all.push(storedFromDetector(row));
    if (data.length < PAGE) break;
  }
  // Een rit die het lid twee keer opnam, telt één keer voor times_climbed. Van
  // de twee blijft die met een spoor.
  return uniqueRides(all, trackFirst);
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
    .select("slug, summit_lat, summit_lon, detection_radius_m, ascent_m")
    .not("summit_lat", "is", null)
    .not("summit_lon", "is", null);
  const cols = ((colsRows ?? []) as ColRecord[]).map((c) => ({
    ...c,
    summit_lat: Number(c.summit_lat),
    summit_lon: Number(c.summit_lon),
  }));
  if (cols.length === 0) return { scanned: 0, newCols: 0 };

  // times_climbed telt over de hele historie, dus alle ritten doen mee; alleen
  // ritten met een verouderde scan worden opnieuw gelezen. activityIds blijft
  // in de API maar is niet nodig: de scansleutel ziet zelf welke ritten nieuw zijn.
  void activityIds;

  const rides =
    (await fetchScannedRides(supabase, profileId, cols)) ??
    (await fetchAllActivities(supabase, profileId)).map((act) => ({
      id: act.id,
      start_date: act.start_date,
      distance_m: act.distance_m,
      col_slugs: detectColsInActivity(act, cols),
    }));
  const { passages: agg, uniqueRides: scanned } = aggregateColPassages(rides);

  // Diff-counter: hoeveel cols zijn er nieuw bijgekomen?
  const { data: existingRows } = await supabase
    .from("profile_climbed_cols")
    .select("col_slug")
    .eq("profile_id", profileId);
  const existing = new Set(
    ((existingRows ?? []) as { col_slug: string }[]).map((r) => r.col_slug),
  );
  const detected = new Set(agg.keys());
  const stale = Array.from(existing).filter((slug) => !detected.has(slug));

  if (stale.length > 0) {
    await supabase
      .from("profile_climbed_cols")
      .delete()
      .eq("profile_id", profileId)
      .in("col_slug", stale);
  }

  if (agg.size === 0) {
    return { scanned, newCols: 0 };
  }

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
    return { scanned, newCols: 0 };
  }

  const newCount = Array.from(agg.keys()).filter(
    (slug) => !existing.has(slug),
  ).length;

  return { scanned, newCols: newCount };
}
