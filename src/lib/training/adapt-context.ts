// Gedeelde context-helper voor de adaptieve dag-coach: wat had de renner
// gisteren gepland vs. wat deed die werkelijk. Gebruikt door zowel de
// renner-actie "pas vandaag aan" als de dagelijkse cron.

import {
  rideMetricsFromStrava,
  STRAVA_RIDE_COLUMNS,
  type StravaRideRow,
} from "@/lib/training/ride-metrics";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { loadFtpAt, type FtpAt } from "@/lib/training/ftp-history";

/** Hoeveel dagen vóór gisteren een niet-gereden training nog meetelt als "net gemist". */
export const RECENTLY_MISSED_DAYS = 3;

export type YesterdayContext = {
  plannedTitle: string | null;
  plannedMinutes: number | null;
  plannedIntensity: string | null;
  actualName: string | null;
  actualMinutes: number | null;
  actualLoad: number | null;
  /**
   * De training waar de rit van gisteren aan hangt, als dat níét de training van
   * gisteren is: het lid reed bijvoorbeeld de training van eergisteren een dag
   * later. `confirmed` zegt of het lid dat zelf heeft bevestigd.
   */
  actualCountsFor: {
    date: string;
    title: string;
    intensity: string;
    confirmed: boolean;
  } | null;
  /** Geplande trainingen van de dagen vóór gisteren die niet zijn gereden. */
  recentlyMissed: Array<{ date: string; title: string; intensity: string }>;
  athleteRpe: number | null;
  athleteFeel: string | null;
  athleteReport: string | null;
};

type WorkoutRow = {
  id: string;
  title: string;
  duration_minutes: number | null;
  intensity: string;
  scheduled_at: string;
  status: string;
};

type PairingRow = {
  workout_id: string;
  paired_activity_id: string | null;
  athlete_confirmed_at: string | null;
  athlete_rpe: number | null;
  athlete_feel: string | null;
  athlete_report: string | null;
};

