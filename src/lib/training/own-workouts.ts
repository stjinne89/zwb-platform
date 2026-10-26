// De workouts die een lid zelf uit de bibliotheek in zijn schema kan zetten,
// via "Rit inplannen" → Eigen training. Alleen de standaardbibliotheek, en
// zonder tests en warming-ups: een test plannen is trainerswerk (planFtpTest)
// en een warming-up hoort bij een race (planRaceWarmup).

import type { createAdminClient } from "@/lib/supabase/admin";
import type { ArticleEvidence } from "@/lib/knowledge/evidence";
import { methodLabelOf, type MethodLabel } from "@/lib/training/method-label";
import { workoutSupport } from "@/lib/training/workout-support";
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
  description: string | null;
  durationMinutes: number;
  intensity: WorkoutIntensity;
  methodLabel: MethodLabel | null;
  /** Het kennisartikel dat de workout onderbouwt (workout-support.ts). */
  support: { slug: string; title: string; evidence: ArticleEvidence } | null;
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
    "id, form, title, description, duration_minutes, intensity, method_label, structure_json",
  ).order("duration_minutes");
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
    const intensity = String(row.intensity) as WorkoutIntensity;
    const form = String(row.form);
    const title = String(row.title);
    const durationMinutes = Number(row.duration_minutes);
    const support = workoutSupport({
      form,
      title,
      duration_minutes: durationMinutes,
      is_standard: true,
    });
    return {
      id: String(row.id),
      form,
      title,
      description: (row.description as string | null) ?? null,
      durationMinutes,
      intensity,
      methodLabel: methodLabelOf(row.method_label),
      support: support
        ? { slug: support.slug, title: support.title, evidence: support.evidence }
        : null,
      blocks: normalizeWorkoutBlocks(row.structure_json, intensity),
    };
  });
}
