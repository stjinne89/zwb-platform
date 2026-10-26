// De darmtraining als plafond voor eten onderweg. Stap 4 van
// docs/ritvoeding-plan.md, besluit 4: boven 90 g per uur alleen voor wie de
// darmtraining volgt of afrondde, nooit als standaard.
//
// Twee gevallen:
//   * Lopende darmtraining: bij een rit van minstens 90 minuten (bij het
//     vervolg naar 150: drie uur) is het getal van die week het doel. Dat is de
//     opdracht van het protocol, ook als het onder de gewone band ligt.
//   * Afgerond, en zelf aangezet (nutrition_profiles.ride_carbs_120): bij een
//     rit vanaf 2,5 uur is 120 g de bovenkant van de band (targets.ts).

import { GUT_TRAINING_150_STEPS, GUT_TRAINING_STEPS } from "@/lib/protocols/nutrition";
import type { GutTraining } from "./targets";

export const GUT_PROTOCOLS = ["darmtraining", "darmtraining-150"] as const;

const RULES: Record<(typeof GUT_PROTOCOLS)[number], { steps: readonly number[]; minMinutes: number }> = {
  darmtraining: { steps: GUT_TRAINING_STEPS, minMinutes: 90 },
  "darmtraining-150": { steps: GUT_TRAINING_150_STEPS, minMinutes: 180 },
};

export type GutRun = { protocolSlug: string; startDate: string; status: "actief" | "gestopt" | "afgerond" };

/** Wat er over de darmtraining van een lid bekend is: de runs en de eigen keuze voor 120 g. */
export type GutSource = { runs: GutRun[]; high: boolean };

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

function rulesFor(run: GutRun) {
  return (GUT_PROTOCOLS as readonly string[]).includes(run.protocolSlug)
    ? RULES[run.protocolSlug as (typeof GUT_PROTOCOLS)[number]]
    : null;
}

/** Afgerond: zo gemarkeerd, of nog actief maar voorbij de laatste week. */
function finished(run: GutRun, day: string): boolean {
  const rules = rulesFor(run);
  if (!rules) return false;
  return run.status === "afgerond" || (run.status === "actief" && daysBetween(run.startDate, day) >= rules.steps.length * 7);
}

/** Mag dit lid kiezen voor 120 g per uur? Alleen na een afgeronde darmtraining. */
export function gutHighAllowed(runs: GutRun[], today: string): boolean {
  return runs.some((run) => finished(run, today));
}

/** Wat de darmtraining op `day` aan het doel onderweg verandert; null als niets. */
export function gutTrainingOn(source: GutSource | null | undefined, day: string): GutTraining | null {
  if (!source) return null;
  let week: { grams: number; minMinutes: number } | null = null;
  for (const run of source.runs) {
    const rules = rulesFor(run);
    if (!rules || run.status !== "actief") continue;
    const index = Math.floor(daysBetween(run.startDate, day) / 7);
    if (index < 0 || index >= rules.steps.length) continue;
    week = { grams: rules.steps[index], minMinutes: rules.minMinutes };
  }
  const high = source.high && gutHighAllowed(source.runs, day);
  if (!week && !high) return null;
  return { weekGrams: week?.grams ?? null, minMinutes: week?.minMinutes ?? 0, high };
}
