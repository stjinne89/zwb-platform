// Eigenschappen van één portie, voor de receptkeuze en de labels op een recept.
//
// Het UCI-positiestandpunt (thema 7) zegt welk soort eten bij welke dag hoort:
// op zware dagen licht verteerbaar met weinig vezels en vet, op rustdagen juist
// vezelrijk. Grammen geeft het niet. De drempels hieronder leunen daarom op de
// Europese claimgrenzen (Verordening 1924/2006 en 1169/2011); waar we daarvan
// afwijken staat het erbij. Onderbouwing: docs/voeding-wielrennen.md §12.

import type { RecipeIngredient } from "./scale";

export const MICRONUTRIENTS = ["calcium", "ijzer", "magnesium", "zink", "vitamine_d", "vitamine_c", "omega3"] as const;
export type Micronutrient = (typeof MICRONUTRIENTS)[number];

export const MICRONUTRIENT_LABELS: Record<Micronutrient, string> = {
  calcium: "calcium",
  ijzer: "ijzer",
  magnesium: "magnesium",
  zink: "zink",
  vitamine_d: "vitamine D",
  vitamine_c: "vitamine C",
  omega3: "omega-3",
};

/** Referentie-innames per dag voor volwassenen (Verordening 1169/2011, bijlage XIII). */
const REFERENCE_INTAKE = {
  calcium: 800,
  ijzer: 14,
  magnesium: 375,
  zink: 10,
  vitamine_d: 5,
  vitamine_c: 80,
} as const;

/**
 * "Rijk aan" volgens de claimverordening is 30% van de referentie-inname. De
 * verordening rekent per 100 g; wij per portie, omdat een maaltijd geen
 * verpakt product is. Dat is onze vertaling.
 */
export const RICH_IN_SHARE = 0.3;

/** EPA + DHA per dag waarbij EFSA van een toereikende inname spreekt (g). */
export const OMEGA3_PORTION_G = 0.25;

/** "Vezelrijk": minstens 3 g vezels per 100 kcal (Verordening 1924/2006). */
export const FIBER_RICH_PER_100_KCAL = 3;
/** Onder de grens voor "bron van vezels" (1,5 g per 100 kcal) telt een portie als vezelarm. */
export const FIBER_LOW_PER_100_KCAL = 1.5;
/** Vet als deel van de energie. Het positiestandpunt noemt 20–35% over de dag;
 * licht verteerbaar is bij ons de onderste helft daarvan. Eigen drempel. */
export const LIGHT_FAT_ENERGY_SHARE = 0.25;

export type PortionTraits = {
  kcal: number;
  sodiumMg: number;
  /** Weinig vezels en weinig vet: past vóór de rit en op zware dagen. */
  lightDigest: boolean;
  fiberRich: boolean;
  richIn: Micronutrient[];
};

const MICRO_COLUMN = {
  calcium: "calcium_mg",
  ijzer: "iron_mg",
  magnesium: "magnesium_mg",
  zink: "zinc_mg",
  vitamine_d: "vitamin_d_ug",
  vitamine_c: "vitamin_c_mg",
} as const;

/**
 * Eigenschappen van een portie. Een waarde die in NEVO ontbreekt telt als nul:
 * een label verschijnt dus alleen als de bekende waarden de grens al halen.
 */
export function portionTraits(ingredients: RecipeIngredient[]): PortionTraits {
  const sum = (pick: (food: RecipeIngredient["food"]) => number | null | undefined) =>
    ingredients.reduce((total, item) => total + (Number(pick(item.food) ?? 0) * item.grams) / 100, 0);

  const kcal = sum((food) => food.kcal);
  const fiberG = sum((food) => food.fiber_g);
  const fatG = sum((food) => food.fat_g);
  const per100Kcal = kcal > 0 ? (fiberG / kcal) * 100 : 0;

  const richIn: Micronutrient[] = [];
  for (const key of Object.keys(MICRO_COLUMN) as (keyof typeof MICRO_COLUMN)[]) {
    if (sum((food) => food[MICRO_COLUMN[key]]) >= REFERENCE_INTAKE[key] * RICH_IN_SHARE) richIn.push(key);
  }
  if (sum((food) => food.epa_g) + sum((food) => food.dha_g) >= OMEGA3_PORTION_G) richIn.push("omega3");

  return {
    kcal: Math.round(kcal),
    sodiumMg: Math.round(sum((food) => food.sodium_mg)),
    lightDigest: kcal > 0 && per100Kcal < FIBER_LOW_PER_100_KCAL && (fatG * 9) / kcal <= LIGHT_FAT_ENERGY_SHARE,
    fiberRich: kcal > 0 && per100Kcal >= FIBER_RICH_PER_100_KCAL,
    richIn,
  };
}
