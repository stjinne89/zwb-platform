// Suggesties voor de feedback van de trainer op een uitgevoerde training.
// Puur: geen I/O. Dezelfde regel als bij de racetips (ZWBeter racen): alleen een
// suggestie als de data een gevolg of een afwijking laat zien die bij het soort
// training past, met het getal erbij. De trainer beslist of hij hem gebruikt.
// Onderbouwing en drempels: docs/racestrategie-onderzoek.md, "Trainingsanalyse".

import type { ExecutionAnalysis } from "@/lib/training/execution";
import { plannedZoneSeconds, type ZoneTimes } from "@/lib/training/zone-times";
import type { WorkoutBlock } from "@/lib/training/workouts";

export type TrainingSuggestion = {
  /** Wat de data laat zien. */
  finding: string;
  /** Wat de trainer kan teruggeven. */
  tip: string;
  /** Kennisbankartikel met de uitleg erachter. */
  article?: string;
};

/** Laatste herhaling zoveel lager dan de eerste: weggezakt (vuistregel van coaches; ~3% is normaal). */
export const FADE_SHARE = 0.1;
/** Eerste herhaling zoveel boven het doel: te hard begonnen. */
export const FIRST_OVER_SHARE = 0.05;
/** Alle herhalingen samen zoveel onder het doel. */
export const UNDER_TARGET_SHARE = 0.05;
/** Deel van een duur- of herstelrit in zone 3 of hoger: de rustige dag werd tempo. */
export const ENDURANCE_Z3_SHARE = 0.2;
export const RECOVERY_Z3_SHARE = 0.1;
/** Ontkoppeling van vermogen en hartslag vanaf dit percentage (Friel: 5%). */
export const DECOUPLING_PERCENT = 5;
/** RPE vanaf dit getal op een rustige rit is zwaar. */
export const HIGH_RPE = 7;
/** RPE tot en met dit getal op een harde, goed uitgevoerde sessie is licht. */
export const LOW_RPE = 4;
const MAX_SUGGESTIONS = 3;

const EASY = new Set(["recovery", "endurance"]);
const HARD = new Set(["threshold", "vo2max", "anaerobic"]);

export type TrainingAdviceInput = {
  intensity: string;
  execution?: ExecutionAnalysis | null;
  zoneTimes?: ZoneTimes | null;
  athleteRpe: number | null;
  /** Naleving van de training (`te_licht`, `volgens_plan`, `te_zwaar`). */
  verdict?: string | null;
  /** Het schema en de FTP: geplande harde blokken (openers) tellen niet als te hard. */
  blocks?: WorkoutBlock[];
  ftp?: number | null;
  /** Wat het lid zelf schreef en hoe het voelde: een tip sluit daarop aan. */
  athleteReport?: string | null;
  athleteFeel?: string | null;
};

// Wat het lid zelf al opmerkte. Grof op woorden; mist het iets, dan blijft de
// gewone tip staan, en de trainer leest het bericht er altijd naast.
const ADMITS_HARD = /te hard|te snel|harder dan|niet rustig|inhouden|in te houden|rustig (te )?houden|aan de rustige|binnen (de )?zone/;
const FELT_STRONG = /(?<!niet |geen )\bsterk\b|goede benen|benen (waren|zijn) goed/;
const STRAIN: Array<[string, RegExp]> = [
  ["slaap", /slaap|sliep|geslapen/],
  ["stress", /stress|drukte|druk op/],
  ["ziekte", /ziek|verkouden|griep|koorts/],
];

/** Een herhaling onder dit deel van het doel is niet gereden, of het bestand stopte eerder. */
const NOT_RIDDEN_SHARE = 0.5;

