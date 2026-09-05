// Eén rit ophalen en opslaan, op basis van een webhook-event.
//
// Dit is de kern van de omslag die Strava eist: in plaats van elk kwartier voor
// elk lid een paginascan te doen, halen we precies één rit op wanneer die
// daadwerkelijk is gereden. Eén call per rit, in plaats van tientallen calls per
// uur die "niets nieuws" opleveren.
//
// De call gaat bewust met include_all_efforts=true. Dat kost niets extra's, maar
// levert meteen ook de segment-inspanningen — waar syncColSegmentTimesForUser en
// syncZwbSegmentsForUser vandaag nog hun eigen detailcall per rit voor doen. Die
// staan in de cron daarom op 0 (STRAVA_SYNC_COL_SEGMENT_MAX_FETCHES=0): het
// budget was op. Via dit pad komen coltijden en ZWB-segmenttijden gratis mee.

import { storeActivitySegmentEfforts } from "@/lib/segments/sync";
import { isCyclingSportType } from "@/lib/strava/sports";
import { weekStartDate } from "@/lib/strava/client";
import { recordRateLimitUsage } from "@/lib/strava/rate-limit-budget";

const STRAVA_API = "https://www.strava.com/api/v3";
const TIMEOUT_MS = 8000;

/**
 * Detailvelden die we niet bewaren. Bewust een deny-list en geen allow-list: het
 * detailobject is een superset van de SummaryActivity die het reconcile-pad
 * opslaat, en een allow-list zou stilletjes een veld kwijtraken dat een consument
 * uit `raw` leest (cols/detector.ts, milestone-evaluators.ts, pacing/draft.ts).
 * Wat hier wél weg moet zijn de lijsten die per rit tot honderden kB's groeien.
 */
export const RAW_DETAIL_DROP_KEYS = [
  "segment_efforts",
  "best_efforts",
  "laps",
  "splits_metric",
  "splits_standard",
  "similar_activities",
  "photos",
  "highlighted_kudosers",
  "available_zones",
  "stats_visibility",
] as const;

export type StravaDetailedActivity = Record<string, unknown> & {
  id?: number;
  name?: string;
  sport_type?: string;
  type?: string;
  start_date?: string;
};

/** Puur: haalt de bulk uit het detailobject vóór opslag in `raw`. */
export function trimActivityRaw(detail: StravaDetailedActivity): Record<string, unknown> {
  const trimmed: Record<string, unknown> = { ...detail };
  for (const key of RAW_DETAIL_DROP_KEYS) delete trimmed[key];
  return trimmed;
}

export type ActivityRow = {
  id: number;
  profile_id: string;
  strava_athlete_id: number;
  name: string;
  sport_type: string | null;
  start_date: string;
  achievement_week: string;
  distance_m: number;
  total_elevation_gain_m: number;
  kudos_count: number;
  moving_time_seconds: number;
  elapsed_time_seconds: number;
  trainer: boolean;
  commute: boolean;
  raw: Record<string, unknown>;
  synced_at: string;
};

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Puur: detailobject → rij in strava_activities, in exact dezelfde vorm als het
 * reconcile-pad (syncStravaActivitiesForUser). Beide paden schrijven naar dezelfde
 * tabel, dus elk verschil hier levert ritten op die er anders uitzien al naar
 * gelang hoe ze binnenkwamen.
 */
export function activityRowFromDetail(
  detail: StravaDetailedActivity,
  profileId: string,
  stravaAthleteId: number,
): ActivityRow | null {
  const id = Number(detail.id);
  const startDateRaw = detail.start_date;
  if (!Number.isFinite(id) || !startDateRaw) return null;

  const startDate = new Date(String(startDateRaw));
  if (Number.isNaN(startDate.getTime())) return null;

  return {
    id,
    profile_id: profileId,
    strava_athlete_id: stravaAthleteId,
    name: detail.name ?? "Strava activiteit",
    sport_type: detail.sport_type ?? detail.type ?? null,
    start_date: startDate.toISOString(),
    achievement_week: weekStartDate(startDate).toISOString().slice(0, 10),
    distance_m: num(detail.distance),
    total_elevation_gain_m: num(detail.total_elevation_gain),
    kudos_count: num(detail.kudos_count),
    moving_time_seconds: num(detail.moving_time),
    elapsed_time_seconds: num(detail.elapsed_time),
    trainer: Boolean(detail.trainer),
    commute: Boolean(detail.commute),
    raw: trimActivityRaw(detail),
    synced_at: new Date().toISOString(),
  };
}

