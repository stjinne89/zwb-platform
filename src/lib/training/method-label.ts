// Kenmerk van een trainingsmethode die geen standaardtraining is. Het staat bij
// een workout (training_workout_templates en training_workouts, 0246), bij een
// protocol en bij een kennisartikel, en gaat mee naar intervals.icu.
//
// Beide waarden tonen "Nieuwe methode" (besluit eigenaar, 2026-10-18). Vroeger
// stond er "Veelbelovend" of "Experimenteel", maar dat gaf een oordeel dat het
// bewijsniveau al geeft, en klonk positiever dan dat niveau. De waarden in de
// database en in de prompts van de AI-coach bleven, zodat er geen migratie
// nodig was. Zie docs/beoordelingsbeleid-bewijsniveau.md.

export const METHOD_LABELS = ["veelbelovend", "experimenteel"] as const;
export type MethodLabel = (typeof METHOD_LABELS)[number];

export const METHOD_LABEL_TEXT: Record<MethodLabel, string> = {
  veelbelovend: "Nieuwe methode",
  experimenteel: "Nieuwe methode",
};

/** Een geldig label, of null. Leeg, "geen" en onbekende waarden zijn geen label. */
export function methodLabelOf(value: unknown): MethodLabel | null {
  const text = String(value ?? "").trim().toLowerCase();
  return (METHOD_LABELS as readonly string[]).includes(text) ? (text as MethodLabel) : null;
}

// Voorvoegsels die eerder naar intervals.icu gingen.
const OLD_PREFIXES = ["Veelbelovend.", "Experimenteel."];

/**
 * De beschrijving zoals hij naar intervals.icu gaat: het label vooraan, zodat
 * het lid het ook op Zwift of de fietscomputer ziet. Een oud voorvoegsel gaat
 * eraf, zodat er niet twee komen te staan.
 */
export function describeWithMethodLabel(description: string | null | undefined, label: MethodLabel | null): string {
  let text = String(description ?? "").trim();
  for (const old of OLD_PREFIXES) {
    if (text.startsWith(old)) text = text.slice(old.length).trim();
  }
  if (!label) return text;
  const prefix = `${METHOD_LABEL_TEXT[label]}.`;
  if (text.startsWith(prefix)) return text;
  return text ? `${prefix} ${text}` : prefix;
}
