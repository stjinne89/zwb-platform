type SupabaseClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

type StoredActivity = {
  id: number;
  start_date: string;
  efforts_fetched_at: string | null;
};

type SegmentEffort = {
  id?: number;
  elapsed_time?: number;
  moving_time?: number;
  start_date?: string;
  name?: string;
  distance?: number;
  average_grade?: number;
  segment?: {
    id?: number;
    name?: string;
    distance?: number;
    average_grade?: number;
    elevation_high?: number;
    elevation_low?: number;
    start_latlng?: [number, number] | null;
    end_latlng?: [number, number] | null;
  } | null;
};

type DetailedActivity = {
  id?: number;
  start_date?: string;
  segment_efforts?: SegmentEffort[] | null;
};

type SegmentRow = {
  slug: string;
  collection: string;
  strava_segment_id: number | null;
};

type EffortRow = {
  profile_id: string;
  activity_id: number;
  strava_segment_id: number;
  segment_name: string | null;
  elapsed_time_seconds: number | null;
  moving_time_seconds: number | null;
  started_at: string | null;
};

function effortUid(
  profileId: string,
  activityId: number,
  segmentId: number,
  seconds: number | null,
  startedAt: string | null,
) {
  return [
    profileId,
    activityId,
    segmentId,
    seconds ?? "x",
    startedAt ?? "x",
  ].join(":");
}

function slugifySegmentName(name: string, prefix: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return `${prefix}-${slug || "segment"}`;
}

function latLngPair(value: unknown): [number | null, number | null] {
  if (!Array.isArray(value) || value.length < 2) return [null, null];
  const lat = Number(value[0]);
  const lon = Number(value[1]);
  return [Number.isFinite(lat) ? lat : null, Number.isFinite(lon) ? lon : null];
}

function isBeneluxEffort(row: {
  start_lat: number | null;
  start_lon: number | null;
  end_lat: number | null;
  end_lon: number | null;
}) {
  const points = [
    [row.start_lat, row.start_lon],
    [row.end_lat, row.end_lon],
  ];
  return points.some(([lat, lon]) => {
    if (lat == null || lon == null) return false;
    const inNetherlands = lat >= 50.7 && lat <= 53.7 && lon >= 3.2 && lon <= 7.3;
    const inBelgium = lat >= 49.4 && lat <= 51.6 && lon >= 2.4 && lon <= 6.5;
    const inLuxembourg = lat >= 49.4 && lat <= 50.3 && lon >= 5.7 && lon <= 6.6;
    return inNetherlands || inBelgium || inLuxembourg;
  });
}

function inferredCountry(row: {
  start_lat: number | null;
  start_lon: number | null;
}) {
  const lat = row.start_lat;
  const lon = row.start_lon;
  if (lat == null || lon == null) return null;
  if (lat >= 50.7 && lat <= 53.7 && lon >= 3.2 && lon <= 7.3) return "NL";
  if (lat >= 49.4 && lat <= 51.6 && lon >= 2.4 && lon <= 6.5) return "BE";
  if (lat >= 49.4 && lat <= 50.3 && lon >= 5.7 && lon <= 6.6) return "LU";
  return null;
}

async function fetchAllActivities(
  supabase: SupabaseClient,
  profileId: string,
): Promise<StoredActivity[]> {
  const PAGE = 500;
  const all: StoredActivity[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("strava_activities")
      .select("id, start_date, efforts_fetched_at")
      .eq("profile_id", profileId)
      .order("start_date", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as StoredActivity[]));
    if (data.length < PAGE) break;
  }
  return all;
}

async function effortActivityIds(supabase: SupabaseClient, profileId: string) {
  const PAGE = 1000;
  const ids = new Set<number>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("strava_activity_segment_efforts")
      .select("activity_id")
      .eq("profile_id", profileId)
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data as { activity_id: number }[]) ids.add(row.activity_id);
    if (data.length < PAGE) break;
  }
  return ids;
}

