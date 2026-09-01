import type { WorkoutIntensity } from "@/lib/training/workouts";

const ZRL_QUALITY = new Set<WorkoutIntensity>(["vo2max", "anaerobic", "race"]);

export const ZRL_PLAN_SPECIFICITY_CAUTION =
  "Dit ZRL-schema bevat geen VO2max-, anaerobe of raceprikkel. Controleer of de wedstrijdspecifieke opbouw en een eventuele herstelreden kloppen.";

export const ZRL_UPCOMING_SPECIFICITY_WARNING =
  "De komende twee weken bevatten geen VO2max-, anaerobe of raceprikkel. Controleer of dit past bij je ZRL-opbouw.";

type SpecificityWorkout = {
  date?: string;
  scheduled_at?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  intensity: string;
  status?: string;
  structure?: unknown;
  structure_json?: unknown;
};

function isQualityIntensity(value: unknown): boolean {
  return typeof value === "string" && ZRL_QUALITY.has(value as WorkoutIntensity);
}

/** Een samengestelde duurtraining met VO2-blokken telt ook als kwaliteitsprikkel. */
export function hasZrlQuality(workout: SpecificityWorkout): boolean {
  if (isQualityIntensity(workout.intensity)) return true;
  const structure = workout.structure ?? workout.structure_json;
  return (
    Array.isArray(structure) &&
    structure.some(
      (block) =>
        block != null &&
        typeof block === "object" &&
        isQualityIntensity((block as { intensity?: unknown }).intensity),
    )
  );
}

/**
 * Vangt het harde foutgeval af nadat de AI klaar is: een heel ZRL-schema zonder
 * één wedstrijdspecifieke prikkel. Een herstelweek mag nog steeds licht zijn;
 * daarom keuren we niet elk afzonderlijk 14-daags venster af.
 */
export function zrlPlanSpecificityCautions(
  goalType: string | null | undefined,
  workouts: SpecificityWorkout[],
): string[] {
  if (goalType !== "zrl" || workouts.length === 0 || workouts.some(hasZrlQuality)) return [];
  return [ZRL_PLAN_SPECIFICITY_CAUTION];
}

function addDays(dayKey: string, days: number): string {
  const date = new Date(`${dayKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Signaal voor het lid; pas tonen als er echt minstens drie trainingsdagen liggen. */
export function zrlUpcomingSpecificityWarning(
  goalType: string | null | undefined,
  workouts: SpecificityWorkout[],
  todayKey: string,
): string | null {
  if (goalType !== "zrl") return null;
  const through = addDays(todayKey, 13);
  const upcoming = workouts.filter((workout) => {
    const date = String(workout.date ?? workout.scheduled_at ?? "").slice(0, 10);
    return (
      date >= todayKey &&
      date <= through &&
      workout.status !== "skipped" &&
      workout.intensity !== "rest"
    );
  });
  if (upcoming.length < 3 || upcoming.some(hasZrlQuality)) return null;
  return ZRL_UPCOMING_SPECIFICITY_WARNING;
}

export function goalTypeFromPromptSummary(promptSummary: string): string | null {
  try {
    const parsed = JSON.parse(promptSummary) as { goal?: { type?: unknown } };
    return typeof parsed.goal?.type === "string" ? parsed.goal.type : null;
  } catch {
    return null;
  }
}
