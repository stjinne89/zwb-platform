// Strava-segmenttijden voor cols.
//
// De col-detector (detector.ts) bepaalt WELKE cols een rider is gepasseerd
// via polyline-matching. Voor de TIJD per col halen we de detailed activity
// op (`/activities/{id}?include_all_efforts=true`) en lezen de
// `segment_efforts` uit waarvan het segment-ID overeenkomt met een col met
// bekende `strava_segment_id`. De snelste effort-tijd bewaren we per
// (profiel, col) in profile_climbed_cols.
//
// Rate-limit: detailed-activity-fetch is duurder (1 call per rit). We:
//   - fetchen alleen ritten die minstens één segment-col passeren,
//   - cachen welke ritten al opgehaald zijn (efforts_fetched_at),
//   - stale cachemarkers opnieuw proberen als een gedetecteerde col nog geen
//     tijd heeft (segment-ID's kunnen later zijn toegevoegd/gecorrigeerd),
//   - begrenzen het aantal fetches per run (maxFetches), nieuwste eerst,
//   - stoppen netjes bij HTTP 429.

import { detectColsInActivity, type ColRecord } from "./detector";

type StoredActivity = {
  id: number;
  start_date: string;
  efforts_fetched_at: string | null;
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

type SegmentEffort = {
  elapsed_time?: number;
  moving_time?: number;
  segment?: { id?: number } | null;
};

type DetailedActivity = {
  segment_efforts?: SegmentEffort[] | null;
};

async function fetchAllActivitiesWithEffortsFlag(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
): Promise<StoredActivity[]> {
  const PAGE = 500;
  const all: StoredActivity[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("strava_activities")
      .select("id, start_date, efforts_fetched_at, total_elevation_gain_m, raw")
      .eq("profile_id", profileId)
      .order("start_date", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as StoredActivity[]));
    if (data.length < PAGE) break;
  }
  return all;
}