export async function storeActivitySegmentEfforts(
  supabase: SupabaseClient,
  profileId: string,
  activity: StoredActivity,
  detail: DetailedActivity,
) {
  const rows = [];
  for (const effort of detail.segment_efforts ?? []) {
    const segment = effort.segment;
    const segmentId = segment?.id;
    if (segmentId == null) continue;
    const elapsed = effort.elapsed_time ?? null;
    const moving = effort.moving_time ?? null;
    const seconds = elapsed ?? moving;
    const startedAt = effort.start_date ?? detail.start_date ?? activity.start_date ?? null;
    const [startLat, startLon] = latLngPair(segment?.start_latlng);
    const [endLat, endLon] = latLngPair(segment?.end_latlng);
    const high = segment?.elevation_high;
    const low = segment?.elevation_low;
    rows.push({
      effort_uid: effort.id
        ? `${profileId}:${effort.id}`
        : effortUid(profileId, activity.id, Number(segmentId), seconds, startedAt),
      profile_id: profileId,
      activity_id: activity.id,
      strava_segment_id: Number(segmentId),
      segment_name: segment?.name ?? effort.name ?? null,
      elapsed_time_seconds: elapsed,
      moving_time_seconds: moving,
      distance_m: segment?.distance ?? effort.distance ?? null,
      elevation_gain_m:
        typeof high === "number" && typeof low === "number" ? high - low : null,
      average_grade: segment?.average_grade ?? effort.average_grade ?? null,
      start_lat: startLat,
      start_lon: startLon,
      end_lat: endLat,
      end_lon: endLon,
      started_at: startedAt,
      raw: effort,
    });
  }

  if (rows.length === 0) return 0;
  const { error } = await supabase
    .from("strava_activity_segment_efforts")
    .upsert(rows, { onConflict: "effort_uid" });
  return error ? 0 : rows.length;
}

export async function mirrorLegacyColsToSegments(
  supabase: SupabaseClient,
  profileId?: string,
) {
  let query = supabase
    .from("profile_climbed_cols")
    .select(
      "profile_id, col_slug, first_activity_id, first_climbed_at, last_activity_id, last_climbed_at, times_climbed, best_time_seconds, best_time_activity_id, best_time_at, updated_at",
    );
  if (profileId) query = query.eq("profile_id", profileId);
  const { data, error } = await query;
  if (error || !data || data.length === 0) return { mirrored: 0 };

  const rows = (data as Array<{
    profile_id: string;
    col_slug: string;
    first_activity_id: number | null;
    first_climbed_at: string;
    last_activity_id: number | null;
    last_climbed_at: string | null;
    times_climbed: number;
    best_time_seconds: number | null;
    best_time_activity_id: number | null;
    best_time_at: string | null;
    updated_at: string;
  }>).map((row) => ({
    profile_id: row.profile_id,
    segment_slug: row.col_slug,
    first_activity_id: row.first_activity_id,
    first_completed_at: row.first_climbed_at,
    last_activity_id: row.last_activity_id,
    last_completed_at: row.last_climbed_at,
    times_completed: row.times_climbed,
    best_time_seconds: row.best_time_seconds,
    best_time_activity_id: row.best_time_activity_id,
    best_time_at: row.best_time_at,
    updated_at: row.updated_at,
  }));

  const { error: upsertError } = await supabase
    .from("profile_completed_segments")
    .upsert(rows, { onConflict: "profile_id,segment_slug" });
  return { mirrored: upsertError ? 0 : rows.length };
}

