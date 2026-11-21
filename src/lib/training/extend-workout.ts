// Een bibliotheekworkout langer maken met een duurblok, zodat hij past in de
// tijd die een lid via "Rit inplannen" kiest. De intervallen blijven zoals ze
// zijn; de extra tijd komt na de laatste serie en vóór de cooling-down, zodat
// de zware blokken fris gereden worden. Inkorten gebeurt nooit: dan zou er een
// andere training staan.
//
// Puur en zonder server-imports: het formulier toont er de verlengde blokken
// mee, de server rekent er bij het inplannen zelf opnieuw mee.

import type { WorkoutBlock } from "@/lib/training/workouts";

/** Vormen met intervallen; herstel en duur hebben al genoeg lengtes. */
const EXTENDABLE_FORMS: ReadonlySet<string> = new Set([
  "tempo",
  "sweetspot",
  "drempel",
  "vo2max",
  "anaeroob",
  "sprint",
]);

/** Korter dan dit is geen blok waard; de workout houdt dan zijn eigen lengte. */
export const MIN_EXTRA_ENDURANCE_MINUTES = 10;

/** Een workout tot zoveel minuten langer dan gekozen telt nog als passend. */
const FIT_TOLERANCE_MINUTES = 5;

/** Zoveel workouts toont de lijst bij een vorm die niet verlengd wordt. */
const CLOSEST_COUNT = 5;

/** Hetzelfde duurblok als in de standaardbibliotheek. */
const EXTRA_ENDURANCE_BLOCK = {
  label: "Duur",
  target: "60-70%",
  notes: "Rustig doortrappen.",
  intensity: "endurance",
} as const satisfies Omit<WorkoutBlock, "durationMinutes">;

export function isExtendableForm(form: string) {
  return EXTENDABLE_FORMS.has(form);
}

/** Minuten duur die bij de workout komen om de gekozen duur te halen. */
export function extraEnduranceMinutes(
  form: string,
  workoutMinutes: number,
  targetMinutes: number,
) {
  if (!isExtendableForm(form)) return 0;
  const extra = Math.round(targetMinutes) - Math.round(workoutMinutes);
  return extra >= MIN_EXTRA_ENDURANCE_MINUTES ? extra : 0;
}

/** De blokken met een duurblok van `extraMinutes` vóór de cooling-down. */
export function extendWithEndurance(blocks: WorkoutBlock[], extraMinutes: number): WorkoutBlock[] {
  if (extraMinutes <= 0 || blocks.length === 0) return blocks;
  const last = blocks[blocks.length - 1];
  const at = /^cooling/i.test(last.label) ? blocks.length - 1 : blocks.length;
  return [
    ...blocks.slice(0, at),
    { ...EXTRA_ENDURANCE_BLOCK, durationMinutes: extraMinutes },
    ...blocks.slice(at),
  ];
}

/**
 * De workouts van één vorm die bij de gekozen duur passen. Bij een vorm die
 * verlengd kan worden: alles wat binnen de duur past, de langste eerst (die
 * vraagt de minste vulling). Past er niets, dan de kortste. Anders: de
 * workouts waarvan de lengte het dichtst bij de gekozen duur ligt.
 */
export function ownWorkoutShortlist<T extends { form: string; durationMinutes: number }>(
  options: T[],
  form: string,
  targetMinutes: number,
): T[] {
  const items = options.filter((option) => option.form === form);
  if (items.length === 0) return [];
  if (isExtendableForm(form)) {
    const fits = items
      .filter((option) => option.durationMinutes <= targetMinutes + FIT_TOLERANCE_MINUTES)
      .sort((a, b) => b.durationMinutes - a.durationMinutes);
    if (fits.length > 0) return fits;
    return [items.reduce((short, option) => (option.durationMinutes < short.durationMinutes ? option : short))];
  }
  return [...items]
    .sort(
      (a, b) =>
        Math.abs(a.durationMinutes - targetMinutes) - Math.abs(b.durationMinutes - targetMinutes),
    )
    .slice(0, CLOSEST_COUNT);
}
