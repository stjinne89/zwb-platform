import { z } from "zod";

// Puntenschalen en tiebreak-regels van het Omnium.
//
// Deze staan als data en niet als code, zodat een regelwijziging een instelling
// is (omnium_seasons.scoring) en een afgesloten seizoen op zijn eigen regels
// blijft staan. Een uitslag die vorig jaar gepubliceerd is mag niet veranderen
// omdat het reglement dit jaar is aangepast.

export type PointsScale = {
  /** Punten per positie; index 0 is de winnaar. */
  table: number[];
  /** Wat elke finisher buiten de tabel krijgt. */
  tail: number;
};

/**
 * Wat er gebeurt bij een gelijke positie.
 * - "high": iedereen krijgt de punten van de hoogste bezette plaats. Bij twee
 *   gedeelde tweede plaatsen dus allebei 38.
 * - "share": de punten van de bezette plaatsen worden gedeeld, zodat het totaal
 *   aantal uitgedeelde punten gelijk blijft. Bij (38 + 36) / 2 dus allebei 37.
 */
export type TiePolicy = "high" | "share";

export type EditionTiebreak = "crit_points" | "wins" | "countback";
export type SeasonTiebreak =
  | "editions_raced"
  | "wins"
  | "countback"
  | "last_edition";

export type OmniumScales = {
  prologue: PointsScale;
  scratch: PointsScale;
  sprint: PointsScale;
  /** FAL-punten per tussensprint in de Crit Royale. */
  critSprint: PointsScale;
  /** FAL-punten voor de finish van de Crit Royale. */
  critFinish: PointsScale;
};

export type OmniumScoring = {
  scales: OmniumScales;
  tiePolicy: TiePolicy;
  editionTiebreaks: EditionTiebreak[];
  seasonTiebreaks: SeasonTiebreak[];
};

/** Aflopende reeks, grenzen inbegrepen: descending(40, 2, 2) => [40, 38, ..., 2]. */
export function descending(from: number, to: number, step = 1): number[] {
  const values: number[] = [];
  for (let value = from; value >= to; value -= step) values.push(value);
  return values;
}

// Het reglement zegt "40, 38, 36 ... aflopend tot 1 punt". Bij stappen van twee
// kom je op 2 uit en nooit op 1. Dat is opgelost met tail: 1 — iedere finisher
// buiten de tabel krijgt één punt. Dat is de meest waarschijnlijke lezing en het
// beloont uitrijden. Bij de Sprint Quali en de Crit Royale is er geen staart:
// daar levert een plaats buiten de tabel niets op.
export const DEFAULT_SCALES: OmniumScales = {
  prologue: { table: descending(40, 2, 2), tail: 1 },
  scratch: { table: descending(40, 2, 2), tail: 1 },
  sprint: { table: descending(20, 2, 2), tail: 0 },
  critSprint: { table: descending(10, 1, 1), tail: 0 },
  critFinish: { table: descending(20, 1, 1), tail: 0 },
};

// Er was tot en met voorjaar 2026 geen tiebreak; gelijke totalen bleven in
// willekeurige volgorde staan. Met prijzen per categorie kan dat niet meer.
// De finale beslist, zoals in het baanomnium; daarna telt wie vaker won en
// tenslotte een countback op de beste klasseringen. Blijft het dan nog gelijk,
// dan is een gedeelde plaats een geldige uitkomst — nooit alfabetisch breken.
export const DEFAULT_EDITION_TIEBREAKS: EditionTiebreak[] = [
  "crit_points",
  "wins",
  "countback",
];

// Over een seizoen weegt trouw meedoen mee: wie zes keer startte gaat voor wie
// hetzelfde totaal in vier edities haalde.
export const DEFAULT_SEASON_TIEBREAKS: SeasonTiebreak[] = [
  "editions_raced",
  "wins",
  "countback",
  "last_edition",
];

export const DEFAULT_SCORING: OmniumScoring = {
  scales: DEFAULT_SCALES,
  tiePolicy: "high",
  editionTiebreaks: DEFAULT_EDITION_TIEBREAKS,
  seasonTiebreaks: DEFAULT_SEASON_TIEBREAKS,
};

/** De vijf vELO-leagues waarin het Omnium wordt gereden. */
export const OMNIUM_LEAGUES = [
  "DIAMOND-RUBY",
  "EMERALD-SAPPHIRE",
  "AMETHYST-PLATINUM",
  "GOLD-SILVER",
  "BRONZE-COPPER",
] as const;

export type OmniumLeague = (typeof OMNIUM_LEAGUES)[number];

// Een seizoen mag de schalen en tiebreaks overschrijven via
// omnium_seasons.scoring. Dat is bewust tolerant: een configuratie die niet
// valideert valt terug op de defaults in plaats van het klassement te breken.
// Een afgesloten seizoen houdt zo zijn eigen regels, ook als de standaard
// later verandert.

const pointsScaleSchema = z.object({
  table: z.array(z.number()).min(1),
  tail: z.number(),
});

const scoringSchema = z.object({
  scales: z
    .object({
      prologue: pointsScaleSchema,
      scratch: pointsScaleSchema,
      sprint: pointsScaleSchema,
      critSprint: pointsScaleSchema,
      critFinish: pointsScaleSchema,
    })
    .partial()
    .optional(),
  tiePolicy: z.enum(["high", "share"]).optional(),
  editionTiebreaks: z
    .array(z.enum(["crit_points", "wins", "countback"]))
    .optional(),
  seasonTiebreaks: z
    .array(z.enum(["editions_raced", "wins", "countback", "last_edition"]))
    .optional(),
});

export function resolveScoring(raw: unknown): OmniumScoring {
  if (!raw || typeof raw !== "object") return DEFAULT_SCORING;
  const parsed = scoringSchema.safeParse(raw);
  if (!parsed.success) return DEFAULT_SCORING;

  const overrides = parsed.data;
  return {
    scales: { ...DEFAULT_SCALES, ...(overrides.scales ?? {}) },
    tiePolicy: overrides.tiePolicy ?? DEFAULT_SCORING.tiePolicy,
    editionTiebreaks:
      overrides.editionTiebreaks ?? DEFAULT_EDITION_TIEBREAKS,
    seasonTiebreaks: overrides.seasonTiebreaks ?? DEFAULT_SEASON_TIEBREAKS,
  };
}