export async function recomputeCompletedSegmentsForUser(
  supabase: SupabaseClient,
  profileId: string,
) {
  const [{ data: segmentRows }, { data: effortRows }] = await Promise.all([
    supabase
      .from("zwb_segments")
      .select("slug, collection, strava_segment_id")
      .eq("active", true)
      .not("strava_segment_id", "is", null),
    supabase
      .from("strava_activity_segment_efforts")
      .select(
        "profile_id, activity_id, strava_segment_id, segment_name, elapsed_time_seconds, moving_time_seconds, started_at",
      )
      .eq("profile_id", profileId),
  ]);

  const bySegmentId = new Map<number, SegmentRow>();
  const trackedSegmentSlugs = new Set<string>();
  for (const segment of (segmentRows ?? []) as SegmentRow[]) {
    if (segment.strava_segment_id != null) {
      bySegmentId.set(Number(segment.strava_segment_id), segment);
      if (segment.collection !== "cols") trackedSegmentSlugs.add(segment.slug);
    }
  }

  type Aggregate = {
    firstActivityId: number;
    firstAt: string;
    lastActivityId: number;
    lastAt: string;
    count: number;
    bestSeconds: number | null;
    bestActivityId: number | null;
    bestAt: string | null;
  };
  const aggregates = new Map<string, Aggregate>();
  for (const effort of (effortRows ?? []) as EffortRow[]) {
    const segment = bySegmentId.get(Number(effort.strava_segment_id));
    if (!segment || segment.collection === "cols") continue;
    const at = effort.started_at ?? new Date().toISOString();
    const seconds = effort.elapsed_time_seconds ?? effort.moving_time_seconds ?? null;
    const current = aggregates.get(segment.slug);
    if (!current) {
      aggregates.set(segment.slug, {
        firstActivityId: effort.activity_id,
        firstAt: at,
        lastActivityId: effort.activity_id,
        lastAt: at,
        count: 1,
        bestSeconds: seconds,
        bestActivityId: seconds == null ? null : effort.activity_id,
        bestAt: seconds == null ? null : at,
      });
      continue;
    }
    current.count += 1;
    if (at < current.firstAt) {
      current.firstAt = at;
      current.firstActivityId = effort.activity_id;
    }
    if (at > current.lastAt) {
      current.lastAt = at;
      current.lastActivityId = effort.activity_id;
    }
    if (seconds != null && (current.bestSeconds == null || seconds < current.bestSeconds)) {
      current.bestSeconds = seconds;
      current.bestActivityId = effort.activity_id;
      current.bestAt = at;
    }
  }

  const rows = [...aggregates.entries()].map(([slug, info]) => ({
    profile_id: profileId,
    segment_slug: slug,
    first_activity_id: info.firstActivityId,
    first_completed_at: info.firstAt,
    last_activity_id: info.lastActivityId,
    last_completed_at: info.lastAt,
    times_completed: info.count,
    best_time_seconds: info.bestSeconds,
    best_time_activity_id: info.bestActivityId,
    best_time_at: info.bestAt,
    updated_at: new Date().toISOString(),
  }));

  const { data: existingRows } = await supabase
    .from("profile_completed_segments")
    .select("segment_slug")
    .eq("profile_id", profileId);
  const staleSlugs = ((existingRows ?? []) as Array<{ segment_slug: string }>)
    .map((row) => row.segment_slug)
    .filter(
      (slug) => trackedSegmentSlugs.has(slug) && !aggregates.has(slug),
    );
  if (staleSlugs.length > 0) {
    await supabase
      .from("profile_completed_segments")
      .delete()
      .eq("profile_id", profileId)
      .in("segment_slug", staleSlugs);
  }

  if (rows.length === 0) return { completed: 0 };
  const { error } = await supabase
    .from("profile_completed_segments")
    .upsert(rows, { onConflict: "profile_id,segment_slug" });
  return { completed: error ? 0 : rows.length };
}

