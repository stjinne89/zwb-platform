// Eigen tijden (segments/gps-sync.ts) naar de collecties.
//
// gps-sync.ts bewaart per rit wat het gemeten heeft: `raw.gps_segment_times` voor
// uitgekozen segmenten en cols met een Strava-segment, `raw.gps_col_times` voor
// cols zonder segment. Hier gaan die tijden naar profile_climbed_cols en
// profile_completed_segments.
//
// De coltijden draaien na de col-detector: die maakt de rij van een beklommen col
// aan, en pas daarna is er een rij om een tijd in te zetten. Een eigen tijd komt
// er alleen in als er nog geen tijd staat of als hij sneller is.
// best_time_source = 'gps' is het herkomstlabel; een Strava-tijd zet hem terug op
// null (segment-times.ts, segments/sync.ts).

import type { GpsColTime, GpsSegmentTime } from "@/lib/segments/gps-sync";

type Best = { seconds: number; activityId: number; at: string | null };

type GpsActivity = { id: number; col_times?: unknown; segment_times?: unknown };

function faster(current: Best | undefined, next: Best): boolean {
  return !current || next.seconds < current.seconds;
}

function segmentTimesOf(activity: GpsActivity): GpsSegmentTime[] {
  if (!Array.isArray(activity.segment_times)) return [];
  return (activity.segment_times as GpsSegmentTime[]).filter(
    (time) => time?.segment_id != null && Number.isFinite(Number(time.seconds)) && Number(time.seconds) > 0,
  );
}

/** Snelste eigen tijd per col, puur; los voor de tests. */
export function bestGpsColTimes(input: {
  cols: Array<{ slug: string; strava_segment_id: number | string | null }>;
  activities: GpsActivity[];
}): Map<string, Best> {
  const slugBySegment = new Map<string, string>();
  for (const col of input.cols) {
    if (col.strava_segment_id != null) slugBySegment.set(String(col.strava_segment_id), col.slug);
  }

  const best = new Map<string, Best>();
  for (const activity of input.activities) {
    for (const time of segmentTimesOf(activity)) {
      const slug = slugBySegment.get(String(time.segment_id));
      if (!slug) continue;
      const next = { seconds: Number(time.seconds), activityId: Number(activity.id), at: time.started_at ?? null };
      if (faster(best.get(slug), next)) best.set(slug, next);
    }
    if (!Array.isArray(activity.col_times)) continue;
    for (const time of activity.col_times as GpsColTime[]) {
      const seconds = Number(time?.seconds);
      if (!time?.slug || !Number.isFinite(seconds) || seconds <= 0) continue;
      const next = { seconds, activityId: Number(activity.id), at: time.started_at ?? null };
      if (faster(best.get(time.slug), next)) best.set(time.slug, next);
    }
  }
  return best;
}

export type GpsSegmentAggregate = {
  slug: string;
  count: number;
  firstAt: string | null;
  firstActivityId: number;
  lastAt: string | null;
  lastActivityId: number;
  best: Best;
};

/** Eigen tijden per uitgekozen segment (geen cols), puur; los voor de tests. */
export function gpsSegmentAggregates(input: {
  segments: Array<{ slug: string; collection: string; strava_segment_id: number | string | null }>;
  activities: GpsActivity[];
}): GpsSegmentAggregate[] {
  const slugBySegment = new Map<string, string>();
  for (const segment of input.segments) {
    if (segment.strava_segment_id != null && segment.collection !== "cols") {
      slugBySegment.set(String(segment.strava_segment_id), segment.slug);
    }
  }

  const aggregates = new Map<string, GpsSegmentAggregate>();
  for (const activity of input.activities) {
    for (const time of segmentTimesOf(activity)) {
      const slug = slugBySegment.get(String(time.segment_id));
      if (!slug) continue;
      const at = time.started_at ?? null;
      const next = { seconds: Number(time.seconds), activityId: Number(activity.id), at };
      const current = aggregates.get(slug);
      if (!current) {
        aggregates.set(slug, {
          slug,
          count: 1,
          firstAt: at,
          firstActivityId: next.activityId,
          lastAt: at,
          lastActivityId: next.activityId,
          best: next,
        });
        continue;
      }
      current.count += 1;
      if (at && (!current.firstAt || at < current.firstAt)) {
        current.firstAt = at;
        current.firstActivityId = next.activityId;
      }
      if (at && (!current.lastAt || at > current.lastAt)) {
        current.lastAt = at;
        current.lastActivityId = next.activityId;
      }
      if (faster(current.best, next)) current.best = next;
    }
  }
  return [...aggregates.values()];
}

