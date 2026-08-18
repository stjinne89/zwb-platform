// Onderdelen-bibliotheek voor Mijn garage. Per discipline andere onderdelen en
// andere drempels, want een mtb-ketting haalt ruwweg de helft van een
// wegketting en een binnenfiets heeft geen remslijtage maar wel zweet.
//
// Onderbouwing en bronnen: docs/onderhoud-per-fietstype.md. De getallen zijn
// richtwaarden — het lid kan per onderdeel een eigen drempel opgeven
// (custom_threshold).
//
// low    = enige slijtage (vroeg vervangen, conservatief)
// normal = normale slijtage
// high   = hoge slijtage (laat vervangen, tot het einde rijden)

export type WearRange = "low" | "normal" | "high";

/**
 * Kilometers werken niet voor alles. Remvloeistof trekt water aan of je nu
 * rijdt of niet, stuurlint gaat kapot van zweet, vering wordt door de fabrikant
 * in draaiuren voorgeschreven (die we niet hebben — geen gear_id op ritten, dus
 * omgerekend naar maanden).
 */
export type WearMetric = "km" | "months";

export type Discipline = "race" | "gravel" | "mtb" | "indoor" | "stad" | "overig";

export const DISCIPLINES: Discipline[] = [
  "race",
  "gravel",
  "mtb",
  "indoor",
  "stad",
  "overig",
];

export function disciplineLabel(discipline: Discipline): string {
  switch (discipline) {
    case "race":
      return "Racefiets";
    case "gravel":
      return "Gravel";
    case "mtb":
      return "MTB";
    case "indoor":
      return "Binnenfiets";
    case "stad":
      return "Stadsfiets";
    default:
      return "Overig";
  }
}

export function isDiscipline(value: unknown): value is Discipline {
  return DISCIPLINES.includes(value as Discipline);
}

type RangeSet = {
  metric: WearMetric;
  low: number;
  normal: number;
  high: number;
};

export type ComponentType = {
  slug: string;
  label: string;
  /** Nakijken in plaats van vervangen — de status leest dan anders. */
  inspection?: boolean;
  /** Ontbreekt een discipline, dan bestaat het onderdeel daar niet. */
  byDiscipline: Partial<Record<Discipline, RangeSet>>;
};

const km = (low: number, normal: number, high: number): RangeSet => ({
  metric: "km",
  low,
  normal,
  high,
});
const months = (low: number, normal: number, high: number): RangeSet => ({
  metric: "months",
  low,
  normal,
  high,
});

