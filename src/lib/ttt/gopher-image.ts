// Een plan lezen uit de afbeelding van ZwiftGopher (Create Image), met
// tekstherkenning op het toestel. Hier alleen het ordenen van de herkende
// woorden; het herkennen zelf staat in `gopher-image-ocr.ts`.
//
// Gemeten op een echte afbeelding (2026-10-16, versie 1.14.0, 1024 px breed,
// herkend op 2048 px): elk getal staat binnen een paar pixels onder het midden
// van zijn kolomkop, en het sokje met de kitkleur staat tussen het volgnummer en
// de naam en wordt herkend als ruis zoals "JF" of "J)". Daarom werkt dit op de
// positie van elk woord en niet op de volgorde.

export type OcrWord = { text: string; x0: number; x1: number };

export type ImageRider = {
  name: string;
  pullWatts: number;
  pullSeconds: number;
  intensityFactor: number | null;
};

const center = (word: OcrWord) => (word.x0 + word.x1) / 2;
const isNumber = (text: string) => /^\d+(?:\.\d+)?$/.test(text);

/** Het midden van een kolomkop, zoals "Pull (W)" of "Duration (s)". */
function anchor(header: OcrWord[], match: (word: OcrWord, next?: OcrWord) => boolean) {
  const index = header.findIndex((word, i) => match(word, header[i + 1]));
  if (index < 0) return null;
  const word = header[index];
  const next = header[index + 1];
  const unit = next && /^\(.*\)$|^%$/.test(next.text) ? next : null;
  return unit ? (word.x0 + unit.x1) / 2 : center(word);
}

function nearest(words: OcrWord[], x: number, tolerance: number) {
  let best: OcrWord | null = null;
  for (const word of words) {
    const distance = Math.abs(center(word) - x);
    if (distance <= tolerance && (!best || distance < Math.abs(center(best) - x))) best = word;
  }
  return best;
}

/**
 * Renners uit de herkende regels. `width` is de breedte van het beeld waarop
 * herkend is; de marges schalen mee. Zonder herkenbare kopregel geen renners:
 * dan is niet zeker welk getal de kopbeurt is.
 */
export function gopherImageRiders(lines: OcrWord[][], width: number): ImageRider[] {
  const headerIndex = lines.findIndex((line) =>
    line.some((word) => /^name$/i.test(word.text)) &&
    line.some((word) => /^duration/i.test(word.text)),
  );
  if (headerIndex < 0) return [];
  const header = lines[headerIndex];

  const pullX = anchor(header, (word, next) => /^pull$/i.test(word.text) && /^\(w\)$/i.test(next?.text ?? ""));
  const durationX = anchor(header, (word) => /^duration/i.test(word.text));
  const ifX = anchor(header, (word) => /^if%?$/i.test(word.text));
  const nameWord = header.find((word) => /^zwift$/i.test(word.text)) ??
    header.find((word) => /^name$/i.test(word.text));
  if (pullX == null || durationX == null || !nameWord) return [];

  const tolerance = width * 0.03;
  const nameStart = nameWord.x0 - width * 0.01;
  const riders: ImageRider[] = [];

  for (const line of lines.slice(headerIndex + 1)) {
    const [first, ...rest] = line;
    if (!first || !/^\d{1,2}$/.test(first.text)) continue;
    const numbers = rest.filter((word) => isNumber(word.text) && word.x0 > nameStart);
    const pull = nearest(numbers, pullX, tolerance);
    const duration = nearest(numbers, durationX, tolerance);
    if (!pull || !duration) continue;
    const intensity = ifX != null ? nearest(numbers, ifX, tolerance) : null;

    // Op het midden: soms plakt het sokje aan de voornaam vast ("&Han").
    const firstNumber = Math.min(...numbers.map((word) => word.x0));
    const name = rest
      .filter((word) => center(word) >= nameStart && word.x0 < firstNumber && !isNumber(word.text))
      .map((word) => word.text)
      .join(" ")
      .replace(/^[^\p{L}\d]+/u, "")
      .trim();
    if (!name) continue;

    riders.push({
      name,
      pullWatts: Math.round(Number(pull.text)),
      pullSeconds: Math.round(Number(duration.text)),
      intensityFactor: intensity ? Number(intensity.text) : null,
    });
  }
  return riders;
}

/** Als tabel voor het importvak: te controleren vóór het importeren. */
export function imageRidersText(riders: ImageRider[]) {
  return [
    "Naam\tWatt\tDuur\tIF",
    ...riders.map((rider) =>
      [rider.name, rider.pullWatts, rider.pullSeconds, rider.intensityFactor ?? ""].join("\t"),
    ),
  ].join("\n");
}
