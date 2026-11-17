// Spraakcommando's van de captain: van wat whisper verstond naar een actie.
// Zonder I/O, los te testen. Een commando begint met het wekwoord "Coach", zodat
// "daar komt de klim" de bot niet stilzet. Stoppen kan bewust niet met spraak.

export type VoiceCommand =
  | { kind: "klim" }
  | { kind: "hervat" }
  | { kind: "volgende" }
  | { kind: "plus"; seconds: number }
  | { kind: "deel"; number: number }
  | { kind: "gelost" | "terug"; rider: number }
  /** Wel het wekwoord, geen commando dat de bot kent. */
  | { kind: "onbekend" };

/** Zo schrijft whisper "Coach" ook op, gemeten zonder hint (2026-11-17). */
const WAKE = new Set(["coach", "coatch", "koach", "koch", "kotje", "kootje", "koets", "koetsj", "koutch", "kouts"]);

const NUMBERS: Record<string, number> = {
  een: 1,
  twee: 2,
  vijf: 5,
  tien: 10,
  vijftien: 15,
  twintig: 20,
  dertig: 30,
  veertig: 40,
  vijftig: 50,
  zestig: 60,
};

const DEFAULT_PLUS_S = 10;
const MAX_PLUS_S = 120;

/** Kleine letters, zonder accenten en leestekens; "+10" wordt "plus 10". */
export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function number(word: string | undefined) {
  if (!word) return null;
  if (/^\d+$/.test(word)) return Number(word);
  return NUMBERS[normalize(word)] ?? null;
}

/** Afstand in letters, voor namen die whisper net anders schrijft. */
function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

function riderIn(words: string[], names: string[]) {
  const keys = names.map((name) => normalize(name).split(" "));
  for (const word of words) {
    const exact = keys.findIndex((parts) => parts.includes(word));
    if (exact !== -1) return exact;
  }
  for (const word of words) {
    if (word.length < 4) continue;
    const close = keys.findIndex((parts) => parts.some((part) => part.length >= 4 && distance(part, word) <= 1));
    if (close !== -1) return close;
  }
  return -1;
}

/**
 * Het commando in wat whisper verstond, of null als de captain het wekwoord
 * niet zei (dan praatte hij tegen de ploeg, niet tegen de bot).
 */
export function parseVoiceCommand(text: string, names: string[]): VoiceCommand | null {
  const words = normalize(text).split(" ").filter(Boolean);
  const wake = words.findIndex((word) => WAKE.has(word));
  if (wake === -1) return null;
  const rest = words.slice(wake + 1);
  const has = (...options: string[]) => rest.some((word) => options.includes(word));

  if (has("gelost", "lost", "terug")) {
    const rider = riderIn(rest, names);
    if (rider !== -1) return { kind: has("terug") ? "terug" : "gelost", rider };
    return { kind: "onbekend" };
  }
  if (has("klim", "klimmen", "clim")) return { kind: "klim" };
  if (has("hervat", "hervatten", "rotatie")) return { kind: "hervat" };
  if (has("volgende", "wissel", "skip")) return { kind: "volgende" };
  if (has("plus", "erbij", "langer")) {
    const amount = rest.map(number).find((value) => value !== null);
    const seconds = Math.min(MAX_PLUS_S, Math.max(1, amount ?? DEFAULT_PLUS_S));
    return { kind: "plus", seconds };
  }
  const part = rest.indexOf("deel");
  if (part !== -1) {
    const value = number(rest[part + 1]);
    if (value !== null) return { kind: "deel", number: value };
  }
  return { kind: "onbekend" };
}

/** Hint voor whisper: met deze zinnen verstond hij in de meting 7 van de 7 commando's goed. */
export function voicePrompt(names: string[]) {
  const [first = "Jeroen", second = first] = names;
  return [
    "Coach, klim.",
    "Coach, hervat.",
    "Coach, volgende.",
    "Coach, plus tien.",
    "Coach, deel twee.",
    `Coach, ${first} gelost.`,
    `Coach, ${second} terug.`,
    ...names.slice(2).map((name) => `${name}.`),
  ].join(" ");
}

export const NOT_UNDERSTOOD = "Niet verstaan.";
/** Klim terwijl het al klim is, of hervat terwijl de rotatie loopt. */
export const ALREADY = "Staat al zo.";

/** Wat de bot terugzegt na een commando dat zelf niets uitspreekt. */
export function confirmation(command: VoiceCommand, names: string[]): string | null {
  if (command.kind === "plus") return `${command.seconds} seconden erbij.`;
  if (command.kind === "gelost") return `${names[command.rider]} gelost.`;
  if (command.kind === "terug") return `${names[command.rider]} terug.`;
  if (command.kind === "onbekend") return NOT_UNDERSTOOD;
  return null;
}

/** De bevestigingen, om vooraf klaar te zetten: Piper doet een seconde over een nieuwe zin. */
export function confirmationPhrases(names: string[]) {
  return [
    NOT_UNDERSTOOD,
    ALREADY,
    `${DEFAULT_PLUS_S} seconden erbij.`,
    ...names.flatMap((name) => [`${name} gelost.`, `${name} terug.`]),
  ];
}
