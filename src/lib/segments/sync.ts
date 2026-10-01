// Collecties (uitgekozen segmenten en cols) bijhouden zonder pogingentabel.
//
// Tot oktober 2026 bewaarde ZWB elke Strava-segmentpoging van elke rit
// (strava_activity_segment_efforts, ~1 GB) voor de verkenner en de ZWB KOM's. Die
// zijn verwijderd (migratie 0212, docs/prestatie-onderzoek-2026-09-30.md). Wat
// blijft is de collectiepagina, en die heeft de pogingen niet nodig:
//   - cols komen uit de col-detector en worden hier gespiegeld;
//   - de besttijd per uitgekozen segment komt van Strava's eigen PR;
//   - leden zonder Strava krijgen hun tijd uit de GPS-meting (gps-sync.ts).

type SupabaseClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

type SegmentRow = {
  slug: string;
  collection: string;
  strava_segment_id: number | null;
};

export async function mirrorLegacyColsToSegments(
  supabase: SupabaseClient,
  profileId?: string,
) {
  let query = supabase
    .from("profile_climbed_cols")
    .select(
      "profile_id, col_slug, first_activity_id, first_climbed_at, last_activity_id, last_climbed_at, times_climbed, best_time_seconds, best_time_activity_id, best_time_at, best_time_source, updated_at",
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
    best_time_source: string | null;
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
    best_time_source: row.best_time_source,
    updated_at: row.updated_at,
  }));

  const { error: upsertError } = await supabase
    .from("profile_completed_segments")
    .upsert(rows, { onConflict: "profile_id,segment_slug" });
  return { mirrored: upsertError ? 0 : rows.length };
}

export type CuratedEffortTime = {
  slug: string;
  collection: string;
  seconds: number;
  startedAt: string | null;
};

type DetailWithEfforts = {
  start_date?: string;
  segment_efforts?: Array<{
    elapsed_time?: number;
    moving_time?: number;
    start_date?: string;
    segment?: { id?: number } | null;
  }> | null;
};

/** Snelste tijd per uitgekozen segment in één Strava-rit; puur, los voor de tests. */
export function curatedEffortTimes(
  detail: DetailWithEfforts,
  segments: SegmentRow[],
): CuratedEffortTime[] {
  const byId = new Map<number, SegmentRow>();
  for (const segment of segments) {
    if (segment.strava_segment_id != null) byId.set(Number(segment.strava_segment_id), segment);
  }
  const best = new Map<string, CuratedEffortTime>();
  for (const effort of detail.segment_efforts ?? []) {
    const segment = byId.get(Number(effort.segment?.id));
    const seconds = effort.elapsed_time ?? effort.moving_time ?? 0;
    if (!segment || seconds <= 0) continue;
    const current = best.get(segment.slug);
    if (!current || seconds < current.seconds) {
      best.set(segment.slug, {
        slug: segment.slug,
        collection: segment.collection,
        seconds,
        startedAt: effort.start_date ?? detail.start_date ?? null,
      });
    }
  }
  return [...best.values()];
}

/**
 * Zet de tijden van één binnengekomen Strava-rit op uitgekozen segmenten in de
 * collecties. De rit komt al met al zijn segmentinspanningen binnen
 * (ingest-activity.ts), dus dit kost geen Strava-call. Alleen een snellere tijd
 * overschrijft; het aantal keren gereden komt later van Strava zelf
 * (applyAuthoritativeSegmentPrs), zodat een opnieuw verwerkte rit niet dubbel telt.
 */
