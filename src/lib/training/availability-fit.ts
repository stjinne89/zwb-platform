// Het schema meteen passend maken bij de beschikbaarheid.
//
// Beschikbaarheid is een plafond. Tot september 2026 was dat alleen een
// aanwijzing voor de AI: wie zijn vrijdag op 0 zette, moest wachten tot een
// herziening klaar was, en die kon worden overgeslagen of blijven hangen. Zo
// bleef Stijns vrijdagtraining op 11 september gewoon staan. Nu gaat een
// training op een dag zonder tijd er meteen af, en wordt een te lange training
// ingekort. Dezelfde regel geldt na elke AI-uitvoer in insertPlanWorkouts().
//
// Wat het lid zelf heeft vastgezet (eigen rit, clubevent, test) raken we niet:
// dat is een afspraak, en die gaat voor op het plafond.

import type { createAdminClient } from "@/lib/supabase/admin";
import { loadAvailabilityRange, minutesForDate, shiftWeeks } from "@/lib/training/availability";
import { pushWorkoutToIntervals, retireWorkoutRows } from "@/lib/training/publish";
import { normalizeWorkoutBlocks, resizeBlocks, type WorkoutIntensity } from "@/lib/training/workouts";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

type Admin = ReturnType<typeof createAdminClient>;

/** Zo ver vooruit kijken we; langer loopt geen schema zonder herziening. */
const HORIZON_WEEKS = 12;

export async function fitScheduleToAvailability(
  admin: Admin,
  profileId: string,
): Promise<{ retired: number; shortened: number }> {
  const from = amsterdamDayKey();
  const to = shiftWeeks(from, HORIZON_WEEKS);
  const availability = await loadAvailabilityRange(admin, profileId, from, to);
  if (!availability.default && availability.weeks.length === 0) {
    return { retired: 0, shortened: 0 };
  }

  const { data: rows } = await admin
    .from("training_workouts")
    .select("id, scheduled_at, duration_minutes, intensity, structure_json, intervals_event_id")
    .eq("profile_id", profileId)
    .eq("status", "planned")
    .is("superseded_at", null)
    .is("test_type", null)
    .in("origin", ["ai", "trainer"])
    .gte("scheduled_at", `${from}T00:00:00`)
    .lte("scheduled_at", `${to}T23:59:59`);

  const retire: Array<{ id: string }> = [];
  let shortened = 0;
  for (const row of rows ?? []) {
    const limit = minutesForDate(availability, String(row.scheduled_at).slice(0, 10));
    if (limit == null) continue;
    if (limit === 0) {
      retire.push({ id: row.id as string });
      continue;
    }
    if (Number(row.duration_minutes ?? 0) <= limit) continue;

    const blocks = resizeBlocks(
      normalizeWorkoutBlocks(row.structure_json, row.intensity as WorkoutIntensity),
      limit,
    );
    const { error } = await admin
      .from("training_workouts")
      .update({
        duration_minutes: limit,
        structure_json: blocks,
        publish_status: "pending",
        publish_error: null,
      })
      .eq("id", row.id)
      .eq("status", "planned");
    if (error) continue;
    shortened += 1;
    if (row.intervals_event_id) {
      await pushWorkoutToIntervals(admin, row.id as string).catch(() => null);
    }
  }

  if (retire.length > 0) {
    const { data: conn } = await admin
      .from("intervals_connections")
      .select("api_key, athlete_id")
      .eq("profile_id", profileId)
      .maybeSingle();
    await retireWorkoutRows(
      admin,
      retire,
      null,
      conn?.api_key && conn.athlete_id ? { api_key: conn.api_key, athlete_id: conn.athlete_id } : null,
    );
  }
  return { retired: retire.length, shortened };
}
