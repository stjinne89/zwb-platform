// Van de verzamelde waarden naar wat de pagina van ZWBriljant toont: de score,
// de klasse, per facet de meting als balk en de consistentie. Puur, zodat het
// te testen is; de server levert de waarden, het scherm tekent ze.

import {
  CTL_ANCHORS,
  DURABILITY_ANCHORS,
  FACET_WEIGHTS,
  LEVELS,
  ZRS_ANCHORS,
  levelOf,
  powerAnchors,
  type Anchors,
  type Level,
  type PowerDuration,
  type Sex,
} from "./norms";
import {
  CONSISTENCY_WEEKS,
  FACETS,
  FACET_LABELS,
  FACET_MEASURES,
  consistencyFactor,
  consistencyFrom,
  durabilityLevel,
  facetReadings,
  levelAt,
  points,
  positionFor,
  profileScore,
  scaleStep,
  scoreFor,
  selfFrame,
  valueAt,
  type BriljantInput,
  type ConsistencyInput,
  type Facet,
  type FacetReading,
  type HistoryPoint,
} from "./score";

/** Waar een meting vandaan komt en over welke periode, naast het getal. */
export const FACET_SOURCES: Record<Facet, string> = {
  sprint: "laatste 90 dagen · intervals.icu",
  anaeroob: "laatste 90 dagen · intervals.icu",
  vo2max: "laatste 90 dagen · intervals.icu",
  drempel: "laatste 90 dagen · intervals.icu",
  durability: "laatste 90 dagen, na je laagste kJ-stand · intervals.icu",
  fitheid: "vandaag · intervals.icu",
  racen: "huidige score · Zwift",
};

/** Wat er gemeten is en waar het vandaan komt; bij een durability-test de test. */
function measureText(facet: Facet, reading: FacetReading): { what: string; source: string } {
  if (facet === "durability" && reading.source === "test" && reading.testDay) {
    const day = new Date(`${reading.testDay}T12:00:00Z`).toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
    return { what: "verval op 20 minuten", source: `durability-test van ${day} · intervals.icu` };
  }
  return { what: FACET_MEASURES[facet].what, source: FACET_SOURCES[facet] };
}

/** De balk onder een meting: van de grens van je klasse naar de volgende, bij racen over de hele schaal. */
export type FacetMeter = {
  /** 0 tot 1: hoe ver de balk gevuld is. */
  share: number;
  /** Links en rechts onder de balk, met eenheid. */
  from: string;
  to: string;
  /** De klassen aan weerszijden; null bij racen (geen groepen) en voorbij Diamant. */
  fromLevel: Level | null;
  toLevel: Level | null;
  /** "nog 0,3 W/kg meer tot Amethist", "64% van de schaal". */
  note: string;
};

export type FacetView = {
  key: Facet;
  label: string;
  /** De meting met eenheid: "13,2 W/kg". */
  value: string;
  what: string;
  source: string;
  points: number;
  level: Level;
  /** Het vaste gewicht van het facet in de score, 0 tot 1. */
  weight: number;
  /** Bijdrage aan de profielscore in punten. */
  contribution: number;
  lowerIsBetter: boolean;
  meter: FacetMeter;
};

/** De details zijn null bij een steen uit een snapshot: daar is alleen de waarde bewaard. */
export type ConsistencyView = {
  /** 0 tot 1. */
  value: number;
  factor: number;
  hitWeeks: number | null;
  weeks: number;
  streak: number | null;
  compliance: number | null;
  /** De norm per week in TSS of uren (`measure`). */
  norm: number | null;
  measure: "tss" | "uren" | null;
  normSource: "schema" | "mediaan" | null;
};

export type BriljantView = {
  /** Vaste seed voor de vorm van de steen. */
  seed: string;
  /** Null bij te weinig facetten. Als niveau (4,27); `points` is wat het scherm toont (427). */
  score: number | null;
  points: number;
  /** De score bij volledige consistentie, als niveau en in punten. */
  profile: number | null;
  profilePoints: number;
  level: Level;
  next: Level | null;
  toNext: number;
  /** Verschil in punten met vier weken geleden; null zonder historie. */
  delta4w: number | null;
  /** Alle facetten met gegevens, in de vaste volgorde rond de steen. */
  facets: FacetView[];
  /** Facetten zonder gegevens. */
  missing: Facet[];
  consistency: ConsistencyView | null;
};