export async function applyCuratedEffortsFromDetail(
  supabase: SupabaseClient,
  profileId: string,
  activityId: number,
  detail: DetailWithEfforts,
): Promise<number> {
  if (!detail.segment_efforts?.length) return 0;
  const { data: segmentRows } = await supabase
    .from("zwb_segments")
    .select("slug, collection, strava_segment_id")
    .eq("active", true)
    .not("strava_segment_id", "is", null);
  const times = curatedEffortTimes(detail, (segmentRows ?? []) as SegmentRow[]);
  if (times.length === 0) return 0;

  const { data: existingRows } = await supabase
    .from("profile_completed_segments")
    .select("segment_slug, best_time_seconds, times_completed, first_completed_at, first_activity_id, last_completed_at")
    .eq("profile_id", profileId)
    .in("segment_slug", times.map((time) => time.slug));
  const existing = new Map(
    ((existingRows ?? []) as Array<{
      segment_slug: string;
      best_time_seconds: number | null;
      times_completed: number | null;
      first_completed_at: string | null;
      first_activity_id: number | null;
      last_completed_at: string | null;
    }>).map((row) => [row.segment_slug, row]),
  );

  let applied = 0;
  for (const time of times) {
    const at = time.startedAt ?? new Date().toISOString();
    if (time.collection === "cols") {
      // De rij van een beklommen col maakt de col-detector aan; hier alleen de tijd.
      const { data: climbed } = await supabase
        .from("profile_climbed_cols")
        .select("best_time_seconds")
        .eq("profile_id", profileId)
        .eq("col_slug", time.slug)
        .maybeSingle();
      const previous = (climbed as { best_time_seconds: number | null } | null)?.best_time_seconds;
      if (!climbed || (previous != null && previous <= time.seconds)) continue;
      const { error } = await supabase
        .from("profile_climbed_cols")
        .update({
          best_time_seconds: time.seconds,
          best_time_activity_id: activityId,
          best_time_at: at,
          best_time_source: null,
        })
        .eq("profile_id", profileId)
        .eq("col_slug", time.slug);
      if (!error) applied++;
      continue;
    }

    const row = existing.get(time.slug);
    const faster = row?.best_time_seconds == null || time.seconds < row.best_time_seconds;
    const later = !row?.last_completed_at || at > row.last_completed_at;
    if (row && !faster && !later) continue;
    const { error } = await supabase.from("profile_completed_segments").upsert(
      {
        profile_id: profileId,
        segment_slug: time.slug,
        first_activity_id: row?.first_activity_id ?? activityId,
        first_completed_at: row?.first_completed_at ?? at,
        times_completed: Math.max(row?.times_completed ?? 0, 1),
        ...(later ? { last_activity_id: activityId, last_completed_at: at } : {}),
        ...(faster
          ? {
              best_time_seconds: time.seconds,
              best_time_activity_id: activityId,
              best_time_at: at,
              best_time_source: null,
            }
          : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,segment_slug" },
    );
    if (!error) applied++;
  }
  return applied;
}

// Authoritatieve PR per segment rechtstreeks van Strava. De activity-scan-cache
// is per definitie onvolledig (we halen maar een deel van de ritten op), dus de
// "snelste uit de cache" kan te traag zijn. Strava berekent zelf de PR over ALLE
// efforts van de atleet (athlete_segment_stats.pr_elapsed_time) — dat is de
// waarheid. We schrijven die over de berekende best_time heen. Dit lost het
// permanent op: ongeacht welke ritten gescand zijn, klopt de recordtijd.
export async function applyAuthoritativeSegmentPrs(
  supabase: SupabaseClient,
  accessToken: string,
  profileId: string,
  options: { maxSegments?: number } = {},
) {
  const maxSegments = options.maxSegments ?? 100;
  const { data: segs } = await supabase
    .from("zwb_segments")
    .select("slug, collection, strava_segment_id")
    .eq("active", true)
    .not("strava_segment_id", "is", null)
    .limit(maxSegments);

  let checked = 0;
  let updated = 0;
  let rateLimited = false;

  for (const seg of (segs ?? []) as SegmentRow[]) {
    let res: Response;
    try {
      res = await fetch(`https://www.strava.com/api/v3/segments/${seg.strava_segment_id}`, {
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
    checked++;

    const detail = (await res.json()) as {
      athlete_segment_stats?: {
        pr_elapsed_time?: number | null;
        pr_date?: string | null;
        pr_activity_id?: number | null;
        effort_count?: number | null;
      } | null;
    };
    const stats = detail.athlete_segment_stats;
    const pr = stats?.pr_elapsed_time ?? null;
    const effortCount = stats?.effort_count ?? 0;
    // Geen geldige PR (atleet heeft geen effort) → overslaan.
    if (pr == null || pr <= 0 || effortCount <= 0) continue;

    const { data: existing } = await supabase
      .from("profile_completed_segments")
      .select("first_activity_id, first_completed_at, times_completed")
      .eq("profile_id", profileId)
      .eq("segment_slug", seg.slug)
      .maybeSingle();

    const prDate = stats?.pr_date ?? null;
    const { error } = await supabase.from("profile_completed_segments").upsert(
      {
        profile_id: profileId,
        segment_slug: seg.slug,
        best_time_seconds: pr,
        best_time_activity_id: stats?.pr_activity_id ?? null,
        best_time_at: prDate,
        best_time_source: null,
        times_completed: Math.max(
          effortCount,
          (existing as { times_completed?: number } | null)?.times_completed ?? 0,
        ),
        first_activity_id:
          (existing as { first_activity_id?: number } | null)?.first_activity_id ??
          stats?.pr_activity_id ??
          null,
        first_completed_at:
          (existing as { first_completed_at?: string } | null)?.first_completed_at ??
          prDate ??
          new Date().toISOString(),
        last_activity_id: stats?.pr_activity_id ?? null,
        last_completed_at: prDate ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,segment_slug" },
    );
    if (!error) updated++;

    // Virtuele/echte cols hebben hun recordtijd óók in profile_climbed_cols
    // (gebruikt door /profiel/cols + de mirror). Werk de bestaande rij bij met
    // de authoritatieve PR zodat beide weergaven kloppen.
    if (seg.collection === "cols") {
      await supabase
        .from("profile_climbed_cols")
        .update({
          best_time_seconds: pr,
          best_time_activity_id: stats?.pr_activity_id ?? null,
          best_time_at: prDate,
          best_time_source: null,
          updated_at: new Date().toISOString(),
        })
        .eq("profile_id", profileId)
        .eq("col_slug", seg.slug);
    }

    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  return { checked, updated, rateLimited };
}

export async function syncZwbSegmentsForUser(
  supabase: SupabaseClient,
  accessToken: string,
  profileId: string,
  options: { resolveCandidates?: number } = {},
) {
  let rateLimited = false;
  const resolveCandidates = options.resolveCandidates ?? 0;
  if (resolveCandidates > 0) {
    const candidates = await resolveCuratedSegments(supabase, accessToken, {
      maxCandidates: resolveCandidates,
    });
    rateLimited = candidates.rateLimited;
  }

  const mirrored = await mirrorLegacyColsToSegments(supabase, profileId);
  let updated = 0;
  if (!rateLimited) {
    const authoritative = await applyAuthoritativeSegmentPrs(supabase, accessToken, profileId);
    rateLimited = authoritative.rateLimited;
    updated = authoritative.updated;
  }
  return { completed: mirrored.mirrored + updated, rateLimited };
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
