// RPE bij een rit zonder training (migratie 0303).
//
// Een rapportage hangt aan een geplande training; een spontane rit heeft er geen.
// Daarom staat de RPE van zo'n rit op de rit zelf. Hangt de rit later aan een
// training, dan neemt de rapportage hem over (relinkRide, detectCompletedWorkouts).
//
// Net als de loskoppel-markering niet in STRAVA_RIDE_COLUMNS: draait 0303 nog
// niet, dan faalt alleen dit en niet elke ritquery.

/** Een ingevulde RPE naar 1..10, of null als er niets (bruikbaars) staat. */
export function clampRpe(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return Math.max(1, Math.min(10, Math.round(value)));
}

/** De RPE per rit-id, voor de ritten die er een hebben. Leeg bij een fout. */
export async function loadRideRpe(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  profileId: string,
  activityIds: Array<string | number>,
): Promise<Map<string, number>> {
  if (activityIds.length === 0) return new Map();
  const { data, error } = await client
    .from("strava_activities")
    .select("id, athlete_rpe")
    .eq("profile_id", profileId)
    .in("id", activityIds.map(String))
    .not("athlete_rpe", "is", null);
  if (error || !data) return new Map();
  return new Map(
    (data as Array<{ id: number; athlete_rpe: number }>).map((row) => [
      String(row.id),
      row.athlete_rpe,
    ]),
  );
}

/** Zet (of wist, met null) de RPE op een rit van het lid. */
export async function writeRideRpe(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  profileId: string,
  activityId: string,
  rpe: number | null,
): Promise<{ error: string | null }> {
  const { data, error } = await client
    .from("strava_activities")
    .update({ athlete_rpe: rpe })
    .eq("profile_id", profileId)
    .eq("id", activityId)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "De rit is niet gevonden." };
  return { error: null };
}
