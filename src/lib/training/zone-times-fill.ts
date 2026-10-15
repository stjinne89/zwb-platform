// Gemeten zonetijden ophalen uit intervals.icu en bij de momentopname zetten.
// Serverside: de intervals-client ontsleutelt de API-key. De rekenregels staan
// in zone-times.ts. Uit dezelfde stream komt sinds 2026-10-15 ook de uitvoering
// per herhaling en de ontkoppeling (execution.ts), voor de suggesties aan de
// trainer; een training die al zonetijden had, krijgt die alsnog.

import type { createAdminClient } from "@/lib/supabase/admin";
import { fetchIntervalsActivityStreams } from "@/lib/intervals/client";
import type { WorkoutMetricsSnapshot } from "@/lib/training/completion";
import { analyseExecution, type ExecutionAnalysis } from "@/lib/training/execution";
import { normalizeWorkoutBlocks, type WorkoutIntensity } from "@/lib/training/workouts";
import {
  pickIntervalsActivity,
  zoneSecondsFromStream,
  type IntervalsCandidate,
  type ZoneTimes,
} from "@/lib/training/zone-times";

type Admin = ReturnType<typeof createAdminClient>;

/** Na zoveel dagen zonder intervals-activiteit geven we het op. */
const GIVE_UP_AFTER_DAYS = 2;
const FILL_WINDOW_DAYS = 14;
const FILL_LIMIT = 3;

/**
 * Vult de gemeten zonetijden aan voor de laatste gereden trainingen van een lid.
 * Hooguit drie intervals-verzoeken per keer, zodat het naast het laden van de
 * pagina weinig kost. Een training zonder passende activiteit staat na twee dagen
 * op "geen zonedata", maar blijft binnen het venster meedoen: wie zijn Garmin of
 * Wahoo later rechtstreeks aan intervals.icu koppelt, krijgt de rit dan alsnog.
 */
