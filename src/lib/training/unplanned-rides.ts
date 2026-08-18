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

/**
 * De ritten die geen enkele geplande training opeisen.
 *
 * `pairedActivityIds` zijn de ritten die al vastgelegd aan een workout hangen
 * (training_workout_reports.paired_activity_id). Die gaan er sowieso af: die
 * koppeling is bevestigd en telt zwaarder dan wat we hier opnieuw zouden
 * uitrekenen — ook als de bijbehorende workout buiten dit venster valt.
 *
 * Een als rustdag afgeschreven training claimt niets: wie op zijn rustdag toch
 * reed, hoort die rit juist te zien staan.
 */
export function unplannedRides(
  rides: StravaRideRow[],
  workouts: PlannedWorkoutForRides[],
  ftpWatts: number | null,
  pairedActivityIds: Iterable<string | number | null | undefined> = [],
): UnplannedRide[] {
  const used = new Set<string>();
  for (const id of pairedActivityIds) {
    if (id != null && id !== "") used.add(String(id));
  }

  const claiming = workouts
    .filter((workout) => workout.intensity !== "rest" && workout.status !== "skipped")
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
