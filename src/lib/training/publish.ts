import type { createAdminClient } from "@/lib/supabase/admin";
import { upsertIntervalsWorkoutEvent, type IntervalsEvent } from "@/lib/intervals/client";
import {
  blocksToIntervalsText,
  blocksToWorkoutDoc,
  estimateTrainingLoad,
  normalizeWorkoutBlocks,
} from "@/lib/training/workouts";

type Admin = ReturnType<typeof createAdminClient>;

export type PushResult = {
  connected: boolean;
  pushed: number;
  failed: number;
};

type SchedulableWorkout = {
  id: string;
  scheduled_at: string;
  publish_status: string;
  intervals_event_id: string | null;
};

/**
 * Verschuift een lid een gepubliceerde workout in intervals.icu, dan volgt ZWB
 * die datum. Alleen datumverschuivingen; hernoemen of verwijderen negeren we.
 * Geeft de bijgewerkte datums terug zodat de aanroeper direct kan renderen.
 */
export async function syncWorkoutDatesFromIntervals<T extends SchedulableWorkout>(
  admin: Admin,
  workouts: T[],
  events: IntervalsEvent[],
): Promise<Map<string, string>> {
  const eventDates = new Map(
    events.map((event) => [String(event.id), String(event.start_date_local).slice(0, 10)]),
  );
  const moved = new Map<string, string>();
  for (const workout of workouts) {
    if (workout.publish_status !== "published" || !workout.intervals_event_id) continue;
    const eventDate = eventDates.get(workout.intervals_event_id);
    if (!eventDate || eventDate === workout.scheduled_at.slice(0, 10)) continue;
    // Tijdstip en tijdzone blijven staan; alleen de datum schuift mee.
    moved.set(workout.id, `${eventDate}${workout.scheduled_at.slice(10)}`);
  }

  await Promise.all(
    Array.from(moved).map(([id, scheduledAt]) =>
      admin.from("training_workouts").update({ scheduled_at: scheduledAt }).eq("id", id),
    ),
  );
  return moved;
}

/**
 * Zet alle workouts van een schema in de intervals.icu-kalender. Per workout
 * wordt publish_status bijgewerkt, zodat een mislukte push zichtbaar blijft.
 */
export async function pushPlanWorkoutsToIntervals(
  admin: Admin,
  planId: string,
  profileId: string,
): Promise<PushResult> {
  const [{ data: conn }, { data: riderProfile }, { data: workouts }] = await Promise.all([
    admin
      .from("intervals_connections")
      .select("api_key, athlete_id")
      .eq("profile_id", profileId)
      .maybeSingle(),
    admin.from("profiles").select("ftp_watts").eq("id", profileId).maybeSingle(),
    admin
      .from("training_workouts")
      .select("*")
      .eq("plan_id", planId)
      .order("scheduled_at", { ascending: true }),
  ]);
  if (!conn?.api_key || !conn?.athlete_id) {
    return { connected: false, pushed: 0, failed: 0 };
  }

  const riderFtp = riderProfile?.ftp_watts ? Number(riderProfile.ftp_watts) : null;
  let pushed = 0;
  let failed = 0;
  for (const workout of workouts ?? []) {
    try {
      const blocks = normalizeWorkoutBlocks(workout.structure_json, workout.intensity);
      const intervalsText = blocksToIntervalsText(blocks);
      const trainingLoad = estimateTrainingLoad(blocks);
      const externalId = workout.intervals_external_id ?? `zwb-${workout.id}`;
      // intervals.icu parseert de description NIET server-side, dus moeten we
      // zelf een geldig native workout_doc meesturen. Zonder steps bevat de
      // FIT-export 0 stappen en weigeren Garmin/Wahoo het bestand als corrupt.
      const workoutDoc = blocksToWorkoutDoc(blocks, riderFtp);
      const event = await upsertIntervalsWorkoutEvent(conn.api_key, conn.athlete_id, {
        id: workout.intervals_event_id,
        externalId,
        startDateLocal: String(workout.scheduled_at).slice(0, 16),
        name: workout.title,
        description: [intervalsText, workout.description].filter(Boolean).join("\n\n"),
        category: "WORKOUT",
        type: "Ride",
        target: "POWER",
        trainingLoad,
        durationMinutes: workout.duration_minutes,
        workoutDoc,
      });
      await admin
        .from("training_workouts")
        .update({
          intervals_event_id: String(event.id),
          intervals_external_id: externalId,
          publish_status: "published",
          publish_error: null,
        })
        .eq("id", workout.id);
      pushed++;
    } catch (err) {
      failed++;
      await admin
        .from("training_workouts")
        .update({
          publish_status: "failed",
          publish_error: err instanceof Error ? err.message : "Publicatie faalde.",
        })
        .eq("id", workout.id);
    }
  }

  return { connected: true, pushed, failed };
}
