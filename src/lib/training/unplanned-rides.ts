// Gereden ritten waar geen training tegenover stond.
//
// Het schema toonde tot nu toe alleen wat gepland was: ZWB-workouts en events
// uit intervals.icu. Wie een extra herstelritje deed, met de groep meereed of
// zijn rit halverwege in tweeën geknipt zag worden, zag dat nergens terug —
// terwijl juist die kilometers verklaren waarom een week zwaarder voelde dan
// hij op papier was.
//
// De koppeling is dezelfde als in compliance.ts: elke workout claimt hooguit
// één rit van die dag, en wat overblijft is ongepland. Bij een in tweeën
// geknipte rit pakt de workout dus de helft die het dichtst bij de geplande
// duur ligt, en komt de andere helft hier naar boven.
//
// Bron is strava_activities, net als bij de naleving en de belastinggrafiek:
// intervals.icu geeft via de API niets terug voor ritten die daar via Strava
// zijn binnengekomen (zie ride-metrics.ts).

import {
  pickRideForWorkout,
  type PlannedWorkoutForCompliance,
} from "@/lib/training/compliance";
import {
  rideMetricsFromStrava,
  type RideMetrics,
  type StravaRideRow,
} from "@/lib/training/ride-metrics";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

/** Een workout zoals de koppeling hem nodig heeft, plus zijn status. */
export type PlannedWorkoutForRides = PlannedWorkoutForCompliance & {
  status?: string | null;
};

export type UnplannedRide = {
  /** Het Strava-activiteitsid; ook de sleutel naar de bronactiviteit. */
  id: number;
  /** Kalenderdag in Amsterdam-tijd. */
  dateKey: string;
  name: string;
  distanceKm: number | null;
  metrics: RideMetrics;
};

function distanceKm(value: unknown): number | null {
  const meters = Number(value);
  if (!Number.isFinite(meters) || meters <= 0) return null;
  return Math.round(meters / 100) / 10;
}

/** Een vastgelegde koppeling tussen een workout en de rit die erbij hoort. */
export type WorkoutPairing = {
  workoutId: string;
  /** Strava-id uit training_workout_reports.paired_activity_id; null als leeg. */
  activityId: string | number | null | undefined;
};

/**
 * De ritten die geen enkele geplande training opeisen.
 *
 * `pairings` zijn de koppelingen die al vastliggen
 * (training_workout_reports.paired_activity_id). Ze doen twee dingen. De rit
 * gaat van de stapel af — die koppeling is bevestigd en telt zwaarder dan wat we
 * hier opnieuw zouden uitrekenen, ook als de bijbehorende workout buiten dit
 * venster valt. En de wórkout doet niet meer mee aan het verdelen: die heeft zijn
 * rit al.
 *
 * Dat tweede is niet theoretisch. Zonder die regel claimde een workout die al aan
 * een rit hing er alsnog een tweede, en dan verdween precies de rit die hier
 * zichtbaar had moeten worden. Bij twee Zwift-ritten op één avond — 20 minuten
 * pacer group ride en 41 minuten race, met één geplande training ertegenover —
 * bleef er zo niets over.
 *
 * Een als rustdag afgeschreven training claimt niets: wie op zijn rustdag toch
 * reed, hoort die rit juist te zien staan.
 */
export function unplannedRides(
  rides: StravaRideRow[],
  workouts: PlannedWorkoutForRides[],
  ftpWatts: number | null,
  pairings: Iterable<WorkoutPairing> = [],
): UnplannedRide[] {
  const used = new Set<string>();
  const alreadyPaired = new Set<string>();
  for (const { workoutId, activityId } of pairings) {
    if (activityId == null || activityId === "") continue;
    used.add(String(activityId));
    alreadyPaired.add(workoutId);
  }

  const claiming = workouts
    .filter(
      (workout) =>
        workout.intensity !== "rest" &&
        workout.status !== "skipped" &&
        !alreadyPaired.has(workout.id),
    )
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  for (const workout of claiming) {
    const available = rides.filter((ride) => !used.has(String(ride.id)));
    if (available.length === 0) break;
    const match = pickRideForWorkout(
      available,
      workout.scheduled_at,
      workout.duration_minutes ?? null,
    );
    if (match) used.add(String(match.id));
  }

  return rides
    .filter((ride) => !used.has(String(ride.id)))
    .map((ride) => ({
      id: ride.id,
      dateKey: amsterdamDayKey(new Date(ride.start_date)),
      name: ride.name?.trim() || "Rit",
      distanceKm: distanceKm(ride.distance_m),
      metrics: rideMetricsFromStrava(ride.raw, ride.moving_time_seconds, ftpWatts),
    }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}
