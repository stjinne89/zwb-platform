// Een recept op maat van één renner.
//
// Elk ingrediënt heeft een rol. De koolhydraatbronnen schalen naar het
// koolhydraatdoel van dat moment, de eiwitbronnen naar het eiwitdoel en de rest
// schaalt mee met de grootte van de renner (portionEnergyFactor). Elke factor
// blijft tussen 0,5 en 2: daarbuiten is het niet meer hetzelfde gerecht, en dan
// is een ander recept de betere keuze.

import type { MealTarget } from "./targets";

export const INGREDIENT_ROLES = ["kh_bron", "eiwit_bron", "vast"] as const;
export type IngredientRole = (typeof INGREDIENT_ROLES)[number];

export const INGREDIENT_ROLE_LABELS: Record<IngredientRole, string> = {
  kh_bron: "Koolhydraatbron",
  eiwit_bron: "Eiwitbron",
  vast: "Vast",
};

/** Voedingswaarden per 100 g, ongewijzigd uit NEVO. Null = niet bekend in NEVO. */
export type NutritionFood = {
  id: string;
  nevo_code: number;
  name_nl: string;
  kcal: number | null;
  carbs_g: number | null;
  sugars_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
};

export type RecipeIngredient = {
  food: NutritionFood;
  grams: number;
  role: IngredientRole;
};

export type Macros = {
  carbsG: number;
  proteinG: number;
  fatG: number;
  fiberG: number;
  /** Ontbreekt er bij een ingrediënt een waarde in NEVO, dan is het totaal een ondergrens. */
  incomplete: boolean;
};

export const SCALE_MIN = 0.5;
export const SCALE_MAX = 2;

function clampFactor(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, value));
}

/** Nette hoeveelheden: onder de 5 g op halve grammen (zout, kaneel), tot 50 g op
 * hele grammen, daarboven op vijftallen. */
export function roundGrams(grams: number): number {
  if (grams <= 0) return 0;
  if (grams < 5) return Math.max(0.5, Math.round(grams * 2) / 2);
  if (grams < 50) return Math.round(grams);
  return Math.round(grams / 5) * 5;
}

export function macrosFor(ingredients: { food: NutritionFood; grams: number }[]): Macros {
  let incomplete = false;
  const sum = (key: "carbs_g" | "protein_g" | "fat_g" | "fiber_g") =>
    ingredients.reduce((total, { food, grams }) => {
      const value = food[key];
      if (value == null) {
        incomplete = true;
        return total;
      }
      return total + (Number(value) * grams) / 100;
    }, 0);

  const round1 = (value: number) => Math.round(value * 10) / 10;
  return {
    carbsG: round1(sum("carbs_g")),
    proteinG: round1(sum("protein_g")),
    fatG: round1(sum("fat_g")),
    fiberG: round1(sum("fiber_g")),
    incomplete,
  };
}

export type ScaledRecipe = {
  factors: Record<IngredientRole, number>;
  /** Hoeveelheden voor één portie. */
  ingredients: RecipeIngredient[];
  perPortion: Macros;
};

/** Eén portie zonder aanpassing. */
export function basePortion(ingredients: RecipeIngredient[], servings: number): ScaledRecipe {
  return scaleRecipe(ingredients, servings, { carbsG: null, proteinG: null }, 1);
}

export function scaleRecipe(
  ingredients: RecipeIngredient[],
  servings: number,
  target: MealTarget,
  energyFactor: number,
): ScaledRecipe {
  const portions = servings > 0 ? servings : 1;
  const perPortion = ingredients.map((item) => ({ ...item, grams: item.grams / portions }));

  const contribution = (role: IngredientRole, key: "carbs_g" | "protein_g") =>
    perPortion
      .filter((item) => item.role === role)
      .reduce((total, item) => total + (Number(item.food[key] ?? 0) * item.grams) / 100, 0);

  const v = clampFactor(energyFactor);
  const ck = contribution("kh_bron", "carbs_g");
  const ce = contribution("eiwit_bron", "carbs_g");
  const cv = contribution("vast", "carbs_g");
  const pk = contribution("kh_bron", "protein_g");
  const pe = contribution("eiwit_bron", "protein_g");
  const pv = contribution("vast", "protein_g");

  const hasKh = ck > 0;
  const hasEiwit = pe > 0;
  const carbTarget = target.carbsG;
  const proteinTarget = target.proteinG;

  // Los koolhydraten op bij een gegeven eiwitfactor, en omgekeerd.
  const solveA = (b: number) =>
    carbTarget != null && hasKh ? clampFactor((carbTarget - v * cv - b * ce) / ck) : v;
  const solveB = (a: number) =>
    proteinTarget != null && hasEiwit ? clampFactor((proteinTarget - v * pv - a * pk) / pe) : v;

  let a = v;
  let b = v;
  if (carbTarget != null && proteinTarget != null && hasKh && hasEiwit) {
    const det = ck * pe - ce * pk;
    if (Math.abs(det) > 1e-6) {
      a = clampFactor(((carbTarget - v * cv) * pe - ce * (proteinTarget - v * pv)) / det);
      b = clampFactor((ck * (proteinTarget - v * pv) - (carbTarget - v * cv) * pk) / det);
    }
    // Na begrenzen past de ander zich één keer aan de begrensde waarde aan.
    b = solveB(a);
    a = solveA(b);
  } else {
    a = solveA(b);
    b = solveB(a);
  }

  const factors: Record<IngredientRole, number> = {
    kh_bron: Math.round(a * 100) / 100,
    eiwit_bron: Math.round(b * 100) / 100,
    vast: Math.round(v * 100) / 100,
  };

  const scaled = perPortion.map((item) => ({
    ...item,
    grams: roundGrams(item.grams * factors[item.role]),
  }));

  return { factors, ingredients: scaled, perPortion: macrosFor(scaled) };
}
