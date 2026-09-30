// Eigen coltijden (segments/gps-sync.ts) naar profile_climbed_cols.
//
// Draait na de col-detector: die maakt de rij van een beklommen col aan, en pas
// daarna is er een rij om een tijd in te zetten. Een eigen tijd komt er alleen in
// als er nog geen tijd staat of als hij sneller is. best_time_source = 'gps' is
// het herkomstlabel; een Strava-tijd zet hem terug op null (segment-times.ts).

import { GPS_EFFORT_PREFIX, type GpsColTime } from "@/lib/segments/gps-sync";

type Best = { seconds: number; activityId: number; at: string | null };

function faster(current: Best | undefined, next: Best): boolean {
  return !current || next.seconds < current.seconds;
}

/** Snelste eigen tijd per col, puur; los voor de tests. */
export function bestGpsColTimes(input: {
  cols: Array<{ slug: string; strava_segment_id: number | string | null }>;
  efforts: Array<{ activity_id: number; strava_segment_id: number | string; elapsed_time_seconds: number | null; started_at: string | null }>;
  activities: Array<{ id: number; col_times: unknown }>;
}): Map<string, Best> {
  const slugBySegment = new Map<string, string>();
  for (const col of input.cols) {
    if (col.strava_segment_id != null) slugBySegment.set(String(col.strava_segment_id), col.slug);
  }

  const best = new Map<string, Best>();
  for (const effort of input.efforts) {
    const slug = slugBySegment.get(String(effort.strava_segment_id));
    const seconds = effort.elapsed_time_seconds ?? 0;
    if (!slug || seconds <= 0) continue;
    const next = { seconds, activityId: Number(effort.activity_id), at: effort.started_at };
    if (faster(best.get(slug), next)) best.set(slug, next);
  }
  for (const activity of input.activities) {
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

export async function applyGpsColTimesForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
): Promise<{ updated: number }> {
  const { data: cols } = await admin.from("cols").select("slug, strava_segment_id");
  const colList = (cols ?? []) as Array<{ slug: string; strava_segment_id: number | null }>;
  const segmentIds = colList.flatMap((col) => (col.strava_segment_id == null ? [] : [col.strava_segment_id]));

  const [effortResult, activityResult] = await Promise.all([
    segmentIds.length === 0
      ? { data: [] }
      : admin
          .from("strava_activity_segment_efforts")
          .select("activity_id, strava_segment_id, elapsed_time_seconds, started_at")
          .eq("profile_id", profileId)
          .like("effort_uid", `${GPS_EFFORT_PREFIX}%`)
          .in("strava_segment_id", segmentIds),
    admin
      .from("strava_activities")
      .select("id, col_times:raw->gps_col_times")
      .eq("profile_id", profileId)
      .not("raw->gps_col_times", "is", null),
  ]);

  const best = bestGpsColTimes({
    cols: colList,
    efforts: effortResult.data ?? [],
    activities: activityResult.data ?? [],
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
