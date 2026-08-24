// Gedeelde context-helper voor de adaptieve dag-coach: wat had de renner
// gisteren gepland vs. wat deed die werkelijk. Gebruikt door zowel de
// renner-actie "pas vandaag aan" als de dagelijkse cron.

import {
  rideMetricsFromStrava,
  STRAVA_RIDE_COLUMNS,
  type StravaRideRow,
} from "@/lib/training/ride-metrics";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

type YesterdayContext = {
  plannedTitle: string | null;
  plannedMinutes: number | null;
  plannedIntensity: string | null;
  actualName: string | null;
  actualMinutes: number | null;
  actualLoad: number | null;
  athleteRpe: number | null;
  athleteFeel: string | null;
  athleteReport: string | null;
};

export async function buildYesterdayContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
  planId: string | null,
): Promise<YesterdayContext | null> {
  const now = Date.now();
  const yesterday = new Date(now - 24 * 3600_000);
  const yKey = amsterdamDayKey(yesterday);
  const fromIso = new Date(now - 48 * 3600_000).toISOString();
  const toIso = new Date(now).toISOString();

  // Geplande workout van gisteren (binnen het actieve plan).
  let plannedTitle: string | null = null;
  let plannedMinutes: number | null = null;
  let plannedIntensity: string | null = null;
  let plannedWorkoutId: string | null = null;
  if (planId) {
    const { data: planned } = await admin
      .from("training_workouts")
      .select("id, title, duration_minutes, intensity, scheduled_at")
      .is("superseded_at", null)
      .eq("plan_id", planId)
      .gte("scheduled_at", fromIso)
      .lte("scheduled_at", toIso)
      .order("scheduled_at");
    const match = (planned ?? []).find(
      (w: { scheduled_at: string }) =>
        amsterdamDayKey(new Date(w.scheduled_at)) === yKey,
    );
    if (match) {
      plannedWorkoutId = match.id ?? null;
      plannedTitle = match.title ?? null;
      plannedMinutes = match.duration_minutes ?? null;
      plannedIntensity = match.intensity ?? null;
    }
  }

  // Werkelijke rit van gisteren (langste die dag). Uit Strava, want intervals.icu
  // geeft via de API geen cijfers voor activiteiten die daar via Strava
  // binnenkwamen — zie ride-metrics.ts.
  const [{ data: rides }, { data: profile }, { data: report }] = await Promise.all([
    admin
      .from("strava_activities")
      .select(STRAVA_RIDE_COLUMNS)
      .eq("profile_id", profileId)
      .gte("start_date", fromIso)
      .lte("start_date", toIso)
      .order("moving_time_seconds", { ascending: false }),
    admin.from("profiles").select("ftp_watts").eq("id", profileId).maybeSingle(),
    plannedWorkoutId
      ? admin
          .from("training_workout_reports")
          .select("athlete_rpe, athlete_feel, athlete_report")
          .eq("profile_id", profileId)
          .eq("workout_id", plannedWorkoutId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const actual = ((rides ?? []) as StravaRideRow[]).find(
    (ride) => amsterdamDayKey(new Date(ride.start_date)) === yKey,
  );

  const metrics = actual
    ? rideMetricsFromStrava(
        actual.raw,
        actual.moving_time_seconds,
        profile?.ftp_watts == null ? null : Number(profile.ftp_watts),
      )
    : null;

  // Niets om mee te geven → null zodat de prompt het kan negeren.
  if (plannedTitle == null && plannedMinutes == null && actual == null) {
    return null;
  }

  return {
    plannedTitle,
    plannedMinutes,
    plannedIntensity,
    actualName: actual?.name ?? null,
    actualMinutes: metrics?.movingMinutes ?? null,
    actualLoad: metrics?.tss ?? null,
    athleteRpe: report?.athlete_rpe ?? null,
    athleteFeel: report?.athlete_feel ?? null,
    athleteReport: report?.athlete_report ?? null,
  };
}