export const COMPONENT_TYPES: ComponentType[] = [
  {
    slug: "chain",
    label: "Ketting",
    byDiscipline: {
      race: km(2500, 4000, 6000),
      gravel: km(2000, 3000, 4500),
      mtb: km(1200, 2000, 3000),
      indoor: km(3000, 5000, 8000),
    },
  },
  {
    slug: "cassette",
    label: "Cassette",
    byDiscipline: {
      race: km(8000, 12000, 18000),
      gravel: km(6000, 9000, 13000),
      mtb: km(4000, 6000, 9000),
      indoor: km(10000, 15000, 22000),
    },
  },
  {
    slug: "chainrings",
    label: "Kettingbladen",
    byDiscipline: {
      race: km(15000, 25000, 40000),
      gravel: km(12000, 18000, 28000),
      mtb: km(8000, 12000, 20000),
      indoor: km(20000, 30000, 45000),
    },
  },
  {
    slug: "bottom_bracket",
    label: "Trapas",
    byDiscipline: {
      race: km(10000, 20000, 35000),
      gravel: km(8000, 15000, 25000),
      mtb: km(6000, 12000, 20000),
      // Binnen sloopt geen kilometerstand maar zweet het lager.
      indoor: months(12, 18, 24),
    },
  },
  {
    slug: "tire_front",
    label: "Voorband",
    byDiscipline: {
      race: km(4000, 6000, 9000),
      gravel: km(3000, 4500, 7000),
      mtb: km(2500, 4000, 6000),
    },
  },
  {
    slug: "tire_rear",
    label: "Achterband",
    byDiscipline: {
      race: km(2500, 4000, 6000),
      gravel: km(2000, 3000, 4500),
      mtb: km(1500, 2500, 4000),
    },
  },
  {
    slug: "trainer_tyre",
    label: "Trainerband",
    byDiscipline: { indoor: months(9, 15, 24) },
  },
  {
    slug: "sealant",
    label: "Tubeless sealant",
    byDiscipline: {
      race: months(3, 4, 6),
      gravel: months(3, 4, 6),
      mtb: months(3, 4, 6),
    },
  },
  {
    slug: "brake_pads_disc",
    label: "Remblokken (schijf)",
    byDiscipline: {
      race: km(3000, 6000, 10000),
      gravel: km(2000, 3500, 6000),
      mtb: km(700, 1500, 2800),
    },
  },
  {
    slug: "brake_pads_rim",
    label: "Remblokken (velg)",
    byDiscipline: {
      race: km(2000, 4000, 7000),
      gravel: km(1500, 3000, 5000),
      mtb: km(1000, 2000, 3500),
    },
  },
  {
    slug: "brake_fluid",
    label: "Remvloeistof",
    byDiscipline: {
      race: months(12, 18, 24),
      gravel: months(12, 18, 24),
      mtb: months(12, 18, 24),
    },
  },
  {
    slug: "cables",
    label: "Kabels/buitenkabels",
    byDiscipline: {
      race: months(18, 30, 48),
      gravel: months(12, 24, 36),
      mtb: months(12, 18, 30),
      indoor: months(12, 18, 24),
    },
  },
  {
    slug: "bar_tape",
    label: "Stuurlint",
    byDiscipline: {
      race: months(12, 18, 30),
      gravel: months(9, 15, 24),
      indoor: months(6, 9, 15),
    },
  },
  {
    slug: "grips",
    label: "Handvatten",
    byDiscipline: { mtb: months(12, 24, 36) },
  },
  {
    slug: "susp_lowers",
    label: "Vering voorvork (lowers)",
    byDiscipline: { mtb: months(6, 9, 12) },
  },
  {
    slug: "susp_full",
    label: "Vering volledige service",
    byDiscipline: { mtb: months(12, 18, 24) },
  },
  {
    slug: "shock_service",
    label: "Achterdemper service",
    byDiscipline: { mtb: months(12, 18, 24) },
  },
  {
    slug: "dropper",
    label: "Dropperpost service",
    byDiscipline: { mtb: months(12, 18, 24) },
  },
  {
    slug: "headset_check",
    label: "Balhoofdlager nakijken",
    inspection: true,
    byDiscipline: { indoor: months(6, 9, 12) },
  },
  {
    slug: "seatpost_check",
    label: "Zadelpen losmaken en invetten",
    inspection: true,
    byDiscipline: { indoor: months(6, 12, 18) },
  },
];

export const WEAR_RANGES: WearRange[] = ["low", "normal", "high"];

export function rangeLabel(range: WearRange): string {
  if (range === "low") return "Enige slijtage";
  if (range === "high") return "Hoge slijtage";
  return "Normale slijtage";
}

export function componentType(slug: string): ComponentType | null {
  return COMPONENT_TYPES.find((c) => c.slug === slug) ?? null;
}

export function componentLabel(slug: string): string {
  return componentType(slug)?.label ?? slug;
}

export function isWearRange(value: unknown): value is WearRange {
  return value === "low" || value === "normal" || value === "high";
}

export function isInspection(slug: string): boolean {
  return componentType(slug)?.inspection === true;
}

/**
 * Stadsfietsen en "overig" hebben geen eigen tabel; die lenen de racewaarden,
 * want dat is de dichtstbijzijnde gewone fiets met kabels en velg- of
 * schijfremmen.
 */
function effectiveDiscipline(discipline: Discipline): Discipline {
  return discipline === "stad" || discipline === "overig" ? "race" : discipline;
}

/** De onderdelen die op dit fietstype bestaan, in catalogusvolgorde. */
export function componentTypesFor(discipline: Discipline): ComponentType[] {
  const key = effectiveDiscipline(discipline);
  return COMPONENT_TYPES.filter((type) => type.byDiscipline[key] !== undefined);
}

/** Drempel plus bijbehorende maat; null als het onderdeel hier niet bestaat. */
export function resolveThreshold(
  slug: string,
  discipline: Discipline,
  range: WearRange,
): { metric: WearMetric; value: number } | null {
  const set = componentType(slug)?.byDiscipline[effectiveDiscipline(discipline)];
  return set ? { metric: set.metric, value: set[range] } : null;
}

/** De maat waarin dit onderdeel op dit fietstype gemeten wordt. */
export function metricFor(slug: string, discipline: Discipline): WearMetric {
  return componentType(slug)?.byDiscipline[effectiveDiscipline(discipline)]?.metric ?? "km";
}

export function metricUnitLabel(metric: WearMetric, value: number): string {
  if (metric === "months") return value === 1 ? "maand" : "maanden";
  return "km";
}
