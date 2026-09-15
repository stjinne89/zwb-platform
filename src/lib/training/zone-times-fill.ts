// Gemeten zonetijden ophalen uit intervals.icu en bij de momentopname zetten.
// Serverside: de intervals-client ontsleutelt de API-key. De rekenregels staan
// in zone-times.ts.

import type { createAdminClient } from "@/lib/supabase/admin";
import { fetchIntervalsActivityStreams } from "@/lib/intervals/client";
import type { WorkoutMetricsSnapshot } from "@/lib/training/completion";
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
 * Hooguit drie per keer, zodat het naast het laden van de pagina niet veel
 * intervals-verzoeken kost. Een training zonder passende activiteit wordt na twee
 * dagen als "geen zonedata" afgevinkt; daarvoor kan de upload nog onderweg zijn.
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
    metrics_json: (WorkoutMetricsSnapshot & { zoneTimes?: ZoneTimes }) | null;
  }>)
    .filter((row) => row.metrics_json?.hasPowerMeter && !row.metrics_json.zoneTimes)
    .slice(0, FILL_LIMIT);
  if (open.length === 0) return result;

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

  for (const row of open) {
    const ride = rideById.get(String(row.paired_activity_id));
    if (!ride || !ftpWatts) continue;
    const match = pickIntervalsActivity(
      {
        startLocal: String(ride.raw?.start_date_local ?? ""),
        movingSeconds: ride.moving_time_seconds == null ? null : Number(ride.moving_time_seconds),
      },
      candidates,
    );

    let zoneTimes: ZoneTimes | null = null;
    if (match) {
      const streams = await fetchIntervalsActivityStreams(conn.api_key, match.intervalsId).catch(
        () => null,
      );
      const watts = streams?.find((stream) => stream.type === "watts")?.data ?? [];
      const time = streams?.find((stream) => stream.type === "time")?.data ?? null;
      const seconds = zoneSecondsFromStream(watts, time, ftpWatts);
      if (seconds.some((value) => value > 0)) {
        zoneTimes = { source: "intervals", intervalsId: match.intervalsId, ftpWatts, seconds };
      } else if (streams) {
        zoneTimes = { source: "none", checkedAt: now.toISOString() };
      }
    } else if (now.getTime() - new Date(ride.start_date).getTime() > GIVE_UP_AFTER_DAYS * 86_400_000) {
      zoneTimes = { source: "none", checkedAt: now.toISOString() };
    }
    if (!zoneTimes) continue;

    // Alleen de sleutel zoneTimes erbij; RPE en bevestiging staan in eigen kolommen.
    const { error } = await admin
      .from("training_workout_reports")
      .update({ metrics_json: { ...row.metrics_json, zoneTimes } })
      .eq("workout_id", row.workout_id)
      .eq("profile_id", profileId)
      .eq("paired_activity_id", row.paired_activity_id);
    if (error) continue;
    if (zoneTimes.source === "intervals") result.filled++;
    else result.none++;
  }
  return result;
}
