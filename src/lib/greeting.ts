// De begroeting op het dashboard hangt aan de klok van het lid zelf, niet aan de
// server. Een ZWB-lid dat vanuit Australië inlogt hoort geen "goedemorgen" te
// krijgen omdat het in Nederland ochtend is.
//
// De grenzen volgen het gewone Nederlandse spraakgebruik: de ochtend begint om
// zes uur, de middag om twaalf, de avond om zes en de nacht om middernacht.

export type Greeting = "Goedemorgen" | "Goedemiddag" | "Goedenavond" | "Goedenacht";

export function greetingFor(hour: number): Greeting {
  // Buiten 0-23 (of onzin) is de nacht de veiligste terugval: "goedenacht" is
  // nooit ronduit fout, "goedemorgen" om drie uur 's nachts wel.
  if (!Number.isFinite(hour)) return "Goedenacht";
  const clock = Math.floor(hour);
  if (clock >= 6 && clock < 12) return "Goedemorgen";
  if (clock >= 12 && clock < 18) return "Goedemiddag";
  if (clock >= 18 && clock < 24) return "Goedenavond";
  return "Goedenacht";
}

/** "Goedemiddag, Bart" — of alleen de groet als de naam ontbreekt. */
export function greetingWithName(hour: number, name: string | null | undefined): string {
  const greeting = greetingFor(hour);
  const trimmed = (name ?? "").trim();
  return trimmed ? `${greeting}, ${trimmed}` : greeting;
}

/**
 * Het uur in Nederland. De server draait in UTC, dus zonder deze omrekening zou
 * de eerste render van de begroeting er 's zomers twee uur naast zitten — en dat
 * is precies het uur waarop het verschil zichtbaar is.
 */
export function amsterdamHour(now: Date = new Date()): number {
  const text = now.toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    hour12: false,
  });
  const hour = Number(text.replace(/\D/g, ""));
  return Number.isFinite(hour) ? hour % 24 : 0;
}
