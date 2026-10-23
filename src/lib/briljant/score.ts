// ZWBriljant: van echte metingen naar een niveau per facet, de score, de
// consistentie en de drie kaders (wereld, club, jij).
//
// Intern is de score een niveau met decimalen (4,55 = niveau 4, iets over de
// helft naar 5); op het scherm staat hij in punten, 100 per niveau (455), zonder
// plafond. Puur en zonder database: de pagina en de wekelijkse job leveren
// de waarden aan. Een facet zonder gegevens is null en telt nergens mee; er wordt
// nooit een waarde verzonnen. Achter elk getal staat de meting met eenheid en het
// stuk van de schaal waarin hij valt; het scherm toont dat als balk, de formules
// staan op /hulp.

import {
  CTL_ANCHORS,
  DURABILITY_ANCHORS,
  DURABILITY_MIN_DURATIONS,
  DURABILITY_MIN_KJ_PER_KG,
  DURABILITY_QUANTILE,
  DURABILITY_RIDES_CAP,
  LEVELS,
  FACET_WEIGHTS,
  ZRS_ANCHORS,
  levelOf,
  powerAnchors,
  type Anchors,
  type Level,
  type PowerDuration,
  type Sex,
} from "./norms";

/** Rond de steen: van kort naar lang vermogen, dan vermoeid, fitheid en racen, en terug naar sprint. */
export const FACETS = ["sprint", "anaeroob", "vo2max", "drempel", "durability", "fitheid", "racen"] as const;
export type Facet = (typeof FACETS)[number];

export const FACET_LABELS: Record<Facet, string> = {
  sprint: "Sprint",
  anaeroob: "Anaeroob",
  vo2max: "VO2max",
  drempel: "Drempel",
  durability: "Durability",
  fitheid: "Fitheid",
  racen: "Racen",
};

/** Wat er gemeten wordt, zoals het naast het getal staat. */
export const FACET_MEASURES: Record<Facet, { what: string; unit: string }> = {
  sprint: { what: "beste 15 seconden", unit: "W/kg" },
  anaeroob: { what: "beste minuut", unit: "W/kg" },
  vo2max: { what: "beste 5 minuten", unit: "W/kg" },
  drempel: { what: "beste 20 minuten", unit: "W/kg" },
  durability: { what: "verval op 1 tot 20 minuten", unit: "% per 10 kJ/kg" },
  fitheid: { what: "CTL", unit: "TSS/dag" },
  racen: { what: "Zwift Racing Score", unit: "ZRS" },
};

const POWER_FACETS: Record<"sprint" | "anaeroob" | "vo2max" | "drempel", PowerDuration> = {
  sprint: "s15",
  anaeroob: "m1",
  vo2max: "m5",
  drempel: "m20",
};

// ── Schaal ──────────────────────────────────────────────────────────────────

/** Een ijkpunt: "niveau 4 (4,0 W/kg)". Niveau 0 is de nulwaarde. */
export type ScalePoint = { level: number; value: number };

/**
 * Waar een waarde op de schaal valt, met de twee ijkpunten waartussen gerekend
 * wordt. Voor alle drie de soorten geldt dezelfde formule:
 * niveau = lager.niveau + (waarde − lager.waarde) ÷ (hoger.waarde − lager.waarde) × (hoger.niveau − lager.niveau).
 * Bij `beyond` (voorbij niveau 9) zijn dat de laatste twee ijkpunten,
 * doorgetrokken; bij `floor` (onder de nulwaarde) is het 0.
 */
export type ScaleStep = {
  kind: "floor" | "between" | "beyond";
  value: number;
  level: number;
  lower: ScalePoint;
  upper: ScalePoint;
};

function scalePoints(anchors: Anchors): ScalePoint[] {
  return [{ level: 0, value: anchors.zero }, ...anchors.levels.map((value, index) => ({ level: index + 1, value }))];
}

const interpolate = (value: number, lower: ScalePoint, upper: ScalePoint) =>
  lower.level + ((value - lower.value) / (upper.value - lower.value)) * (upper.level - lower.level);

/** Waar `value` op de schaal valt, en welk niveau dat is. */
export function scaleStep(anchors: Anchors, value: number): ScaleStep {
  const points = scalePoints(anchors);
  const better = (a: number, b: number) => (anchors.lowerIsBetter ? a < b : a > b);
  if (!Number.isFinite(value) || !better(value, points[0].value)) {
    return { kind: "floor", value, level: 0, lower: points[0], upper: points[1] };
  }
  for (let index = 1; index < points.length; index++) {
    if (!better(value, points[index].value)) {
      const lower = points[index - 1];
      const upper = points[index];
      return { kind: "between", value, level: interpolate(value, lower, upper), lower, upper };
    }
  }
  const lower = points[points.length - 2];
  const upper = points[points.length - 1];
  return { kind: "beyond", value, level: interpolate(value, lower, upper), lower, upper };
}