export async function syncZwbSegmentsForUser(
  supabase: SupabaseClient,
  accessToken: string,
  profileId: string,
  options: { maxFetches?: number; refetchMissingAfterHours?: number } = {},
) {
  const maxFetches = options.maxFetches ?? 20;
  if (maxFetches <= 0) {
    await mirrorLegacyColsToSegments(supabase, profileId);
    const completed = await recomputeCompletedSegmentsForUser(supabase, profileId);
    return { fetched: 0, storedEfforts: 0, completed: completed.completed, rateLimited: false };
  }

  const [activities, fetchedEffortActivityIds] = await Promise.all([
    fetchAllActivities(supabase, profileId),
    effortActivityIds(supabase, profileId),
  ]);
  const refetchAfterMs =
    (options.refetchMissingAfterHours ?? 24 * 30) * 60 * 60 * 1000;
  const now = Date.now();

  const candidates = activities
    .filter((activity) => {
      if (!activity.efforts_fetched_at) return true;
      if (!fetchedEffortActivityIds.has(activity.id)) return true;
      const fetchedAt = Date.parse(activity.efforts_fetched_at);
      return !Number.isFinite(fetchedAt) || now - fetchedAt >= refetchAfterMs;
    })
    .slice(0, maxFetches);

  let fetched = 0;
  let storedEfforts = 0;
  let rateLimited = false;

  for (const activity of candidates) {
    const url = new URL(`https://www.strava.com/api/v3/activities/${activity.id}`);
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
      await supabase
        .from("strava_activities")
        .update({ efforts_fetched_at: new Date().toISOString() })
        .eq("id", activity.id);
      continue;
    }

    const detail = (await res.json()) as DetailedActivity;
    fetched++;
    storedEfforts += await storeActivitySegmentEfforts(
      supabase,
      profileId,
      activity,
      detail,
    );

    await supabase
      .from("strava_activities")
      .update({ efforts_fetched_at: new Date().toISOString() })
      .eq("id", activity.id);

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  if (!rateLimited) {
    const candidates = await resolveCuratedSegments(supabase, accessToken, {
      maxCandidates: 3,
    });
    rateLimited = candidates.rateLimited;
  }

  await mirrorLegacyColsToSegments(supabase, profileId);
  const completed = await recomputeCompletedSegmentsForUser(supabase, profileId);
  return { fetched, storedEfforts, completed: completed.completed, rateLimited };
}

export async function seedBeneluxPopularSegments(
  supabase: SupabaseClient,
  limit = 30,
) {
  const { data: existingRows } = await supabase
    .from("zwb_segments")
    .select("strava_segment_id")
    .not("strava_segment_id", "is", null);
  const existing = new Set(
    ((existingRows ?? []) as { strava_segment_id: number }[]).map((r) =>
      Number(r.strava_segment_id),
    ),
  );

  const { data } = await supabase
    .from("strava_activity_segment_efforts")
    .select(
      "profile_id, strava_segment_id, segment_name, distance_m, elevation_gain_m, average_grade, start_lat, start_lon, end_lat, end_lon",
    );

  type Candidate = {
    segmentId: number;
    name: string;
    profiles: Set<string>;
    efforts: number;
    distance: number | null;
    elevation: number | null;
    grade: number | null;
    start_lat: number | null;
    start_lon: number | null;
    end_lat: number | null;
    end_lon: number | null;
  };
  const candidates = new Map<number, Candidate>();
  for (const row of (data ?? []) as Array<{
    profile_id: string;
    strava_segment_id: number;
    segment_name: string | null;
    distance_m: number | null;
    elevation_gain_m: number | null;
    average_grade: number | null;
    start_lat: number | null;
    start_lon: number | null;
    end_lat: number | null;
    end_lon: number | null;
  }>) {
    const segmentId = Number(row.strava_segment_id);
    if (existing.has(segmentId)) continue;
    if (!isBeneluxEffort(row)) continue;
    const current =
      candidates.get(segmentId) ??
      {
        segmentId,
        name: row.segment_name ?? `Strava segment ${segmentId}`,
        profiles: new Set<string>(),
        efforts: 0,
        distance: row.distance_m,
        elevation: row.elevation_gain_m,
        grade: row.average_grade,
        start_lat: row.start_lat,
        start_lon: row.start_lon,
        end_lat: row.end_lat,
        end_lon: row.end_lon,
      };
    current.profiles.add(row.profile_id);
    current.efforts += 1;
    candidates.set(segmentId, current);
  }

  const top = [...candidates.values()]
    .sort((a, b) => {
      const profileDiff = b.profiles.size - a.profiles.size;
      if (profileDiff !== 0) return profileDiff;
      const effortDiff = b.efforts - a.efforts;
      if (effortDiff !== 0) return effortDiff;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);

  const rows = top.map((candidate) => ({
    slug: slugifySegmentName(candidate.name, "benelux"),
    name: candidate.name,
    collection: "benelux_popular",
    country: inferredCountry(candidate),
    region: "Benelux",
    virtual: false,
    distance_m: candidate.distance,
    elevation_gain_m: candidate.elevation,
    category: "popular",
    strava_segment_id: candidate.segmentId,
    active: true,
    source: "zwb-discovery",
    metadata: {
      distinct_profiles: candidate.profiles.size,
      total_efforts: candidate.efforts,
      average_grade: candidate.grade,
      start_lat: candidate.start_lat,
      start_lon: candidate.start_lon,
      end_lat: candidate.end_lat,
      end_lon: candidate.end_lon,
    },
  }));

  if (rows.length === 0) return { seeded: 0 };
  const { error } = await supabase
    .from("zwb_segments")
    .upsert(rows, { onConflict: "slug" });
  return { seeded: error ? 0 : rows.length };
}

function words(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !["cycling", "climb"].includes(word));
}

