// De laatste regel van het ZWBeter-blok in Strava: een tip of grap bij de rit.
// Uit vaste regels, niet van een AI: de tekst staat openbaar op Strava zonder dat
// iemand hem eerst leest, en zo gaan er geen ritgegevens naar OpenAI.
//
// De situaties staan op volgorde; de eerste die past, levert de regel. Per
// situatie een paar varianten, gekozen op het ritnummer: dezelfde rit krijgt bij
// een nieuwe poging dezelfde zin, en opeenvolgende ritten lezen niet allemaal
// hetzelfde. De teksten volgen de schrijfregels van lib/ai-writing.ts (geen
// uitroeptekens, geen gedachtestreepjes, geen stoplappen, geen afkortingen als CTL).
//
// Puur.

import { intensityLabel } from "@/lib/training/workouts";
import type { FitnessTrend } from "@/lib/training/zwbeterworden";

export type TipInput = {
  activityId: number;
  hasPlan: boolean;
  plannedIntensity: string | null;
  detectedIntensity: string | null;
  /** Werkelijke t.o.v. geplande belasting in hele procenten; null zonder beide. */
  loadPct: number | null;
  readinessLevel: number | null;
  fitnessTrend: FitnessTrend;
  /** Alleen als de steen er mag staan; zie BriljantSummary in strava-summary.ts. */
  nextLevel: string | null;
  toNext: number | null;
  weakestFacet: string | null;
};

export type TipSituation =
  | "moe-hard"
  | "harder-dan-type"
  | "boven-plan"
  | "onder-plan"
  | "volgens-plan"
  | "bijna-klasse"
  | "fitheid-stijgt"
  | "fitheid-zakt"
  | "vrije-rit"
  | "algemeen";

/**
 * De varianten per situatie. Plaatshouders: {pct} (procent, zonder teken),
 * {gepland} en {gereden} (type in kleine letters), {volgende} (klasse),
 * {punten} (punten tot die klasse) en {facet} (laagste facet van de steen).
 */
export const TIP_VARIANTS: Record<TipSituation, readonly string[]> = {
  "moe-hard": [
    "Moe begonnen en toch hard gereden. Morgen mag het rustig.",
    "Je lichaam vroeg om rust en kreeg een harde rit. Houd het morgen bij een rondje koffie.",
    "Met deze gereedscore was dit dapper. Slaap vannacht wat langer.",
  ],
  "harder-dan-type": [
    "{Gepland} gepland, {gereden} gereden. Het schema was vandaag meer een suggestie.",
    "Dit was bedoeld als {gepland}. Je benen lazen het schema anders.",
    "Het schema zei {gepland}, je wattage zei {gereden}. Wie er gewonnen heeft, is duidelijk.",
  ],
  "boven-plan": [
    "{pct}% boven plan. Daar zat meer in dan het schema dacht.",
    "{pct}% meer belasting dan gepland. Rijd de volgende training precies zoals hij staat.",
    "Ruim boven plan. Extra is leuk, maar het herstel betaalt de rekening.",
  ],
  "onder-plan": [
    "{pct}% onder plan. Ook een halve training is een training.",
    "Minder dan gepland. Was het zwaar, dan was eerder stoppen een goede keus.",
    "Onder plan gebleven. Kijk of de volgende training nog past bij hoe je je voelt.",
  ],
  "volgens-plan": [
    "Bijna op de watt nauwkeurig. Je trainer zoekt nog naar iets om op te mopperen.",
    "Precies volgens plan. Zo saai kan trainen zijn, en zo hoort het.",
    "Gepland en gereden lagen dicht bij elkaar. Daar kan geen schema iets op aanmerken.",
  ],
  "bijna-klasse": [
    "Nog {punten} punten tot {volgende}. {Facet} is het laagste facet van je steen.",
    "{Volgende} is nog {punten} punten weg. {Facet} staat het laagst op je steen.",
    "Nog {punten} punten en je steen wordt {volgende}. Het laagste facet is {facet}.",
  ],
  "fitheid-stijgt": [
    "Je fitheid stijgt al een paar weken. Gewoon zo doorgaan.",
    "De lijn wijst de laatste weken omhoog. Deze rit hielp mee.",
    "Fitter dan een paar weken terug. Houd dit ritme vast.",
  ],
  "fitheid-zakt": [
    "Je fitheid zakt wat. Een paar vaste trainingen per week houden hem op peil.",
    "De lijn wijst wat omlaag. Deze rit is in elk geval een stap de goede kant op.",
    "Minder fit dan een paar weken terug. Elke rit zoals deze helpt.",
  ],
  "vrije-rit": [
    "Geen schema vandaag. Dan heet het gewoon plezier.",
    "Vrij gereden, zonder plan. Ook dat telt mee voor je fitheid.",
    "Geen training gepland en toch gereden. Je schema vindt het prima.",
  ],
  algemeen: [
    "Weer een rit in de benen.",
    "Gereden is gereden. Op naar de volgende.",
    "Deze staat erin. Tot de volgende.",
  ],
};