/**
 * Het niveau bij een waarde: lineair tussen de ijkwaarden, en voorbij niveau 9
 * lineair door met de helling van het laatste stuk. Daardoor heeft de schaal
 * geen plafond. Onder de nulwaarde is het 0.
 */
export function levelAt(anchors: Anchors, value: number): number {
  return scaleStep(anchors, value).level;
}

/**
 * De waarde bij een niveau: het omgekeerde van `levelAt`, recht tussen de
 * ijkwaarden en voorbij niveau 9 met de helling van het laatste stuk. Niveau 0 of
 * lager geeft de nulwaarde. Zo is een bewaard niveau terug te rekenen naar W/kg,
 * CTL, verval of ZRS, op de afronding van het niveau na.
 */
export function valueAt(anchors: Anchors, level: number): number {
  const points = scalePoints(anchors);
  if (!Number.isFinite(level) || level <= 0) return points[0].value;
  const index = Math.min(points.length - 1, Math.max(1, Math.ceil(level)));
  const lower = points[index - 1];
  const upper = points[index];
  return lower.value + (level - lower.level) * (upper.value - lower.value);
}

// ── Niveaus ─────────────────────────────────────────────────────────────────

/** Punten per niveau: niveau 4 is 400 tot 499 punten. */
export const POINTS_PER_LEVEL = 100;

/**
 * Een niveau als punten, zoals op het scherm: 4,55 wordt 455. Afgekapt, niet
 * afgerond, zodat 4,999 nog 499 is en 500 pas bij het volgende niveau verschijnt.
 */
export function points(level: number): number {
  return Math.floor(Math.max(0, level) * POINTS_PER_LEVEL + 1e-9);
}

export type LevelPosition = {
  /** De klasse waarin je zit; onder de 100 punten is dat Koper. */
  reached: Level;
  /** De klasse erna; null in Diamant (dan telt de score gewoon door). */
  next: Level | null;
  /** Punten tot de volgende klasse; 0 in Diamant. */
  toNext: number;
};

export function positionFor(score: number): LevelPosition {
  const value = points(score);
  const reached = levelOf(value / POINTS_PER_LEVEL);
  const next = LEVELS[reached.n + 1] ?? null;
  return { reached, next, toNext: next ? next.n * POINTS_PER_LEVEL - value : 0 };
}

/** De score in punten met een punt als duizendtal, zoals op het scherm: "455", "1.020". */
export function formatScore(score: number): string {
  return points(score).toLocaleString("nl-NL");
}

// ── Facetten ──────────────────────────────────────────────────────────────────

/** W/kg per duur, uit `rider_power_profiles`. */
export type PowerInput = { s15: number | null; m1: number | null; m5: number | null; m20: number | null };

/** Een punt van een vermoeide curve: de beste watts op één duur na zoveel voorafgaand werk. */
export type FatigueInput = {
  afterKj: number;
  /** De duur in seconden (DURABILITY_DURATIONS). */
  seconds?: number;
  /** Beste vermogen vers en na het werk, op die duur. */
  freshWatts: number;
  fatiguedWatts: number;
};

/** De uitslag van een durability-test: 20 minuten na het werk tegen je beste 20 minuten. */
export type DurabilityTestInput = {
  /** De testdag ("YYYY-MM-DD"); leeg bij de recordsteen. */
  day: string;
  afterKj: number;
  freshWatts: number;
  fatiguedWatts: number;
};

export type BriljantInput = {
  sex: Sex | null;
  weightKg: number | null;
  power: PowerInput | null;
  fatigue: FatigueInput[];
  /** Een durability-test van de laatste 90 dagen; gaat voor op `fatigue`. */
  durabilityTest?: DurabilityTestInput | null;
  ctl: number | null;
  zrs: number | null;
};

/**
 * De meting achter een facet en de omrekening naar een niveau. Bij durability ook
 * waar het verval vandaan komt, en of het plafond van de ritten het niveau afkapte.
 */
export type FacetReading = ScaleStep & {
  source?: "test" | "ritten";
  testDay?: string;
  capped?: boolean;
};

function positive(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

/** Het kwantiel `q` (0 tot 1) van een reeks, lineair tussen de waarden. */
export function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * q;
  const below = Math.floor(index);
  const above = Math.min(below + 1, sorted.length - 1);
  return sorted[below] + (sorted[above] - sorted[below]) * (index - below);
}

