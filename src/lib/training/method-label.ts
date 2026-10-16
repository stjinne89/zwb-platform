// Label voor een trainingsmethode die nog niet als bewezen geldt. Het staat bij
// een workout (training_workout_templates en training_workouts, 0246), bij een
// protocol en bij een kennisartikel, en gaat mee naar intervals.icu.
//
// "Veelbelovend": trainingsstudies bij fietsers met een duidelijk effect, maar
// klein, kort of alleen bij goed getrainde renners. "Experimenteel": geen
// trainingsstudie bij fietsers die het effect over weken laat zien, of studies
// die elkaar tegenspreken. Zie docs/trainingsmethodes-onderzoek-2026-10-16.md.
//
// Los van het bewijsniveau van een protocol (sterk, matig, beperkt): dat zegt
// hoeveel onderzoek er is, dit zegt of het effect op prestatie al vaststaat.

export const METHOD_LABELS = ["veelbelovend", "experimenteel"] as const;
export type MethodLabel = (typeof METHOD_LABELS)[number];

export const METHOD_LABEL_TEXT: Record<MethodLabel, string> = {
  veelbelovend: "Veelbelovend",
  experimenteel: "Experimenteel",
};

/** Een geldig label, of null. Leeg, "geen" en onbekende waarden zijn geen label. */
export function methodLabelOf(value: unknown): MethodLabel | null {
  const text = String(value ?? "").trim().toLowerCase();
  return (METHOD_LABELS as readonly string[]).includes(text) ? (text as MethodLabel) : null;
}

/**
 * De beschrijving zoals hij naar intervals.icu gaat: het label vooraan, zodat
 * het lid het ook op Zwift of de fietscomputer ziet.
 */
export function describeWithMethodLabel(description: string | null | undefined, label: MethodLabel | null): string {
  const text = String(description ?? "").trim();
  if (!label) return text;
  const prefix = `${METHOD_LABEL_TEXT[label]}.`;
  if (text.startsWith(prefix)) return text;
  return text ? `${prefix} ${text}` : prefix;
}
