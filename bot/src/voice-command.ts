// Spraakcommando's van de captain: van wat whisper verstond naar een actie.
// Zonder I/O, los te testen. Een commando begint met het wekwoord "Coach", zodat
// "daar komt de klim" de bot niet stilzet. Stoppen kan bewust niet met spraak.

export type VoiceCommand =
  /** De echte start: de rest van de vertraging vervalt. */
  | { kind: "start" }
  | { kind: "klim" }
  | { kind: "hervat" }
  | { kind: "volgende" }
  | { kind: "plus"; seconds: number }
  | { kind: "deel"; number: number }
  | { kind: "gelost" | "terug"; rider: number }
  /** Alleen "Coach", met een pauze: het commando volgt in de volgende zin. */
  | { kind: "wake" }
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

/**
 * Hoe een woord klinkt, grof: whisper schrijft een naam die hij niet kent zoals
 * hij hem hoort ("terrens" voor Terrence, "tein" voor Stijn).
 */
function sound(word: string) {
  return word
    .replace(/ph/g, "f")
    .replace(/ch/g, "g")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/c/g, "k")
    .replace(/ij|y/g, "ei")
    .replace(/z/g, "s")
    .replace(/v/g, "f")
    .replace(/d$/, "t")
    .replace(/(.)\1+/g, "$1");
}

/** "gelost", ook zoals whisper het in de race schreef ("koelost", "lost"). */
function isGelost(word: string) {
  return word.endsWith("lost") || distance(sound(word), "gelost") <= 1;
}

function isTerug(word: string) {
  return word === "terug" || (word.length >= 4 && distance(word, "terug") <= 1);
}

/** Woorden die nooit een naam zijn, ook al lijken ze er een beetje op. */
const NOT_A_NAME = new Set(["is", "ook", "weer", "er", "de", "het", "en", "nu", "die", "dat", "deel", "plus", "seconden"]);

/** Hoe een renner te herkennen is: elk deel van de naam, en de naam aan elkaar ("E sli" is ook "esli"). */
function nameKeys(name: string) {
  const parts = normalize(name).split(" ").filter(Boolean);
  const keys = parts.filter((part) => part.length >= 3);
  const joined = parts.join("");
  if (parts.length > 1 || keys.length === 0) keys.push(joined);
  return keys.map(sound);
}

/** De renner die het best past, of -1 als geen of twee even goed passen. */
function riderIn(words: string[], names: string[]) {
  const keys = names.map(nameKeys);
  const candidates = words
    .filter((word) => !NOT_A_NAME.has(word) && !WAKE.has(word) && !isGelost(word) && !isTerug(word) && number(word) === null)
    .map(sound);
  let best = { rider: -1, cost: Infinity, tie: false };
  keys.forEach((riderKeys, rider) => {
    for (const word of candidates) {
      for (const key of riderKeys) {
        let cost = word === key ? 0 : Infinity;
        if (cost !== 0 && word.length >= 4 && key.length >= 4) {
          const d = distance(word, key);
          if (d <= (key.length >= 6 ? 2 : 1)) cost = d;
        }
        if (cost < best.cost) best = { rider, cost, tie: false };
        else if (cost === best.cost && cost !== Infinity && rider !== best.rider) best.tie = true;
      }
    }
  });
  return best.tie ? -1 : best.rider;
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
  if (rest.length === 0) return { kind: "wake" };
  const has = (...options: string[]) => rest.some((word) => options.includes(word));

  const back = rest.some(isTerug);
  if (back || rest.some(isGelost)) {
    const rider = riderIn(rest, names);
    if (rider !== -1) return { kind: back ? "terug" : "gelost", rider };
    return { kind: "onbekend" };
  }
  if (has("start", "starten", "starts")) return { kind: "start" };
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

/** Hoe de captain een renner noemt: de voornaam, of korte delen aan elkaar ("E sli" wordt "Esli"). */
export function spokenName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name;
  if (parts[0].length <= 2) return parts.join("");
  return parts[0];
}

/**
 * Hint voor whisper: met deze zinnen verstond hij in de meting 7 van de 7
 * commando's goed. Elke renner staat erin zoals de captain hem noemt, in een
 * zin: een naam die whisper niet kent, schrijft hij anders op zoals hij hem
 * hoort (in de race van 2026-11-17 "terrens" en "tein").
 */
export function voicePrompt(names: string[]) {
  const riders = names.length > 0 ? names : ["Jeroen"];
  return [
    "Coach, start.",
    "Coach, klim.",
    "Coach, hervat.",
    "Coach, volgende.",
    "Coach, plus tien.",
    "Coach, plus dertig.",
    "Coach, deel twee.",
    ...riders.map((name, index) => `Coach, ${spokenName(name)} ${index % 2 === 0 ? "gelost" : "terug"}.`),
  ].join(" ");
}

export const NOT_UNDERSTOOD = "Niet verstaan.";
/** Klim terwijl het al klim is, of hervat terwijl de rotatie loopt. */
export const ALREADY = "Staat al zo.";
/** "Coach, start" terwijl de rotatie al loopt. */
export const ALREADY_RUNNING = "We rijden al.";

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
    ALREADY_RUNNING,
    `${DEFAULT_PLUS_S} seconden erbij.`,
    ...names.flatMap((name) => [`${name} gelost.`, `${name} terug.`]),
  ];
}
