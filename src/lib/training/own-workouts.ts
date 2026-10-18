// De workouts die een lid zelf uit de bibliotheek in zijn schema kan zetten,
// via "Rit inplannen" → Eigen training. Alleen de standaardbibliotheek, en
// zonder tests en warming-ups: een test plannen is trainerswerk (planFtpTest)
// en een warming-up hoort bij een race (planRaceWarmup).

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeWorkoutBlocks,
  type WorkoutBlock,
  type WorkoutIntensity,
} from "@/lib/training/workouts";

type Admin = ReturnType<typeof createAdminClient>;

const EXCLUDED_FORMS = "(test,warmup)";

export type OwnWorkoutOption = {
  id: string;
  form: string;
  title: string;
  durationMinutes: number;
  intensity: WorkoutIntensity;
  blocks: WorkoutBlock[];
};

/** Basisquery voor een bibliotheekworkout die een lid zelf mag kiezen. */
export function ownWorkoutTemplates(admin: Admin, columns: string) {
  return admin
    .from("training_workout_templates")
    .select(columns)
    .eq("is_standard", true)
    .is("test_type", null)
    .not("form", "in", EXCLUDED_FORMS);
}

/**
 * Via de service-role: de bibliotheek zelf is door RLS alleen voor trainers
 * leesbaar.
 */
export async function loadOwnWorkoutOptions(admin: Admin): Promise<OwnWorkoutOption[]> {
  const { data } = await ownWorkoutTemplates(
    admin,
    "id, form, title, duration_minutes, intensity, structure_json",
  ).order("duration_minutes");
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
    const intensity = String(row.intensity) as WorkoutIntensity;
    return {
      id: String(row.id),
      form: String(row.form),
      title: String(row.title),
      durationMinutes: Number(row.duration_minutes),
      intensity,
      blocks: normalizeWorkoutBlocks(row.structure_json, intensity),
    };
  });
}