export async function syncColSegmentTimesForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  accessToken: string,
  profileId: string,
  options: { maxFetches?: number; refetchMissingAfterHours?: number } = {},
): Promise<{ fetched: number; updated: number; rateLimited: boolean }> {
  const maxFetches = options.maxFetches ?? 40;
  const refetchMissingAfterMs =
    (options.refetchMissingAfterHours ?? 24) * 60 * 60 * 1000;
  const now = Date.now();

  // Cols met een bekend Strava-segment-ID. Zonder ID kunnen we geen
  // effort-tijd koppelen.
  const { data: colsRows } = await supabase
    .from("cols")
    .select(
      "slug, summit_lat, summit_lon, detection_radius_m, ascent_m, strava_segment_id",
    )
    .not("strava_segment_id", "is", null);

  const cols = ((colsRows ?? []) as (ColRecord & {
    strava_segment_id: number | null;
  })[])
    .filter((c) => c.summit_lat != null && c.summit_lon != null)
    .map((c) => ({
      ...c,
      summit_lat: Number(c.summit_lat),
      summit_lon: Number(c.summit_lon),
    }));
  if (cols.length === 0) {
    return { fetched: 0, updated: 0, rateLimited: false };
  }

  const segmentIdToSlug = new Map<number, string>();
  for (const c of cols) {
    if (c.strava_segment_id != null) {
      segmentIdToSlug.set(Number(c.strava_segment_id), c.slug);
    }
  }
  const detectCols: ColRecord[] = cols.map((c) => ({
    slug: c.slug,
    summit_lat: c.summit_lat,
    summit_lon: c.summit_lon,
    detection_radius_m: c.detection_radius_m,
    ascent_m: c.ascent_m,
  }));

  const acts = await fetchAllActivitiesWithEffortsFlag(supabase, profileId);

  // Kandidaten: ritten die ≥1 segment-col passeren en nog niet opgehaald zijn.
  // Geef ritten met cols zonder PR-tijd voorrang. Anders blijven oude outdoor-
  // cols achteraan de queue hangen bij riders met veel recente Zwift-ritten.
  const { data: missingTimeRows } = await supabase
    .from("profile_climbed_cols")
    .select("col_slug")
    .eq("profile_id", profileId)
    .is("best_time_seconds", null);
  const missingTimeSlugs = new Set(
    ((missingTimeRows ?? []) as { col_slug: string }[]).map((r) => r.col_slug),
  );

  const prioritized: StoredActivity[] = [];
  const fallback: StoredActivity[] = [];
  for (const act of acts) {
    const hits = detectColsInActivity(act, detectCols);
    if (hits.length === 0) continue;
    const hasMissingTimeHit = hits.some((slug) => missingTimeSlugs.has(slug));

    if (act.efforts_fetched_at) {
      const fetchedAt = Date.parse(act.efforts_fetched_at);
      const staleFetch =
        !Number.isFinite(fetchedAt) ||
        now - fetchedAt >= refetchMissingAfterMs;
      if (!hasMissingTimeHit || !staleFetch) continue;
    }

    if (hasMissingTimeHit) {
      prioritized.push(act);
    } else {
      fallback.push(act);
    }
  }
  const candidates = [...prioritized, ...fallback].slice(0, maxFetches);

  if (candidates.length === 0) {
    return { fetched: 0, updated: 0, rateLimited: false };
  }

  // Beste tijd per slug verzamelen uit de opgehaalde efforts.
  const bestBySlug = new Map<
    string,
    { seconds: number; activityId: number; at: string }
  >();
  let fetched = 0;
  let rateLimited = false;

  for (const act of candidates) {
    const url = new URL(`https://www.strava.com/api/v3/activities/${act.id}`);
    url.searchParams.set("include_all_efforts", "true");

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
    } catch {
      continue;
    }

    if (res.status === 429) {
      rateLimited = true;
      break;
    }
    if (!res.ok) {
      // 404/410 (verwijderd) of andere fout: markeer als opgehaald zodat we
      // 'm niet eindeloos opnieuw proberen.
      await supabase
        .from("strava_activities")
        .update({ efforts_fetched_at: new Date().toISOString() })
        .eq("id", act.id);
      continue;
    }

    const detail = (await res.json()) as DetailedActivity;
    fetched++;

    for (const eff of detail.segment_efforts ?? []) {
      const segId = eff.segment?.id;
      if (segId == null) continue;
      const slug = segmentIdToSlug.get(Number(segId));
      if (!slug) continue;
      const seconds = eff.elapsed_time ?? eff.moving_time;
      if (seconds == null || seconds <= 0) continue;
      const cur = bestBySlug.get(slug);
      if (!cur || seconds < cur.seconds) {
        bestBySlug.set(slug, {
          seconds,
          activityId: act.id,
          at: act.start_date,
        });
      }
    }

    await supabase
      .from("strava_activities")
      .update({ efforts_fetched_at: new Date().toISOString() })
      .eq("id", act.id);

    // Kleine pauze — beleefd voor de rate-limit.
    await new Promise((r) => setTimeout(r, 150));
  }

  // Schrijf nieuwe PR's weg: alleen als sneller dan de bestaande best_time.
  let updated = 0;
  if (bestBySlug.size > 0) {
    const slugs = [...bestBySlug.keys()];
    const { data: existing } = await supabase
      .from("profile_climbed_cols")
      .select("col_slug, best_time_seconds")
      .eq("profile_id", profileId)
      .in("col_slug", slugs);
    const existingBest = new Map<string, number | null>(
      ((existing ?? []) as { col_slug: string; best_time_seconds: number | null }[]).map(
        (r) => [r.col_slug, r.best_time_seconds],
      ),
    );

    for (const [slug, info] of bestBySlug) {
      const prev = existingBest.get(slug);
      if (prev != null && prev <= info.seconds) continue;
      const { error } = await supabase
        .from("profile_climbed_cols")
        .update({
          best_time_seconds: info.seconds,
          best_time_activity_id: info.activityId,
          best_time_at: info.at,
        })
        .eq("profile_id", profileId)
        .eq("col_slug", slug);
      if (!error) updated++;
    }
  }

  return { fetched, updated, rateLimited };
}