/** Verlies in procenten; meer vermogen na het werk dan vers telt als geen verval. */
const lossPct = (freshWatts: number, fatiguedWatts: number) => Math.max(0, (1 - fatiguedWatts / freshWatts) * 100);

/**
 * Verval uit je ritten, in procenten per 10 kJ/kg: het eerste kwart (P25) van het
 * verval op 1 tot 20 minuten, na de laagste kJ-stand met genoeg werk en genoeg duren
 * (eigenaar, 2026-10-23). Eerst alleen de minuut, en daarvoor het gemiddelde over de
 * standen; na 2000 kJ rijdt bijna niemand nog voluit, dus die stand trok durability
 * omlaag (eigenaar, 2026-10-22). Zie DURABILITY_QUANTILE.
 */
export function durabilityDecline(fatigue: FatigueInput[], weightKg: number | null): number | null {
  const weight = positive(weightKg);
  if (!weight) return null;
  const stands = new Map<number, number[]>();
  for (const point of fatigue) {
    if (!positive(point.freshWatts) || !positive(point.fatiguedWatts) || point.afterKj / weight < DURABILITY_MIN_KJ_PER_KG) {
      continue;
    }
    stands.set(point.afterKj, [...(stands.get(point.afterKj) ?? []), lossPct(point.freshWatts, point.fatiguedWatts)]);
  }
  const lowest = [...stands]
    .filter(([, losses]) => losses.length >= DURABILITY_MIN_DURATIONS)
    .sort((a, b) => a[0] - b[0])[0];
  if (!lowest) return null;
  const [afterKj, losses] = lowest;
  return quantile(losses, DURABILITY_QUANTILE) / (afterKj / weight / 10);
}

/** Verval uit een durability-test, in procenten per 10 kJ/kg; null bij te weinig werk. */
export function durabilityTestDecline(test: DurabilityTestInput | null | undefined, weightKg: number | null): number | null {
  const weight = positive(weightKg);
  if (!test || !weight || !positive(test.freshWatts) || !positive(test.fatiguedWatts)) return null;
  const kjPerKg = test.afterKj / weight;
  if (!(kjPerKg >= DURABILITY_MIN_KJ_PER_KG)) return null;
  return lossPct(test.freshWatts, test.fatiguedWatts) / (kjPerKg / 10);
}

/**
 * Durability als lezing: uit de test als die er is, zonder plafond; anders uit je
 * ritten, tot Diamant (DURABILITY_RIDES_CAP). Bij het plafond blijft het gemeten
 * verval staan en wordt alleen het niveau afgekapt.
 */
export function durabilityReading(input: BriljantInput): FacetReading | null {
  const tested = durabilityTestDecline(input.durabilityTest, input.weightKg);
  if (tested != null) return { ...scaleStep(DURABILITY_ANCHORS, tested), source: "test", testDay: input.durabilityTest!.day };
  const decline = durabilityDecline(input.fatigue, input.weightKg);
  if (decline == null) return null;
  const step = scaleStep(DURABILITY_ANCHORS, decline);
  if (step.level <= DURABILITY_RIDES_CAP) return { ...step, source: "ritten" };
  const points = scalePoints(DURABILITY_ANCHORS);
  return {
    kind: "between",
    value: decline,
    level: DURABILITY_RIDES_CAP,
    lower: points[DURABILITY_RIDES_CAP - 1],
    upper: points[DURABILITY_RIDES_CAP],
    source: "ritten",
    capped: true,
  };
}

/** Het niveau bij een verval, met het plafond voor een schatting uit ritten. */
export function durabilityLevel(decline: number, source: FacetReading["source"]): number {
  const level = levelAt(DURABILITY_ANCHORS, decline);
  return source === "test" ? level : Math.min(DURABILITY_RIDES_CAP, level);
}

/** Per facet de meting en het niveau tegen de wereld; null waar de gegevens ontbreken. */
export function facetReadings(input: BriljantInput): Record<Facet, FacetReading | null> {
  const power = (facet: keyof typeof POWER_FACETS) => {
    const duration = POWER_FACETS[facet];
    const value = positive(input.power?.[duration]);
    return value == null ? null : scaleStep(powerAnchors(duration, input.sex), value);
  };
  const ctl = input.ctl != null && Number.isFinite(input.ctl) && input.ctl >= 0 ? input.ctl : null;
  const zrs = positive(input.zrs);
  return {
    sprint: power("sprint"),
    anaeroob: power("anaeroob"),
    vo2max: power("vo2max"),
    drempel: power("drempel"),
    durability: durabilityReading(input),
    fitheid: ctl == null ? null : scaleStep(CTL_ANCHORS, ctl),
    racen: zrs == null ? null : scaleStep(ZRS_ANCHORS, zrs),
  };
}