/** Herhalingen met hetzelfde doel: de grootste groep, in volgorde. */
function mainSet(reps: ExecutionAnalysis["reps"]) {
  const groups = new Map<number, ExecutionAnalysis["reps"]>();
  for (const rep of reps) {
    if (!rep.targetWatts || rep.avgWatts < rep.targetWatts * NOT_RIDDEN_SHARE) continue;
    const key = Math.round(rep.targetWatts / 5) * 5;
    groups.set(key, [...(groups.get(key) ?? []), rep]);
  }
  return [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? [];
}

export function trainingSuggestions(input: TrainingAdviceInput): TrainingSuggestion[] {
  const out: TrainingSuggestion[] = [];
  const note = (input.athleteReport ?? "").toLowerCase();
  const reps = input.execution ? mainSet(input.execution.reps) : [];

  if (reps.length >= 3) {
    const first = reps[0];
    const last = reps[reps.length - 1];
    const target = first.targetWatts as number;
    const fade = (first.avgWatts - last.avgWatts) / first.avgWatts;
    const over = (first.avgWatts - target) / target;
    const average = reps.reduce((s, r) => s + r.avgWatts, 0) / reps.length;
    if (fade >= FADE_SHARE && over >= FIRST_OVER_SHARE) {
      out.push({
        finding: `Herhaling 1 ging op ${first.avgWatts} W (doel ${target} W), de laatste op ${last.avgWatts} W: ${Math.round(100 * fade)}% weggezakt.`,
        tip: `Begin de eerste herhaling op het doel; met ${Math.round(100 * over)}% erboven betaal je dat in de laatste.`,
      });
    } else if (fade >= FADE_SHARE) {
      out.push({
        finding: `De herhalingen zakten weg van ${first.avgWatts} naar ${last.avgWatts} W (${Math.round(100 * fade)}%), terwijl de eerste op doel lag.`,
        tip: "Het doel of de herhalingen waren vandaag te veel: langere rust tussen de herhalingen, of het doel een paar procent lager.",
      });
    } else if (average < target * (1 - UNDER_TARGET_SHARE) && input.athleteRpe !== null && input.athleteRpe >= 8) {
      out.push({
        finding: `Alle herhalingen bleven onder het doel (gemiddeld ${Math.round(average)} W tegen ${target} W) en het voelde zwaar (RPE ${input.athleteRpe}).`,
        tip: "Mogelijk staat de FTP te hoog of is er vermoeidheid: overweeg een FTP-test of een rustigere week.",
      });
    }
  }

  let crept = false;
  if (EASY.has(input.intensity) && input.zoneTimes?.source === "intervals") {
    const seconds = input.zoneTimes.seconds;
    const total = seconds.reduce((s, v) => s + v, 0);
    const high = seconds.slice(2).reduce((s, v) => s + v, 0);
    // Geplande openers of tempoblokken horen erbij; alleen wat daarboven komt telt.
    const planned = input.blocks ? plannedZoneSeconds(input.blocks, input.ftp ?? null) : [];
    const plannedTotal = planned.reduce((s, v) => s + v, 0);
    const plannedHigh = plannedTotal ? planned.slice(2).reduce((s, v) => s + v, 0) / plannedTotal : 0;
    const limit = input.intensity === "recovery" ? RECOVERY_Z3_SHARE : ENDURANCE_Z3_SHARE;
    if (total >= 20 * 60 && high / total - plannedHigh >= limit) {
      crept = true;
      // Zone 3 begint bij 76% van de FTP waarmee is ingedeeld.
      const ceiling = Math.floor(0.75 * input.zoneTimes.ftpWatts);
      const admits = ADMITS_HARD.test(note);
      const good = input.athleteFeel === "goed" || FELT_STRONG.test(note);
      const opener =
        admits && good
          ? "Je merkte het zelf al, en op een dag dat het goed voelt is inhouden het lastigst."
          : admits
            ? "Je merkte het zelf al."
            : good
              ? "Op een dag dat het goed voelt is inhouden het lastigst."
              : null;
      out.push({
        finding: `${Math.round((100 * high) / total)}% van deze ${input.intensity === "recovery" ? "herstelrit" : "duurrit"} lag in zone 3 of hoger${plannedHigh >= 0.05 ? `, gepland was ${Math.round(100 * plannedHigh)}%` : ""}.`,
        tip: opener
          ? `${opener} Bewaar dat voor de volgende harde training: de rustige rit doet zijn werk op lage intensiteit, tempo erbovenop kost vooral herstel. Blijf onder ${ceiling} W, op Zwift desnoods met een workout in ERG-modus.`
          : `Houd rustige ritten rustig: dan zijn de harde dagen beter. Blijf onder ${ceiling} W; rij in een groep of op Zwift desnoods achteraan of alleen.`,
        article: "/zwbeter-worden/kennis/rustige-ritten",
      });
    }
  }

  const decoupling = input.execution?.decoupling ?? null;
  if (EASY.has(input.intensity) && decoupling !== null && decoupling >= DECOUPLING_PERCENT) {
    out.push({
      finding: `Vermogen en hartslag liepen ${String(decoupling).replace(".", ",")}% uit elkaar tussen de eerste en de tweede helft.`,
      tip: "Boven 5% is de duur nog niet stevig op dit tempo: iets lager of korter tot het eronder blijft, en let op drinken, eten en warmte.",
    });
  }

  if (input.athleteRpe !== null) {
    // Een zware RPE op een rit die te hard gereden is, verklaart zichzelf.
    if (EASY.has(input.intensity) && input.athleteRpe >= HIGH_RPE && !crept) {
      const named = STRAIN.filter(([, pattern]) => pattern.test(note)).map(([word]) => word);
      out.push({
        finding: `Een ${input.intensity === "recovery" ? "herstelrit" : "duurrit"} voelde zwaar: RPE ${input.athleteRpe}.`,
        tip: named.length
          ? `Je noemde zelf ${named.join(" en ")}: dat kan een zware rustige rit verklaren. Bij meer zware rustige ritten op rij is een lichtere week verstandig.`
          : "Vraag naar slaap, stress en ziekte; bij meer zware rustige ritten op rij is een lichtere week verstandig.",
      });
    } else if (HARD.has(input.intensity) && input.athleteRpe <= LOW_RPE && input.verdict === "volgens_plan" && !out.length) {
      out.push({
        finding: `Een zware sessie volgens plan, en het voelde licht: RPE ${input.athleteRpe}.`,
        tip: "Er is ruimte om op te bouwen: een herhaling erbij of het doel een paar procent hoger.",
      });
    }
  }

  return out.slice(0, MAX_SUGGESTIONS);
}