function shiftDayKey(dayKey: string, days: number) {
  const date = new Date(`${dayKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Pure kern van buildYesterdayContext. Los te testen, en zonder de klok van het
 * proces: `yesterdayKey` is een Amsterdamse kalenderdag.
 *
 * Tot 13 september 2026 was "de rit van gisteren" simpelweg de langste rit van
 * die dag, vergeleken met de training die gisteren gepland stond. Wie de
 * sweetspot van donderdag op vrijdag reed, kreeg die rit daardoor voorgelegd als
 * zwaardere variant van de rustige vrijdagtraining, en de AI noemde zaterdag
 * "herstel na extra sweet spot". Nu gaat een vastgelegde koppeling voor, en
 * krijgt de AI de trainingen die net gemist zijn erbij.
 */
export function yesterdayContextFrom(input: {
  yesterdayKey: string;
  workouts: WorkoutRow[];
  rides: StravaRideRow[];
  pairings: PairingRow[];
  /** Vaste FTP, of de FTP op de ritdag (0175). */
  ftpWatts: number | null | FtpAt;
}): YesterdayContext | null {
  const { yesterdayKey, ftpWatts } = input;
  const dayOf = (iso: string) => amsterdamDayKey(new Date(iso));
  const workoutsById = new Map(input.workouts.map((workout) => [workout.id, workout]));
  const pairingByRide = new Map(
    input.pairings
      .filter((row) => row.paired_activity_id)
      .map((row) => [String(row.paired_activity_id), row]),
  );
  const pairedWorkoutIds = new Set(
    input.pairings.filter((row) => row.paired_activity_id).map((row) => row.workout_id),
  );

  const planned =
    input.workouts
      .filter((workout) => workout.intensity !== "rest" && dayOf(workout.scheduled_at) === yesterdayKey)
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0] ?? null;

  const ridesYesterday = input.rides
    .filter((ride) => dayOf(ride.start_date) === yesterdayKey)
    .sort((a, b) => (b.moving_time_seconds ?? 0) - (a.moving_time_seconds ?? 0));
  // Eerst de rit die aan de geplande training van gisteren hangt, anders de langste.
  const actual =
    ridesYesterday.find(
      (ride) => planned && pairingByRide.get(String(ride.id))?.workout_id === planned.id,
    ) ??
    ridesYesterday[0] ??
    null;

  const recentlyMissed = input.workouts
    .filter((workout) => {
      const day = dayOf(workout.scheduled_at);
      return (
        workout.intensity !== "rest" &&
        workout.status === "planned" &&
        !pairedWorkoutIds.has(workout.id) &&
        day < yesterdayKey &&
        day >= shiftDayKey(yesterdayKey, -RECENTLY_MISSED_DAYS)
      );
    })
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((workout) => ({
      date: dayOf(workout.scheduled_at),
      title: workout.title,
      intensity: workout.intensity,
    }));

  if (!planned && !actual) return null;

  const pairing = actual ? pairingByRide.get(String(actual.id)) : undefined;
  const pairedWorkout = pairing ? workoutsById.get(pairing.workout_id) : undefined;
  const actualCountsFor =
    pairedWorkout && pairedWorkout.id !== planned?.id
      ? {
          date: dayOf(pairedWorkout.scheduled_at),
          title: pairedWorkout.title,
          intensity: pairedWorkout.intensity,
          confirmed: Boolean(pairing?.athlete_confirmed_at),
        }
      : null;
  // Wat het lid invulde hoort bij de rit; zonder rit bij de training van gisteren.
  const report =
    pairing ??
    (planned ? input.pairings.find((row) => row.workout_id === planned.id) : undefined);

  const metrics = actual
    ? rideMetricsFromStrava(actual.raw, actual.moving_time_seconds, ftpWatts)
    : null;

  return {
    plannedTitle: planned?.title ?? null,
    plannedMinutes: planned?.duration_minutes ?? null,
    plannedIntensity: planned?.intensity ?? null,
    actualName: actual?.name ?? null,
    actualMinutes: metrics?.movingMinutes ?? null,
    actualLoad: metrics?.tss ?? null,
    actualCountsFor,
    recentlyMissed,
    athleteRpe: report?.athlete_rpe ?? null,
    athleteFeel: report?.athlete_feel ?? null,
    athleteReport: report?.athlete_report ?? null,
  };
}

export type TodayRide = { name: string | null; minutes: number | null; load: number | null };

/**
 * De ritten van vandaag, Amsterdamse dag, langste eerst. Pure kern van
 * buildTodayRides.
 */
export function todayRidesFrom(input: {
  todayKey: string;
  rides: StravaRideRow[];
  ftpWatts: number | null;
}): TodayRide[] {
  return input.rides
    .filter((ride) => amsterdamDayKey(new Date(ride.start_date)) === input.todayKey)
    .sort((a, b) => (b.moving_time_seconds ?? 0) - (a.moving_time_seconds ?? 0))
    .map((ride) => {
      const metrics = rideMetricsFromStrava(ride.raw, ride.moving_time_seconds, input.ftpWatts);
      return { name: ride.name, minutes: metrics.movingMinutes, load: metrics.tss };
    });
}

/**
 * Wat het lid vandaag al heeft gereden.
 *
 * Een dag-aanpassing kende alleen gisteren. Op 12 september 2026 vroeg een lid
 * 's avonds, na een rit van bijna drie uur, om een lange training voor vandaag;
 * de AI zag een lege dag en zette er een VO2max-sessie van 180 minuten op.
 */
export async function buildTodayRides(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
): Promise<TodayRide[]> {
  const now = Date.now();
  const [{ data: rides }, { data: profile }] = await Promise.all([
    admin
      .from("strava_activities")
      .select(STRAVA_RIDE_COLUMNS)
      .eq("profile_id", profileId)
      .gte("start_date", new Date(now - 26 * 3600_000).toISOString())
      .lte("start_date", new Date(now).toISOString()),
    admin.from("profiles").select("ftp_watts").eq("id", profileId).maybeSingle(),
  ]);
  return todayRidesFrom({
    todayKey: amsterdamDayKey(new Date(now)),
    rides: (rides ?? []) as StravaRideRow[],
    ftpWatts: profile?.ftp_watts == null ? null : Number(profile.ftp_watts),
  });
}

export async function buildYesterdayContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  // Bewust geen plan_id meer: dagaanpassingen wonen in afgeleide plannen, dus de
  // training van gisteren stond vaak niet onder het plan waarmee werd gefilterd.
  profileId: string,
): Promise<YesterdayContext | null> {
  const now = Date.now();
  const yesterdayKey = amsterdamDayKey(new Date(now - 24 * 3600_000));
  const fromIso = new Date(now - (RECENTLY_MISSED_DAYS + 2) * 24 * 3600_000).toISOString();
  const toIso = new Date(now).toISOString();

  // Werkelijke ritten uit Strava, want intervals.icu geeft via de API geen
  // cijfers voor activiteiten die daar via Strava binnenkwamen — zie ride-metrics.ts.
  const [{ data: workouts }, { data: rides }, { data: profile }] = await Promise.all([
    admin
      .from("training_workouts")
      .select("id, title, duration_minutes, intensity, scheduled_at, status")
      .eq("profile_id", profileId)
      .is("superseded_at", null)
      .gte("scheduled_at", fromIso)
      .lte("scheduled_at", toIso),
    admin
      .from("strava_activities")
      .select(STRAVA_RIDE_COLUMNS)
      .eq("profile_id", profileId)
      .gte("start_date", new Date(now - 48 * 3600_000).toISOString())
      .lte("start_date", toIso),
    admin.from("profiles").select("ftp_watts").eq("id", profileId).maybeSingle(),
  ]);

  const workoutRows = (workouts ?? []) as WorkoutRow[];
  const rideRows = (rides ?? []) as StravaRideRow[];
  const rideIds = rideRows.map((ride) => String(ride.id));
  const workoutIds = workoutRows.map((workout) => workout.id);

  const columns =
    "workout_id, paired_activity_id, athlete_confirmed_at, athlete_rpe, athlete_feel, athlete_report";
  const [{ data: byWorkout }, { data: byRide }] = await Promise.all([
    workoutIds.length
      ? admin
          .from("training_workout_reports")
          .select(columns)
          .eq("profile_id", profileId)
          .in("workout_id", workoutIds)
      : Promise.resolve({ data: [] }),
    rideIds.length
      ? admin
          .from("training_workout_reports")
          .select(columns)
          .eq("profile_id", profileId)
          .in("paired_activity_id", rideIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Een rit die aan een training buiten het venster hangt: die training er
  // alsnog bij halen, anders weet de AI niet waar de rit voor telde.
  const pairings = new Map<string, PairingRow>();
  for (const row of [...(byWorkout ?? []), ...(byRide ?? [])] as PairingRow[]) {
    pairings.set(row.workout_id, row);
  }
  const missingIds = [...pairings.keys()].filter((id) => !workoutIds.includes(id));
  if (missingIds.length > 0) {
    const { data: extra } = await admin
      .from("training_workouts")
      .select("id, title, duration_minutes, intensity, scheduled_at, status")
      .eq("profile_id", profileId)
      .in("id", missingIds);
    workoutRows.push(...((extra ?? []) as WorkoutRow[]));
  }

  const currentFtp = profile?.ftp_watts == null ? null : Number(profile.ftp_watts);
  return yesterdayContextFrom({
    yesterdayKey,
    workouts: workoutRows,
    rides: rideRows,
    pairings: [...pairings.values()],
    ftpWatts: await loadFtpAt(admin, profileId, currentFtp),
  });
}