/** Alleen het niveau per facet. */
export function facetLevels(input: BriljantInput): Record<Facet, number | null> {
  const readings = facetReadings(input);
  return Object.fromEntries(FACETS.map((facet) => [facet, readings[facet]?.level ?? null])) as Record<
    Facet,
    number | null
  >;
}

/** Zo weinig facetten zijn te weinig om een score op te baseren. */
export const MIN_FACETS_FOR_SCORE = 4;

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * De profielscore: de optelling van de gewogen facetten (FACET_WEIGHTS, samen
 * 100%). Een facet zonder gegevens draagt niets bij (eigenaar, 2026-10-22): eerst
 * gingen de gewichten van de rest weer naar 100%, waardoor een lid zonder fitheid
 * of durability een gemiddelde van zijn sterkste onderdelen kreeg. Null bij te
 * weinig facetten. Nog zonder consistentie; zie `scoreFor`.
 */
export function profileScore(facets: Record<Facet, number | null>): number | null {
  const present = FACETS.filter((facet) => facets[facet] != null);
  if (present.length < MIN_FACETS_FOR_SCORE) return null;
  return present.reduce((sum, facet) => sum + FACET_WEIGHTS[facet] * facets[facet]!, 0);
}

/**
 * Hoe zwaar consistentie meetelt: tot 20% van de score (eigenaar, 2026-10-21).
 * Een factor en geen eigen facet, omdat consistentie tegen je eigen norm wordt
 * gemeten en niet tegen de wereld: als facet zou trouw trainen op een laag niveau
 * wereldtop-punten opleveren.
 */
export const CONSISTENCY_WEIGHT = 0.2;

/** 0,8 + 0,2 × consistentie; zonder consistentie (geen ritgegevens) 1, zodat ontbrekende gegevens niets kosten. */
export function consistencyFactor(consistency: number | null): number {
  if (consistency == null || !Number.isFinite(consistency)) return 1;
  return 1 - CONSISTENCY_WEIGHT + CONSISTENCY_WEIGHT * Math.min(1, Math.max(0, consistency));
}

/**
 * De score: de profielscore maal de consistentiefactor, op twee decimalen (het
 * scherm toont punten). Null bij te weinig facetten.
 */
export function scoreFor(facets: Record<Facet, number | null>, consistency: number | null = null): number | null {
  const profile = profileScore(facets);
  return profile == null ? null : round2(profile * consistencyFactor(consistency));
}

// ── Consistentie ────────────────────────────────────────────────────────────

/** Een week telt als je minstens dit deel van je eigen norm reed. */
export const NORM_SHARE = 0.6;
export const CONSISTENCY_WEEKS = 12;
/** Schaal van het volhouden: V = 1 − e^(−weken/12). */
export const STREAK_SCALE_WEEKS = 12;

/** Een afgesloten week, oud naar nieuw. */
export type ConsistencyWeek = {
  monday: string;
  /** Gereden uren in die week. */
  hours: number;
  /** Geplande trainingstijd in het schema voor die week; null of 0 zonder schema. */
  plannedHours: number | null;
  /** Een geplande herstelweek uit het schema: breekt de reeks niet. */
  plannedRecovery: boolean;
  /** Gereden TSS (trainingsbelasting uit intervals.icu); null zonder intervals.icu. */
  load?: number | null;
  /** Geplande TSS, geschat uit duur en intensiteit van het schema; null zonder schema. */
  plannedLoad?: number | null;
};

export type ConsistencyInput = {
  /** De afgesloten weken tot en met vorige week, oud naar nieuw; zo veel als er zijn (tot een jaar). */
  weeks: ConsistencyWeek[];
  /** Aandeel van de geplande trainingen gedaan, gewogen naar duur, over twaalf weken; null zonder schema. */
  compliance: number | null;
};

