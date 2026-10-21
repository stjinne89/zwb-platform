// De ZWBeter-berg: van echte metingen naar een niveau per graat, de score, de
// consistentie en de drie kaders (wereld, club, jij).
//
// Intern is de score een niveau met decimalen (4,55 = niveau 4, iets over de
// helft naar 5); op het scherm staat hij in punten, 100 per niveau (455), zonder
// plafond. Puur en zonder database: de pagina en de wekelijkse job leveren
// de waarden aan. Een graat zonder gegevens is null en telt nergens mee; er wordt
// nooit een waarde verzonnen. Achter elk getal staat de meting met eenheid en het
// stuk van de schaal waarin hij valt, zodat het scherm de omrekening voorrekent.

import {
  CTL_ANCHORS,
  DURABILITY_ANCHORS,
  DURABILITY_MIN_KJ_PER_KG,
  LEVELS,
  RIDGE_WEIGHTS,
  ZRS_ANCHORS,
  powerAnchors,
  type Anchors,
  type Level,
  type PowerDuration,
  type Sex,
} from "./norms";

/** Rond de berg: van kort naar lang vermogen, dan vermoeid, fitheid en racen, en terug naar sprint. */
export const RIDGES = ["sprint", "anaeroob", "vo2max", "drempel", "durability", "fitheid", "racen"] as const;
export type Ridge = (typeof RIDGES)[number];

export const RIDGE_LABELS: Record<Ridge, string> = {
  sprint: "Sprint",
  anaeroob: "Anaeroob",
  vo2max: "VO2max",
  drempel: "Drempel",
  durability: "Durability",
  fitheid: "Fitheid",
  racen: "Racen",
};

/** Wat er gemeten wordt, zoals het naast het getal staat. */
export const RIDGE_MEASURES: Record<Ridge, { what: string; unit: string }> = {
  sprint: { what: "beste 15 seconden", unit: "W/kg" },
  anaeroob: { what: "beste minuut", unit: "W/kg" },
  vo2max: { what: "beste 5 minuten", unit: "W/kg" },
  drempel: { what: "beste 20 minuten", unit: "W/kg" },
  durability: { what: "verval op 20 minuten", unit: "% per 10 kJ/kg" },
  fitheid: { what: "CTL", unit: "TSS/dag" },
  racen: { what: "Zwift Racing Score", unit: "ZRS" },
};

const POWER_RIDGES: Record<"sprint" | "anaeroob" | "vo2max" | "drempel", PowerDuration> = {
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
  /** Het niveau dat je haalt; null onder niveau 1 (minder dan 100 punten). */
  reached: Level | null;
  /** Het niveau erna; null voorbij Aliens (dan telt de score gewoon door). */
  next: Level | null;
  /** Punten tot het volgende niveau; 0 voorbij Aliens. */
  toNext: number;
};

export function positionFor(score: number): LevelPosition {
  const value = points(score);
  const whole = Math.floor(value / POINTS_PER_LEVEL);
  const reached = whole >= 1 ? LEVELS[Math.min(whole, LEVELS.length) - 1] : null;
  const next = whole < LEVELS.length ? LEVELS[whole] : null;
  return { reached, next, toNext: next ? next.n * POINTS_PER_LEVEL - value : 0 };
}

/** De score in punten met een punt als duizendtal, zoals op het scherm: "455", "1.020". */
export function formatScore(score: number): string {
  return points(score).toLocaleString("nl-NL");
}

// ── Graten ──────────────────────────────────────────────────────────────────

/** W/kg per duur, uit `rider_power_profiles`. */
export type PowerInput = { s15: number | null; m1: number | null; m5: number | null; m20: number | null };

/** Een vermoeide curve: de beste watts na zoveel voorafgaand werk. */
export type FatigueInput = {
  afterKj: number;
  /** Beste vermogen vers en na het werk, op dezelfde duur (20 of 5 minuten). */
  freshWatts: number;
  fatiguedWatts: number;
};

export type BergInput = {
  sex: Sex | null;
  weightKg: number | null;
  power: PowerInput | null;
  fatigue: FatigueInput[];
  ctl: number | null;
  zrs: number | null;
};

/** De meting achter een graat en de omrekening naar een niveau. */
export type RidgeReading = ScaleStep;

