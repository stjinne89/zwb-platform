// Trainingsvormen voor de workout-bibliotheek. Bewust een eigen laag bovenop
// WORKOUT_INTENSITIES: "sweet spot" is geen aparte intensiteit (het valt onder
// tempo) maar wel een herkenbare trainingsvorm, en "sprint" en "anaeroob" delen
// dezelfde intensiteit terwijl ze totaal verschillende sessies zijn.

import type { WorkoutIntensity } from "@/lib/training/workouts";

export type TrainingForm = {
  slug: string;
  label: string;
  intensity: WorkoutIntensity;
};

export const TRAINING_FORMS = [
  { slug: "herstel", label: "Herstel", intensity: "recovery" },
  { slug: "duur", label: "Duurtraining", intensity: "endurance" },
  { slug: "tempo", label: "Tempo", intensity: "tempo" },
  { slug: "sweetspot", label: "Sweet spot", intensity: "tempo" },
  { slug: "drempel", label: "Drempel / FTP", intensity: "threshold" },
  { slug: "vo2max", label: "VO2max", intensity: "vo2max" },
  { slug: "anaeroob", label: "Anaeroob", intensity: "anaerobic" },
  { slug: "sprint", label: "Sprint", intensity: "anaerobic" },
  { slug: "test", label: "Test", intensity: "threshold" },
] as const satisfies readonly TrainingForm[];

export type TrainingFormSlug = (typeof TRAINING_FORMS)[number]["slug"];

export const TRAINING_FORM_SLUGS = TRAINING_FORMS.map((form) => form.slug) as TrainingFormSlug[];

export function trainingForm(slug: string | null | undefined): TrainingForm | null {
  if (!slug) return null;
  return TRAINING_FORMS.find((form) => form.slug === slug) ?? null;
}

/** Label voor een vorm die als losse string uit de database komt. Valt terug op
 * de ruwe waarde, zodat een onbekende vorm niet als leeg veld in de UI belandt. */
export function trainingFormLabel(slug: string | null | undefined): string {
  if (!slug) return "";
  return trainingForm(slug)?.label ?? slug;
}
