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
  DURABILITY_TEST_ANCHORS,
  DURABILITY_FATIGUED_DURATIONS,
  DURABILITY_MIN_KJ_PER_KG,
  DURABILITY_RIDES_SHARE,
  LEVELS,
  FACET_WEIGHTS,
  ZRS_ANCHORS,
  fatiguedPowerAnchors,
  levelOf,
  powerAnchors,
  type Anchors,
  type FatiguedDuration,
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
  durability: { what: "vermoeid op 5 en 20 minuten", unit: "W/kg" },
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
 * CTL of ZRS, op de afronding van het niveau na.
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

/** De uitslag van een durability-test: 20 minuten na het werk tegen je beste 20 minuten van het jaar. */
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
 * waar die vandaan komt en welk deel van de punten telt: de helft uit ritten, alles
 * uit de test. Uit ritten het vermoeide vermogen per duur (W/kg) en het werk ervoor
 * (kJ/kg); `value` is dan de 20 minuten (of de 5 als die ontbreekt) en `level` het
 * niveau na die deling. Uit de test is `value` het verval in % per 10 kJ/kg.
 */
export type FacetReading = ScaleStep & {
  source?: "test" | "ritten";
  testDay?: string;
  fatigued?: Partial<Record<FatiguedDuration, number>>;
  kjPerKg?: number;
  share?: number;
};