function positive(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Verval in procenten per 10 kJ/kg, gemiddeld over de curves na genoeg werk.
 * Meer vermogen na het werk dan vers (een vers record later in de rit) telt als
 * geen verval.
 */
export function durabilityDecline(fatigue: FatigueInput[], weightKg: number | null): number | null {
  const weight = positive(weightKg);
  if (!weight) return null;
  const declines = fatigue
    .map((curve) => {
      const kjPerKg = curve.afterKj / weight;
      const fresh = positive(curve.freshWatts);
      const fatigued = positive(curve.fatiguedWatts);
      if (!fresh || !fatigued || kjPerKg < DURABILITY_MIN_KJ_PER_KG) return null;
      const lossPct = Math.max(0, (1 - fatigued / fresh) * 100);
      return lossPct / (kjPerKg / 10);
    })
    .filter((value): value is number => value != null);
  return declines.length === 0 ? null : declines.reduce((sum, value) => sum + value, 0) / declines.length;
}

/** Per graat de meting en het niveau tegen de wereld; null waar de gegevens ontbreken. */
export function ridgeReadings(input: BergInput): Record<Ridge, RidgeReading | null> {
  const power = (ridge: keyof typeof POWER_RIDGES) => {
    const duration = POWER_RIDGES[ridge];
    const value = positive(input.power?.[duration]);
    return value == null ? null : scaleStep(powerAnchors(duration, input.sex), value);
  };
  const decline = durabilityDecline(input.fatigue, input.weightKg);
  const ctl = input.ctl != null && Number.isFinite(input.ctl) && input.ctl >= 0 ? input.ctl : null;
  const zrs = positive(input.zrs);
  return {
    sprint: power("sprint"),
    anaeroob: power("anaeroob"),
    vo2max: power("vo2max"),
    drempel: power("drempel"),
    durability: decline == null ? null : scaleStep(DURABILITY_ANCHORS, decline),
    fitheid: ctl == null ? null : scaleStep(CTL_ANCHORS, ctl),
    racen: zrs == null ? null : scaleStep(ZRS_ANCHORS, zrs),
  };
}

/** Alleen het niveau per graat. */
export function ridgeLevels(input: BergInput): Record<Ridge, number | null> {
  const readings = ridgeReadings(input);
  return Object.fromEntries(RIDGES.map((ridge) => [ridge, readings[ridge]?.level ?? null])) as Record<
    Ridge,
    number | null
  >;
}

/** Zo weinig graten zijn te weinig om een score op te baseren. */
export const MIN_RIDGES_FOR_SCORE = 2;

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * De profielscore: het gewogen gemiddelde van de graten die er zijn
 * (RIDGE_WEIGHTS), met de gewichten van de aanwezige graten opnieuw op 100% gezet.
 * Null bij te weinig graten. Nog zonder consistentie; zie `scoreFor`.
 */
export function profileScore(ridges: Record<Ridge, number | null>): number | null {
  const present = RIDGES.filter((ridge) => ridges[ridge] != null);
  if (present.length < MIN_RIDGES_FOR_SCORE) return null;
  const weight = present.reduce((sum, ridge) => sum + RIDGE_WEIGHTS[ridge], 0);
  const total = present.reduce((sum, ridge) => sum + RIDGE_WEIGHTS[ridge] * ridges[ridge]!, 0);
  return total / weight;
}

/**
 * Hoe zwaar consistentie meetelt: tot 20% van de score (eigenaar, 2026-10-21).
 * Een factor en geen eigen graat, omdat consistentie tegen je eigen norm wordt
 * gemeten en niet tegen de wereld: als graat zou trouw trainen op een laag niveau
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
 * scherm toont punten). Null bij te weinig graten.
 */
export function scoreFor(ridges: Record<Ridge, number | null>, consistency: number | null = null): number | null {
  const profile = profileScore(ridges);
  return profile == null ? null : round2(profile * consistencyFactor(consistency));
}

/** Het gewicht van elke aanwezige graat na het opnieuw normaliseren, voor de uitleg op het scherm. */
export function effectiveWeights(ridges: Record<Ridge, number | null>): Partial<Record<Ridge, number>> {
  const present = RIDGES.filter((ridge) => ridges[ridge] != null);
  const weight = present.reduce((sum, ridge) => sum + RIDGE_WEIGHTS[ridge], 0);
  return Object.fromEntries(present.map((ridge) => [ridge, RIDGE_WEIGHTS[ridge] / weight]));
}

/**
 * De vorm van de berg: hoe ver een graat uitloopt, los van het niveau.
 * (niveau van de graat ÷ score)^1,8; een graat zonder gegevens heeft geen lengte.
 */
export const REACH_EXPONENT = 1.8;
export function ridgeReach(level: number | null, score: number | null): number | null {
  if (level == null || !score || score <= 0) return null;
  return Math.pow(Math.max(0, level) / score, REACH_EXPONENT);
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
  /** Een geplande herstelweek uit het schema: breekt de reeks niet. */
  plannedRecovery: boolean;
};

export type ConsistencyInput = {
  /** De afgesloten weken tot en met vorige week, oud naar nieuw; zo veel als er zijn (tot een jaar). */
  weeks: ConsistencyWeek[];
  /** Beschikbaarheid uit het schema in uren per week; null zonder schema. */
  normHours: number | null;
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
  /** Je norm in uren per week en waar die vandaan komt. */
  normHours: number;
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
 * in Fitheid). Norm is de beschikbaarheid uit het schema, anders je eigen mediaan
 * van de weekuren over de weken die er zijn. Meer dan de norm telt als 100%,
 * nooit als straf. Een geplande herstelweek telt als gehaald. Null als er geen
 * norm te bepalen is.
 */
export function consistencyFrom(input: ConsistencyInput): Consistency | null {
  const weeks = input.weeks;
  if (weeks.length === 0) return null;
  const schemaNorm = positive(input.normHours);
  const normHours = schemaNorm ?? median(weeks.map((week) => Math.max(0, week.hours)));
  if (!(normHours > 0)) return null;

  const counts = (week: ConsistencyWeek) => week.plannedRecovery || week.hours >= NORM_SHARE * normHours;
  const recent = weeks.slice(-CONSISTENCY_WEEKS);
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
    normHours: Math.round(normHours * 10) / 10,
    normSource: schemaNorm ? "schema" : "mediaan",
    value: round2(value),
  };
}

/** De breedte van de voet: 0,6 + 0,4 × consistentie; zonder consistentie de smalle voet. Telt daarnaast als factor in de score (`consistencyFactor`). */
export function footWidth(consistency: number | null): number {
  return 0.6 + 0.4 * Math.min(1, Math.max(0, consistency ?? 0));
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