/** Zwaarte van een type, om "harder dan gepland" te herkennen. */
const INTENSITY_RANK: Record<string, number> = {
  recovery: 0,
  endurance: 1,
  tempo: 2,
  threshold: 3,
  vo2max: 4,
  anaerobic: 5,
  race: 5,
};

const rank = (intensity: string | null) =>
  intensity == null ? null : (INTENSITY_RANK[intensity] ?? null);

/** Binnen zoveel procent heet een rit "volgens plan". */
const ON_PLAN_PCT = 5;
/** Vanaf zoveel procent erboven of eronder heet hij "boven" of "onder plan". */
const OFF_PLAN_PCT = 15;
/** Zo dicht bij de volgende klasse noemen we die klasse. */
const NEAR_NEXT_POINTS = 30;

export function tipSituation(input: TipInput): TipSituation {
  const planned = rank(input.plannedIntensity);
  const detected = rank(input.detectedIntensity);
  const pct = input.loadPct;

  if (
    input.readinessLevel != null &&
    input.readinessLevel >= 1 &&
    input.readinessLevel <= 2 &&
    detected != null &&
    detected >= INTENSITY_RANK.threshold
  ) {
    return "moe-hard";
  }
  if (input.hasPlan && planned != null && detected != null && detected - planned >= 2) {
    return "harder-dan-type";
  }
  if (pct != null && pct >= OFF_PLAN_PCT) return "boven-plan";
  if (pct != null && pct <= -OFF_PLAN_PCT) return "onder-plan";
  if (pct != null && Math.abs(pct) <= ON_PLAN_PCT) return "volgens-plan";
  if (
    input.nextLevel &&
    input.weakestFacet &&
    input.toNext != null &&
    input.toNext > 0 &&
    input.toNext <= NEAR_NEXT_POINTS
  ) {
    return "bijna-klasse";
  }
  if (input.fitnessTrend === "improving") return "fitheid-stijgt";
  if (input.fitnessTrend === "declining") return "fitheid-zakt";
  if (!input.hasPlan) return "vrije-rit";
  return "algemeen";
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function fill(template: string, input: TipInput): string {
  const values: Record<string, string> = {
    pct: input.loadPct == null ? "" : String(Math.abs(input.loadPct)),
    gepland: intensityLabel(input.plannedIntensity).toLowerCase(),
    gereden: intensityLabel(input.detectedIntensity).toLowerCase(),
    volgende: input.nextLevel ?? "",
    punten: input.toNext == null ? "" : String(input.toNext),
    facet: input.weakestFacet ?? "",
  };
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key.toLowerCase()];
    if (value == null) return match;
    return key.charAt(0) === key.charAt(0).toUpperCase() ? capitalize(value) : value;
  });
}

/** De tip bij een rit, zonder het voorvoegsel. */
export function rideTip(input: TipInput): string {
  const variants = TIP_VARIANTS[tipSituation(input)];
  const index = Math.abs(Math.trunc(input.activityId)) % variants.length;
  return fill(variants[index], input);
}