async function gpsActivities(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
): Promise<GpsActivity[]> {
  const select = "id, col_times:raw->gps_col_times, segment_times:raw->gps_segment_times";
  const [withCols, withSegments] = await Promise.all([
    admin.from("strava_activities").select(select).eq("profile_id", profileId).not("raw->gps_col_times", "is", null),
    admin.from("strava_activities").select(select).eq("profile_id", profileId).not("raw->gps_segment_times", "is", null),
  ]);
  const byId = new Map<number, GpsActivity>();
  for (const row of [...(withCols.data ?? []), ...(withSegments.data ?? [])] as GpsActivity[]) {
    byId.set(Number(row.id), row);
  }
  return [...byId.values()];
}

export async function applyGpsColTimesForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
): Promise<{ updated: number }> {
  const [{ data: cols }, activities] = await Promise.all([
    admin.from("cols").select("slug, strava_segment_id"),
    gpsActivities(admin, profileId),
  ]);
  const best = bestGpsColTimes({
    cols: (cols ?? []) as Array<{ slug: string; strava_segment_id: number | null }>,
    activities,
  });
  if (best.size === 0) return { updated: 0 };

  const { data: climbed } = await admin
    .from("profile_climbed_cols")
    .select("col_slug, best_time_seconds")
    .eq("profile_id", profileId)
    .in("col_slug", [...best.keys()]);

  let updated = 0;
  for (const row of (climbed ?? []) as Array<{ col_slug: string; best_time_seconds: number | null }>) {
    const time = best.get(row.col_slug);
    if (!time) continue;
    if (row.best_time_seconds != null && row.best_time_seconds <= time.seconds) continue;
    const { error } = await admin
      .from("profile_climbed_cols")
      .update({
        best_time_seconds: time.seconds,
        best_time_activity_id: time.activityId,
        best_time_at: time.at,
        best_time_source: "gps",
      })
      .eq("profile_id", profileId)
      .eq("col_slug", row.col_slug);
    if (!error) updated += 1;
  }
  return { updated };
}

/**
 * Eigen tijden op uitgekozen segmenten naar profile_completed_segments. Maakt de
 * rij aan als het lid het segment nog niet had; een bestaande tijd wijkt alleen
 * voor een snellere.
 */
export async function applyGpsSegmentTimesForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
): Promise<{ updated: number }> {
  const activities = await gpsActivities(admin, profileId);
  if (activities.length === 0) return { updated: 0 };
  const { data: segments } = await admin
    .from("zwb_segments")
    .select("slug, collection, strava_segment_id")
    .eq("active", true)
    .not("strava_segment_id", "is", null);
  const aggregates = gpsSegmentAggregates({ segments: segments ?? [], activities });
  if (aggregates.length === 0) return { updated: 0 };

  const { data: existingRows } = await admin
    .from("profile_completed_segments")
    .select(
      "segment_slug, best_time_seconds, times_completed, first_completed_at, first_activity_id, last_completed_at, last_activity_id",
    )
    .eq("profile_id", profileId)
    .in(
      "segment_slug",
      aggregates.map((aggregate) => aggregate.slug),
    );
  const existing = new Map(
    ((existingRows ?? []) as Array<{
      segment_slug: string;
      best_time_seconds: number | null;
      times_completed: number | null;
      first_completed_at: string | null;
      first_activity_id: number | null;
      last_completed_at: string | null;
      last_activity_id: number | null;
    }>).map((row) => [row.segment_slug, row]),
  );

  let updated = 0;
  for (const aggregate of aggregates) {
    const row = existing.get(aggregate.slug);
    const isFaster = row?.best_time_seconds == null || aggregate.best.seconds < row.best_time_seconds;
    const moreRides = aggregate.count > (row?.times_completed ?? 0);
    if (row && !isFaster && !moreRides) continue;
    const now = new Date().toISOString();
    const { error } = await admin.from("profile_completed_segments").upsert(
      {
        profile_id: profileId,
        segment_slug: aggregate.slug,
        first_activity_id: row?.first_activity_id ?? aggregate.firstActivityId,
        first_completed_at: row?.first_completed_at ?? aggregate.firstAt ?? now,
        last_activity_id: row?.last_activity_id ?? aggregate.lastActivityId,
        last_completed_at: row?.last_completed_at ?? aggregate.lastAt ?? now,
        times_completed: Math.max(row?.times_completed ?? 0, aggregate.count),
        ...(isFaster
          ? {
              best_time_seconds: aggregate.best.seconds,
              best_time_activity_id: aggregate.best.activityId,
              best_time_at: aggregate.best.at,
              best_time_source: "gps",
            }
          : {}),
        updated_at: now,
      },
      { onConflict: "profile_id,segment_slug" },
    );
    if (!error) updated += 1;
  }
  return { updated };
}