export async function fillZoneTimes(
  admin: Admin,
  profileId: string,
  conn: { api_key: string },
  now = new Date(),
): Promise<{ filled: number; none: number }> {
  const result = { filled: 0, none: 0 };
  const fromIso = new Date(now.getTime() - FILL_WINDOW_DAYS * 86_400_000).toISOString();

  const { data: reportRows } = await admin
    .from("training_workout_reports")
    .select("workout_id, paired_activity_id, metrics_json, updated_at")
    .eq("profile_id", profileId)
    .not("paired_activity_id", "is", null)
    .gte("updated_at", fromIso)
    .order("updated_at", { ascending: false })
    .limit(20);

  const open = ((reportRows ?? []) as Array<{
    workout_id: string;
    paired_activity_id: string;
    metrics_json: (WorkoutMetricsSnapshot & { zoneTimes?: ZoneTimes; execution?: ExecutionAnalysis }) | null;
  }>)
    .filter((row) => {
      const zoneTimes = row.metrics_json?.zoneTimes;
      if (!row.metrics_json?.hasPowerMeter) return false;
      // Zonetijden van vóór de uitvoeringsanalyse: alleen die nog aanvullen.
      if (zoneTimes?.source === "intervals") return !row.metrics_json?.execution;
      return !zoneTimes || (zoneTimes.source === "none" && !zoneTimes.intervalsId);
    });
  if (open.length === 0) return result;
  const { data: workoutRows } = await admin
    .from("training_workouts")
    .select("id, intensity, structure_json")
    .in(
      "id",
      open.map((row) => row.workout_id),
    );
  const blocksFor = new Map(
    ((workoutRows ?? []) as Array<{ id: string; intensity: string; structure_json: unknown }>).map((w) => [
      w.id,
      normalizeWorkoutBlocks(w.structure_json, w.intensity as WorkoutIntensity),
    ]),
  );

  const [{ data: rides }, { data: profile }, { data: activities }] = await Promise.all([
    admin
      .from("strava_activities")
      .select("id, start_date, moving_time_seconds, raw")
      .eq("profile_id", profileId)
      .in(
        "id",
        open.map((row) => Number(row.paired_activity_id)),
      ),
    admin.from("profiles").select("ftp_watts").eq("id", profileId).maybeSingle(),
    admin
      .from("intervals_activities")
      .select("intervals_id, moving_time_seconds, raw")
      .eq("profile_id", profileId)
      .gte("start_date_local", fromIso.slice(0, 10)),
  ]);

  const ftpWatts = profile?.ftp_watts == null ? null : Number(profile.ftp_watts);
  const candidates: IntervalsCandidate[] = ((activities ?? []) as Array<{
    intervals_id: string;
    moving_time_seconds: number | null;
    raw: { start_date_local?: string; source?: string } | null;
  }>).map((row) => ({
    intervalsId: row.intervals_id,
    startLocal: String(row.raw?.start_date_local ?? ""),
    movingSeconds: row.moving_time_seconds == null ? null : Number(row.moving_time_seconds),
    source: row.raw?.source ?? null,
  }));
  const rideById = new Map(
    ((rides ?? []) as Array<{
      id: number;
      start_date: string;
      moving_time_seconds: number | null;
      raw: { start_date_local?: string } | null;
    }>).map((ride) => [String(ride.id), ride]),
  );

  let requests = 0;
  for (const row of open) {
    const ride = rideById.get(String(row.paired_activity_id));
    if (!ride || !ftpWatts) continue;
    const earlier = row.metrics_json?.zoneTimes ?? null;
    // Al zonetijden: dezelfde activiteit opnieuw, alleen voor de uitvoering.
    const known = earlier?.source === "intervals" ? { intervalsId: earlier.intervalsId } : null;
    const match = known ?? pickIntervalsActivity(
      {
        startLocal: String(ride.raw?.start_date_local ?? ""),
        movingSeconds: ride.moving_time_seconds == null ? null : Number(ride.moving_time_seconds),
      },
      candidates,
    );

    let zoneTimes: ZoneTimes | null = null;
    let execution: ExecutionAnalysis | null = null;
    if (match) {
      if (requests >= FILL_LIMIT) continue;
      requests++;
      const streams = await fetchIntervalsActivityStreams(conn.api_key, match.intervalsId, ["time", "watts", "heartrate"]).catch(
        () => null,
      );
      const watts = streams?.find((stream) => stream.type === "watts")?.data ?? [];
      const time = streams?.find((stream) => stream.type === "time")?.data ?? null;
      const heartrate = streams?.find((stream) => stream.type === "heartrate")?.data;
      const seconds = zoneSecondsFromStream(watts, time, ftpWatts);
      if (seconds.some((value) => value > 0)) {
        zoneTimes = known ? earlier : { source: "intervals", intervalsId: match.intervalsId, ftpWatts, seconds };
        const blocks = blocksFor.get(row.workout_id);
        if (blocks && time) {
          execution = analyseExecution(
            { time: time.map((t) => Number(t)), watts, heartrate: heartrate ?? undefined },
            blocks,
            ftpWatts,
          );
        }
      } else if (streams) {
        zoneTimes = { source: "none", checkedAt: now.toISOString(), intervalsId: match.intervalsId };
      }
    } else if (earlier) {
      // Stond al op "geen zonedata" en er is nog steeds niets: niet opnieuw schrijven.
      continue;
    } else if (now.getTime() - new Date(ride.start_date).getTime() > GIVE_UP_AFTER_DAYS * 86_400_000) {
      zoneTimes = { source: "none", checkedAt: now.toISOString() };
    }
    if (!zoneTimes) continue;

    // Alleen de sleutels zoneTimes en execution erbij; RPE en bevestiging staan in eigen kolommen.
    const { error } = await admin
      .from("training_workout_reports")
      .update({ metrics_json: { ...row.metrics_json, zoneTimes, ...(execution ? { execution } : {}) } })
      .eq("workout_id", row.workout_id)
      .eq("profile_id", profileId)
      .eq("paired_activity_id", row.paired_activity_id);
    if (error) continue;
    if (zoneTimes.source === "intervals") result.filled++;
    else result.none++;
  }
  return result;
}