const nl = (value: number, digits: number) =>
  value.toLocaleString("nl-NL", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Een waarde in de eenheid van het facet: W/kg en procenten met één decimaal, CTL en ZRS heel. */
export function formatMeasure(facet: Facet, value: number): string {
  const { unit } = FACET_MEASURES[facet];
  if (facet === "fitheid" || facet === "racen") return `${nl(value, 0)} ${unit}`;
  // Eén decimaal, twee waar een grens die heeft (4,35 W/kg).
  return `${value.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${unit}`;
}

export function meterFor(facet: Facet, reading: FacetReading): FacetMeter {
  if (facet === "racen") {
    // De balk over de hele schaal, de zin naar de volgende klasse (eigenaar,
    // 2026-10-21): de grens is de ZRS waarbij die klasse begint.
    const share = Math.min(1, Math.max(0, reading.value / 1000));
    const next = LEVELS[Math.floor(reading.level + 1e-9) + 1];
    const togo = next ? Math.ceil(reading.upper.value - reading.value) : Math.ceil(1000 - reading.value);
    return {
      share,
      from: formatMeasure(facet, 0),
      to: formatMeasure(facet, 1000),
      fromLevel: null,
      toLevel: null,
      // Voorbij Diamant (900 ZRS) loopt racen door tot het maximum van ZRS.
      note: next && togo > 0 ? `nog ${togo} ZRS tot ${next.name}` : togo > 0 ? `nog ${togo} ZRS tot het maximum` : "het maximum van ZRS",
    };
  }
  const top = LEVELS[LEVELS.length - 1];
  if (reading.capped) {
    // Durability uit ritten op het plafond: de balk vol tot Diamant, hoger alleen met de test.
    return {
      share: 1,
      from: formatMeasure(facet, reading.lower.value),
      to: formatMeasure(facet, reading.upper.value),
      fromLevel: LEVELS[reading.lower.level],
      toLevel: top,
      note: "hoger alleen met de durability-test",
    };
  }
  if (reading.kind === "beyond") {
    return {
      share: 1,
      from: formatMeasure(facet, reading.upper.value),
      to: "",
      fromLevel: top,
      toLevel: null,
      note: `voorbij ${top.name}`,
    };
  }
  const { lower, upper } = reading;
  const togo = Math.abs(upper.value - reading.value);
  const direction = reading.lower.value > reading.upper.value ? "minder" : "meer";
  return {
    share: reading.kind === "floor" ? 0 : Math.min(1, Math.max(0, reading.level - lower.level)),
    from: formatMeasure(facet, lower.value),
    to: formatMeasure(facet, upper.value),
    fromLevel: LEVELS[lower.level],
    toLevel: LEVELS[upper.level],
    note: `nog ${formatMeasure(facet, togo)} ${direction} tot ${LEVELS[upper.level].name}`,
  };
}

export function briljantView(args: {
  seed: string;
  input: BriljantInput;
  consistency: ConsistencyInput | null;
  history?: HistoryPoint[];
}): BriljantView {
  const readings = facetReadings(args.input);
  const levels = Object.fromEntries(FACETS.map((facet) => [facet, readings[facet]?.level ?? null])) as Record<
    Facet,
    number | null
  >;
  const consistency = args.consistency ? consistencyFrom(args.consistency) : null;
  const score = scoreFor(levels, consistency?.value ?? null);
  const rawProfile = profileScore(levels);
  // Op twee decimalen, net als de score, zodat profiel × factor op het scherm klopt.
  const profile = rawProfile == null ? null : Math.round(rawProfile * 100) / 100;
  const present = FACETS.filter((facet) => readings[facet] != null);

  const facets: FacetView[] = present.map((facet) => {
    const reading = readings[facet]!;
    const weight = FACET_WEIGHTS[facet];
    return {
      key: facet,
      label: FACET_LABELS[facet],
      value: formatMeasure(facet, reading.value),
      ...measureText(facet, reading),
      points: points(reading.level),
      level: levelOf(reading.level),
      weight,
      contribution: Math.round(weight * reading.level * 100),
      lowerIsBetter: facet === "durability",
      meter: meterFor(facet, reading),
    };
  });

  const position = positionFor(score ?? 0);
  const history = args.history ?? [];
  const delta = score == null || history.length === 0 ? null : selfFrame([...history, { week: "nu", score }]).delta4w;

  return {
    seed: args.seed,
    score,
    points: points(score ?? 0),
    profile,
    profilePoints: points(profile ?? 0),
    level: position.reached,
    next: position.next,
    toNext: position.toNext,
    delta4w: delta == null ? null : Math.round(delta * 100),
    facets,
    missing: FACETS.filter((facet) => readings[facet] == null),
    consistency: consistency
      ? {
          value: consistency.value,
          factor: consistencyFactor(consistency.value),
          hitWeeks: Math.round(consistency.regularity * CONSISTENCY_WEEKS),
          weeks: CONSISTENCY_WEEKS,
          streak: consistency.streak,
          compliance: consistency.compliance,
          norm: consistency.norm,
          measure: consistency.measure,
          normSource: consistency.normSource,
        }
      : null,
  };
}

/** Waar je het meest wint: een realistische stap op één onderdeel en wat die je score oplevert. */
export type Win = {
  key: Facet;
  label: string;
  /** "5,1 → 5,36 W/kg" */
  step: string;
  /** Extra punten op je score, met gewicht en consistentiefactor. */
  gain: number;
};

/** Hoeveel 5% beter is: meer vermogen, CTL en ZRS, minder verval. */
const IMPROVEMENT = 0.05;

const POWER_DURATION: Partial<Record<Facet, PowerDuration>> = { sprint: "s15", anaeroob: "m1", vo2max: "m5", drempel: "m20" };

export function anchorsFor(facet: Facet, sex: Sex | null): Anchors {
  const duration = POWER_DURATION[facet];
  if (duration) return powerAnchors(duration, sex);
  if (facet === "durability") return DURABILITY_ANCHORS;
  if (facet === "fitheid") return CTL_ANCHORS;
  return ZRS_ANCHORS;
}

/**
 * Per onderdeel: wat levert 5% beter op je score op? Zo zie je waar je het best
 * aan kunt werken; een onderdeel dat zwaar weegt of net onder een grens zit, wint
 * het meest. Gesorteerd van meeste naar minste winst, alleen onderdelen met winst.
 */
export function bestWins(input: BriljantInput, consistency: number | null): Win[] {
  return winsFromReadings(facetReadings(input), consistency, input.sex);
}

/**
 * Hetzelfde voor een bewaarde steen: de meting terug uit het niveau (alleen voor
 * je eigen steen; zie compare.ts). `durability` is de bron uit `provenance`.
 */
export function winsFromLevels(
  facets: Partial<Record<Facet, number | null>>,
  consistency: number | null,
  sex: Sex | null,
  durability: FacetReading["source"] = "ritten",
): Win[] {
  const readings = Object.fromEntries(
    FACETS.map((facet) => {
      const level = facets[facet];
      if (level == null) return [facet, null];
      const reading: FacetReading = readingFromLevel(facet, level, sex);
      return [facet, facet === "durability" ? { ...reading, source: durability } : reading];
    }),
  ) as Record<Facet, FacetReading | null>;
  return winsFromReadings(readings, consistency, sex);
}

function winsFromReadings(readings: Record<Facet, FacetReading | null>, consistency: number | null, sex: Sex | null): Win[] {
  const levels = Object.fromEntries(FACETS.map((facet) => [facet, readings[facet]?.level ?? null])) as Record<Facet, number | null>;
  const base = scoreFor(levels, consistency);
  if (base == null) return [];
  return FACETS.flatMap((facet) => {
    const reading = readings[facet];
    if (!reading) return [];
    const better =
      facet === "durability"
        ? reading.value * (1 - IMPROVEMENT)
        : facet === "racen"
          ? Math.min(1000, reading.value * (1 + IMPROVEMENT))
          : reading.value * (1 + IMPROVEMENT);
    const level = facet === "durability" ? durabilityLevel(better, reading.source) : levelAt(anchorsFor(facet, sex), better);
    const improved = scoreFor({ ...levels, [facet]: level }, consistency);
    const gain = improved == null ? 0 : points(improved) - points(base);
    if (gain <= 0) return [];
    const unit = FACET_MEASURES[facet].unit;
    const plain = (value: number) => formatMeasure(facet, value).replace(` ${unit}`, "");
    return [{ key: facet, label: FACET_LABELS[facet], step: `${plain(reading.value)} → ${plain(better)} ${unit}`, gain }];
  }).sort((a, b) => b.gain - a.gain);
}

/** De meting bij een bewaard niveau, als lezing zoals `facetReadings` die geeft. */
export function readingFromLevel(facet: Facet, level: number, sex: Sex | null) {
  const anchors = anchorsFor(facet, sex);
  return scaleStep(anchors, valueAt(anchors, level));
}