export type Consistency = {
  /** R: aandeel van de laatste twaalf weken op minstens 60% van je norm. */
  regularity: number;
  /** V: 1 − e^(−reeks/12). */
  persistence: number;
  /** De huidige ononderbroken reeks in weken. */
  streak: number;
  /** N: naleving van het schema; null zonder schema (telt dan niet mee). */
  compliance: number | null;
  /**
   * Waarin gemeten: TSS als intervals.icu de trainingsbelasting geeft (eigenaar,
   * 2026-10-21: belasting zegt meer dan alleen duur), anders uren.
   */
  measure: "tss" | "uren";
  /**
   * Je norm per week in die maat (de mediaan over de laatste twaalf weken) en waar
   * die vandaan komt: "schema" als de meeste weken een schema hadden.
   */
  norm: number;
  normSource: "schema" | "mediaan";
  /** R × (0,5 + 0,5 · V) × N, van 0 tot 1. */
  value: number;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Consistentie, altijd ten opzichte van jezelf: geen absolute uren (die zitten al
 * in Fitheid). De norm geldt per week: de trainingstijd die het schema die week
 * plande, en zonder schema je eigen mediaan van de weekuren. Niet je
 * beschikbaarheid: dat is een plafond voor het plannen, geen doel (eigenaar,
 * 2026-10-21; wie zijn schema volgde, haalde eerst de norm niet). Meer dan de
 * norm telt als gehaald, nooit als straf. Een geplande herstelweek telt als
 * gehaald. Null als er geen norm te bepalen is.
 */
export function consistencyFrom(input: ConsistencyInput): Consistency | null {
  const weeks = input.weeks;
  if (weeks.length === 0) return null;
  const recent = weeks.slice(-CONSISTENCY_WEEKS);
  // TSS als die er voor de meeste recente weken is, anders uren.
  const withLoad = recent.filter((week) => week.load != null).length;
  const measure: Consistency["measure"] = withLoad * 2 >= recent.length && weeks.some((week) => (week.load ?? 0) > 0) ? "tss" : "uren";
  const done = (week: ConsistencyWeek) => Math.max(0, measure === "tss" ? (week.load ?? 0) : week.hours);
  const planned = (week: ConsistencyWeek) => positive(measure === "tss" ? week.plannedLoad : week.plannedHours);
  const usual = median(weeks.map(done));
  const normOf = (week: ConsistencyWeek) => planned(week) ?? usual;
  if (!weeks.some((week) => normOf(week) > 0)) return null;

  const counts = (week: ConsistencyWeek) => {
    const norm = normOf(week);
    return week.plannedRecovery || (norm > 0 ? done(week) >= NORM_SHARE * norm : done(week) > 0);
  };
  // Ontbrekende weken aan het begin (nieuw lid) tellen als niet gereden.
  const regularity = recent.filter(counts).length / CONSISTENCY_WEEKS;

  let streak = 0;
  for (let index = weeks.length - 1; index >= 0 && counts(weeks[index]); index--) streak += 1;
  const persistence = 1 - Math.exp(-streak / STREAK_SCALE_WEEKS);

  const compliance =
    input.compliance != null && Number.isFinite(input.compliance) ? Math.min(1, Math.max(0, input.compliance)) : null;
  const value = regularity * (0.5 + 0.5 * persistence) * (compliance ?? 1);
  return {
    regularity: round2(regularity),
    persistence: round2(persistence),
    streak,
    compliance: compliance == null ? null : round2(compliance),
    measure,
    norm: measure === "tss" ? Math.round(median(recent.map(normOf))) : Math.round(median(recent.map(normOf)) * 10) / 10,
    normSource: recent.filter((week) => planned(week)).length * 2 >= recent.length ? "schema" : "mediaan",
    value: round2(value),
  };
}

// ── Kaders ──────────────────────────────────────────────────────────────────

/**
 * Percentiel binnen de club: het aandeel deelnemers dat lager zit, met de helft
 * van wie gelijk zit. `others` zijn de andere deelnemers, niet het lid zelf.
 */
export function clubPercentile(value: number | null, others: Array<number | null>): number | null {
  if (value == null) return null;
  const field = others.filter((other): other is number => other != null);
  if (field.length === 0) return null;
  const below = field.filter((other) => other < value).length;
  const equal = field.filter((other) => other === value).length;
  return Math.round(((below + equal / 2) / field.length) * 100);
}

export type HistoryPoint = { week: string; score: number | null };

/**
 * Jij tegen jezelf: verschil met vier weken geleden en met het beste van het
 * afgelopen jaar. `history` is per week, oud naar nieuw, met de huidige week als
 * laatste.
 */
export function selfFrame(history: HistoryPoint[]): { delta4w: number | null; best: number | null; ofBest: number | null } {
  const known = history.filter((point): point is { week: string; score: number } => point.score != null);
  const now = known.at(-1);
  if (!now) return { delta4w: null, best: null, ofBest: null };
  const best = Math.max(...known.slice(-52).map((point) => point.score));
  const before = history.length >= 5 ? history[history.length - 5].score : null;
  return {
    delta4w: before == null ? null : round2(now.score - before),
    best: round2(best),
    ofBest: best > 0 ? Math.round((now.score / best) * 100) : null,
  };
}