function positive(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

/** Vermoeid vermogen na de laagste kJ-stand met genoeg werk, in W/kg per duur. */
export type FatiguedPower = { kjPerKg: number; wkg: Partial<Record<FatiguedDuration, number>> };

/**
 * Uit je ritten: de laagste kJ-stand met minstens 10 kJ/kg waarop je 5 of 20
 * minuten reed (zoals sinds 2026-10-22; na 2000 kJ rijdt bijna niemand nog voluit).
 * Null zonder gewicht of zonder zo'n stand.
 */
export function fatiguedPower(fatigue: FatigueInput[], weightKg: number | null): FatiguedPower | null {
  const weight = positive(weightKg);
  if (!weight) return null;
  const durations = Object.entries(DURABILITY_FATIGUED_DURATIONS) as Array<[FatiguedDuration, number]>;
  const stands = [...new Set(fatigue.map((point) => point.afterKj))]
    .filter((afterKj) => afterKj / weight >= DURABILITY_MIN_KJ_PER_KG)
    .sort((a, b) => a - b);
  for (const afterKj of stands) {
    const wkg: Partial<Record<FatiguedDuration, number>> = {};
    for (const [duration, seconds] of durations) {
      const watts = positive(fatigue.find((point) => point.afterKj === afterKj && point.seconds === seconds)?.fatiguedWatts);
      if (watts) wkg[duration] = watts / weight;
    }
    if (Object.keys(wkg).length > 0) return { kjPerKg: afterKj / weight, wkg };
  }
  return null;
}

/**
 * Het niveau bij vermoeid vermogen: per duur tegen de normen voor vermoeid vermogen
 * bij jouw kJ/kg (fatiguedPowerAnchors), gemiddeld over de duren die er zijn, maal
 * `share` (de helft uit ritten, 1 uit de test).
 */
export function fatiguedLevel(power: FatiguedPower, sex: Sex | null, share: number): number {
  const levels = (Object.entries(power.wkg) as Array<[FatiguedDuration, number]>).map(([duration, wkg]) =>
    levelAt(fatiguedPowerAnchors(duration, sex, power.kjPerKg), wkg),
  );
  return (levels.reduce((sum, level) => sum + level, 0) / levels.length) * share;
}

/**
 * Het verval uit een durability-test, in procenten per 10 kJ/kg: de test-20-minuten
 * tegen je beste 20 minuten van het jaar tot en met de testdag. Was de test beter,
 * dan is dat geen verval. Null zonder gewicht of bij te weinig werk voor je gewicht.
 */
export function durabilityTestDecline(test: DurabilityTestInput | null | undefined, weightKg: number | null): number | null {
  const weight = positive(weightKg);
  if (!test || !weight || !positive(test.freshWatts) || !positive(test.fatiguedWatts)) return null;
  const kjPerKg = test.afterKj / weight;
  if (!(kjPerKg >= DURABILITY_MIN_KJ_PER_KG)) return null;
  const lossPct = Math.max(0, (1 - test.fatiguedWatts / test.freshWatts) * 100);
  return lossPct / (kjPerKg / 10);
}

function readingFor(power: FatiguedPower, sex: Sex | null, share: number): FacetReading {
  const duration: FatiguedDuration = power.wkg.m20 != null ? "m20" : "m5";
  const step = scaleStep(fatiguedPowerAnchors(duration, sex, power.kjPerKg), power.wkg[duration]!);
  return { ...step, level: fatiguedLevel(power, sex, share), fatigued: power.wkg, kjPerKg: power.kjPerKg, share };
}

/**
 * Durability als lezing: uit de test als die er is, het verval voor het hele punt;
 * anders het vermoeide vermogen uit je ritten, voor de helft (DURABILITY_RIDES_SHARE).
 * Zonder plafond: de test loopt voorbij Diamant door tot geen verval.
 */
export function durabilityReading(input: BriljantInput): FacetReading | null {
  const decline = durabilityTestDecline(input.durabilityTest, input.weightKg);
  if (decline != null) {
    return { ...scaleStep(DURABILITY_TEST_ANCHORS, decline), source: "test", testDay: input.durabilityTest!.day, share: 1 };
  }
  const rides = fatiguedPower(input.fatigue, input.weightKg);
  return rides ? { ...readingFor(rides, input.sex, DURABILITY_RIDES_SHARE), source: "ritten" } : null;
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

/**
 * 0,8 + 0,2 × consistentie. Zonder consistentie (geen ritgegevens) de volle straf,
 * 0,8 (eigenaar, 2026-10-25): eerst was dat 1, waardoor wie niets liet zien beter
 * uitkwam dan wie onregelmatig reed.
 */
export function consistencyFactor(consistency: number | null): number {
  if (consistency == null || !Number.isFinite(consistency)) return 1 - CONSISTENCY_WEIGHT;
  return 1 - CONSISTENCY_WEIGHT + CONSISTENCY_WEIGHT * Math.min(1, Math.max(0, consistency));
}

/**
 * De score: de profielscore maal de consistentiefactor, op twee decimalen (het
 * scherm toont punten). Null bij te weinig facetten. Zonder consistentie (null) de
 * volle straf; 1 is de steen op volle maat.
 */
export function scoreFor(facets: Record<Facet, number | null>, consistency: number | null): number | null {
  const profile = profileScore(facets);
  return profile == null ? null : round2(profile * consistencyFactor(consistency));
}

// ── Consistentie ────────────────────────────────────────────────────────────

/** Een week telt als je minstens dit deel van je eigen norm reed. */
export const NORM_SHARE = 0.6;
/**
 * Het venster van regelmaat en naleving, en de reeks waarop volhouden vol is:
 * V = reeks/12, hooguit 1 (eigenaar, 2026-10-26; eerst 1 − e^(−reeks/12), dat
 * pas na een half jaar boven 0,9 kwam).
 */
export const CONSISTENCY_WEEKS = 12;

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
};

export type Consistency = {
  /** R: aandeel van de laatste twaalf weken op minstens 60% van je norm. */
  regularity: number;
  /** V: reeks/12, hooguit 1. */
  persistence: number;
  /** De huidige ononderbroken reeks in weken. */
  streak: number;
  /** N: per week wat je reed tegen je norm, hooguit 100%, gemiddeld over de weken. */
  compliance: number;
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
 * gehaald. Null zonder ritten en zonder schema (dan telt de volle straf, zie
 * consistencyFactor).
 */
export function consistencyFrom(input: ConsistencyInput): Consistency | null {
  const weeks = input.weeks;
  if (weeks.length === 0) return null;
  const recent = weeks.slice(-CONSISTENCY_WEEKS);
  // TSS als die er voor de meeste recente weken is én intervals.icu de meeste
  // weken met een rit ook kent, anders uren. Zonder die tweede eis telde een lid
  // van wie intervals.icu de Strava-ritten miste, als niet gereden (2026-10-25).
  const withLoad = recent.filter((week) => week.load != null).length;
  const ridden = recent.filter((week) => week.hours > 0);
  const covered = ridden.filter((week) => (week.load ?? 0) > 0).length;
  const measure: Consistency["measure"] =
    withLoad * 2 >= recent.length && covered * 2 >= ridden.length && weeks.some((week) => (week.load ?? 0) > 0)
      ? "tss"
      : "uren";
  const done = (week: ConsistencyWeek) => Math.max(0, measure === "tss" ? (week.load ?? 0) : week.hours);
  const planned = (week: ConsistencyWeek) => positive(measure === "tss" ? week.plannedLoad : week.plannedHours);
  // In TSS alleen de weken die intervals.icu kent: een week van vóór de koppeling
  // is geen week zonder belasting. Reed je minder dan de helft van de weken, dan is
  // de mediaan 0; dan geldt de mediaan van de weken waarin je reed. Eerst gaf dat
  // geen norm en dus geen consistentie (2026-10-25: vijf leden).
  const measured = (measure === "tss" ? weeks.filter((week) => week.load != null) : weeks).map(done);
  const active = measured.filter((value) => value > 0);
  const overall = measured.length > 0 ? median(measured) : 0;
  const usual = overall > 0 ? overall : active.length > 0 ? median(active) : 0;
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
  const persistence = Math.min(1, streak / CONSISTENCY_WEEKS);

  // Naleving: per week de gereden TSS (of uren) tegen de norm, hooguit 100%, zodat
  // extra volume geen gemiste week goedmaakt (eigenaar, 2026-10-26). Eerst telde
  // met schema de geplande minuten van trainingen met een rit op dezelfde dag, en
  // zonder schema telde N als 1. Nu voor iedereen dezelfde maat, ook bij een
  // verschoven training of een kortere, zwaardere indoorrit.
  const share = (week: ConsistencyWeek) => {
    const norm = normOf(week);
    if (week.plannedRecovery) return 1;
    return norm > 0 ? Math.min(1, done(week) / norm) : done(week) > 0 ? 1 : 0;
  };
  const compliance = recent.reduce((sum, week) => sum + share(week), 0) / recent.length;
  const value = regularity * (0.5 + 0.5 * persistence) * compliance;
  return {
    regularity: round2(regularity),
    persistence: round2(persistence),
    streak,
    compliance: round2(compliance),
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