export type IngestOutcome =
  | { status: "stored"; activityId: number; efforts: number }
  | { status: "removed"; activityId: number; reason: "not_cycling" | "gone" }
  | { status: "skipped"; reason: string }
  | { status: "rate_limited" }
  | { status: "auth_failed" }
  | { status: "failed"; error: string };

export type IngestTarget = {
  profileId: string;
  stravaAthleteId: number;
};

/**
 * Haalt één activiteit op en zet 'm weg, inclusief segment-inspanningen.
 *
 * Een 404 betekent dat de rit inmiddels weg is bij Strava (verwijderd, of op privé
 * gezet tussen het event en onze call in). Dan ruimen we 'm lokaal ook op —
 * hetzelfde eindresultaat als een delete-event.
 */
export async function ingestStravaActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  target: IngestTarget,
  activityId: number,
  accessToken: string,
): Promise<IngestOutcome> {
  const url = new URL(`${STRAVA_API}/activities/${activityId}`);
  url.searchParams.set("include_all_efforts", "true");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : "Strava-activiteit ophalen faalde.",
    };
  }

  await recordRateLimitUsage(admin, res.headers);

  if (res.status === 429) return { status: "rate_limited" };
  if (res.status === 401 || res.status === 403) return { status: "auth_failed" };
  if (res.status === 404 || res.status === 410) {
    await removeStravaActivity(admin, target.profileId, activityId);
    return { status: "removed", activityId, reason: "gone" };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      status: "failed",
      error: `Strava-activiteit ophalen faalde (${res.status}): ${text.slice(0, 160)}`,
    };
  }

  const detail = (await res.json()) as StravaDetailedActivity;

  // Een update-event kan een rit van Ride naar Run zetten. Dan hoort hij hier niet
  // meer te staan, ook niet als we 'm eerder wél hebben opgeslagen.
  if (!isCyclingSportType(detail.sport_type ?? detail.type)) {
    await removeStravaActivity(admin, target.profileId, activityId);
    return { status: "removed", activityId, reason: "not_cycling" };
  }

  const row = activityRowFromDetail(detail, target.profileId, target.stravaAthleteId);
  if (!row) return { status: "skipped", reason: "Onvolledige activiteit." };

  const { error } = await admin
    .from("strava_activities")
    .upsert(row, { onConflict: "id" });
  if (error) return { status: "failed", error: error.message };

  // De efforts komen uit dezelfde response; geen extra call.
  let efforts = 0;
  try {
    efforts = await storeActivitySegmentEfforts(
      admin,
      target.profileId,
      { id: row.id, start_date: row.start_date, efforts_fetched_at: null },
      detail,
    );
    await admin
      .from("strava_activities")
      .update({ efforts_fetched_at: new Date().toISOString() })
      .eq("id", row.id);
  } catch {
    // niet kritiek: de segmenttijden lopen anders via de nachtelijke reconcile
  }

  return { status: "stored", activityId: row.id, efforts };
}

/**
 * Verwijdert een rit lokaal. strava_activity_segment_efforts en
 * strava_activity_summaries hangen er met `on delete cascade` aan (migraties 0072
 * en 0102), dus die gaan mee. profile_climbed_cols.best_time_activity_id staat op
 * `on delete set null` (0075) en wordt daarna door repairDeletedColBestTimesForUser
 * opnieuw berekend.
 */
export async function removeStravaActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
  activityId: number,
): Promise<boolean> {
  const { count } = await admin
    .from("strava_activities")
    .delete({ count: "exact" })
    .eq("profile_id", profileId)
    .eq("id", activityId);
  return (count ?? 0) > 0;
}