function candidateMatches(search: string, segmentName: string) {
  const searchWords = words(search);
  const segmentWords = new Set(words(segmentName));
  if (searchWords.length === 0) return false;
  const hits = searchWords.filter((word) => segmentWords.has(word)).length;
  return hits >= Math.min(2, searchWords.length);
}

export async function resolveCuratedSegments(
  supabase: SupabaseClient,
  accessToken: string,
  options: { maxCandidates?: number } = {},
) {
  const maxCandidates = options.maxCandidates ?? 10;
  const { data: candidates } = await supabase
    .from("zwb_segments")
    .select("slug, name, collection, country, region, metadata")
    .in("collection", ["benelux_popular", "europe_flat"])
    .is("strava_segment_id", null)
    .order("collection", { ascending: true })
    .limit(maxCandidates);

  let resolved = 0;
  let checked = 0;
  let rateLimited = false;

  for (const candidate of (candidates ?? []) as Array<{
    slug: string;
    name: string;
    collection: string;
    country: string | null;
    region: string | null;
    metadata: { search?: string; bounds?: [[number, number], [number, number]] };
  }>) {
    const bounds = candidate.metadata?.bounds;
    if (!bounds) continue;
    checked++;
    const url = new URL("https://www.strava.com/api/v3/segments/explore");
    url.searchParams.set(
      "bounds",
      `${bounds[0][0]},${bounds[0][1]},${bounds[1][0]},${bounds[1][1]}`,
    );
    url.searchParams.set("activity_type", "riding");
    url.searchParams.set("min_cat", "0");
    url.searchParams.set("max_cat", "5");

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
    if (!res.ok) continue;
    const json = (await res.json()) as {
      segments?: Array<{
        id?: number;
        name?: string;
        distance?: number;
        elev_difference?: number;
        avg_grade?: number;
      }>;
    };
    const search = candidate.metadata?.search ?? candidate.name;
    const match = (json.segments ?? []).find(
      (segment) => segment.id && segment.name && candidateMatches(search, segment.name),
    );
    if (!match?.id) continue;

    const { error } = await supabase
      .from("zwb_segments")
      .update({
        name: match.name ?? candidate.name,
        distance_m: match.distance ?? null,
        elevation_gain_m: match.elev_difference ?? null,
        category: "flat",
        strava_segment_id: match.id,
        active: true,
        source: "strava-explore",
        metadata: {
          ...candidate.metadata,
          matched_name: match.name,
          average_grade: match.avg_grade ?? null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("slug", candidate.slug);
    if (!error) resolved++;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return { checked, resolved, rateLimited };
}
