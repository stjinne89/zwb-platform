// Het menu voor meerdere dagen en het boodschappenlijstje dat erbij hoort.
//
// Puur, zonder database. Elke dag krijgt hetzelfde menu als het Dagmenu op die
// dag toont (planDayMenu in plan.ts, met dezelfde bewaarde keuzes), zodat wat
// je koopt die dag ook op je menu staat. De renner eet zijn portie op maat;
// het gezin eet de gewone portie van hetzelfde recept mee, en alleen bij de
// maaltijden die het lid op zijn profiel heeft aangezet. Een kind met een
// halve portie telt half.

import type { MealMoment } from "./targets";
import { basePortion, type NutritionFood, type ScaledRecipe } from "./scale";
import type { Recipe } from "./recipes";
import {
  DEPARTMENTS,
  cleanNevoName,
  departmentFor,
  SHOPPING_NAMES,
  type Department,
  type PieceUnit,
} from "./shopping-names";

export { DEPARTMENT_LABELS, type Department } from "./shopping-names";

/** De maaltijden waar een gezin bij kan aanschuiven. */
export const HOUSEHOLD_MOMENTS = ["ontbijt", "lunch", "tussendoor", "diner"] as const satisfies readonly MealMoment[];
export type HouseholdMoment = (typeof HOUSEHOLD_MOMENTS)[number];

export const HOUSEHOLD_MAX = 10;

export type Household = {
  adults: number;
  childrenFull: number;
  childrenHalf: number;
  moments: HouseholdMoment[];
};

export const NO_HOUSEHOLD: Household = { adults: 0, childrenFull: 0, childrenHalf: 0, moments: ["diner"] };

function count(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(HOUSEHOLD_MAX, Math.max(0, Math.round(parsed)));
}

/** Uit een rij van nutrition_profiles (0259); zonder rij of zonder de kolommen: niemand eet mee. */
export function householdFromRow(row: Record<string, unknown> | null | undefined): Household {
  if (!row) return NO_HOUSEHOLD;
  const moments = Array.isArray(row.household_moments)
    ? HOUSEHOLD_MOMENTS.filter((moment) => (row.household_moments as unknown[]).includes(moment))
    : NO_HOUSEHOLD.moments;
  return {
    adults: count(row.household_adults),
    childrenFull: count(row.household_children_full),
    childrenHalf: count(row.household_children_half),
    moments,
  };
}

/** Hoeveel gewone porties het gezin naast de renner eet. */
export function householdPortions(household: Household): number {
  return household.adults + household.childrenFull + household.childrenHalf / 2;
}

/** Het aantal mensen aan tafel, de renner meegeteld. */
export function householdSize(household: Household): number {
  return 1 + household.adults + household.childrenFull + household.childrenHalf;
}

export type ShoppingSlot = {
  moment: MealMoment;
  recipe: Recipe;
  /** De portie van de renner, al op maat. */
  portion: ScaledRecipe;
};

export type ShoppingItem = {
  /** food.id uit nutrition_foods. */
  id: string;
  name: string;
  department: Department;
  /** "3 stuks", "450 g", "1,5 l". */
  amount: string;
  pantry: boolean;
  /** Totaal in gram, vóór afronden; voor tests en sorteren. */
  grams: number;
};

type Total = { food: NutritionFood & { quantity_unit?: string }; grams: number };

/**
 * Alle ingrediënten van de dagen samen, per product opgeteld. Een recept dat
 * het gezin meeëet, telt de gewone portie keer het aantal porties van het gezin.
 */
export function shoppingList(slots: ShoppingSlot[], household: Household): ShoppingItem[] {
  const totals = new Map<string, Total>();
  const add = (food: NutritionFood, grams: number) => {
    if (!(grams > 0)) return;
    const current = totals.get(food.id);
    if (current) current.grams += grams;
    else totals.set(food.id, { food, grams });
  };

  const portions = householdPortions(household);
  for (const slot of slots) {
    for (const item of slot.portion.ingredients) add(item.food, item.grams);
    if (portions > 0 && (household.moments as readonly MealMoment[]).includes(slot.moment)) {
      const base = basePortion(
        slot.recipe.ingredients.map((item) => ({ food: item.food, grams: item.grams, role: item.role })),
        slot.recipe.servings,
      );
      for (const item of base.ingredients) add(item.food, item.grams * portions);
    }
  }

  return [...totals.values()]
    .map(({ food, grams }) => {
      const known = SHOPPING_NAMES[food.nevo_code];
      const buyGrams = grams * (known?.dryFactor ?? 1);
      const liquid = known?.liquid ?? food.quantity_unit === "ml";
      return {
        id: food.id,
        name: known?.name ?? cleanNevoName(food.name_nl),
        department: departmentFor(food.nevo_code, food.food_group),
        amount: known?.piece
          ? formatPieces(buyGrams, known.piece.grams, known.piece.unit)
          : liquid
            ? formatMillilitres(buyGrams)
            : formatGrams(buyGrams),
        pantry: known?.pantry ?? false,
        grams: buyGrams,
      };
    })
    .sort(
      (a, b) =>
        DEPARTMENTS.indexOf(a.department) - DEPARTMENTS.indexOf(b.department) || a.name.localeCompare(b.name, "nl"),
    );
}

const PIECE_SINGULAR: Record<PieceUnit, string> = {
  stuks: "stuk",
  sneetjes: "sneetje",
  teentjes: "teentje",
  plakken: "plak",
};

function decimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "").replace(".", ",");
}

/** Naar boven afgerond; een tiende stuk teveel telt niet als een stuk extra. */
export function formatPieces(grams: number, perPiece: number, unit: PieceUnit): string {
  const pieces = Math.max(1, Math.ceil(grams / perPiece - 0.1));
  return `${pieces} ${pieces === 1 ? PIECE_SINGULAR[unit] : unit}`;
}

/** Naar boven op een getal dat je in de winkel terugziet. */
export function formatGrams(grams: number): string {
  if (grams >= 1000) return `${decimal(Math.ceil(grams / 100) / 10)} kg`;
  const step = grams < 10 ? 1 : grams < 100 ? 5 : 10;
  return `${Math.max(1, Math.ceil(grams / step) * step)} g`;
}

export function formatMillilitres(ml: number): string {
  if (ml >= 1000) return `${decimal(Math.ceil(ml / 100) / 10)} l`;
  const step = ml < 10 ? 1 : ml < 100 ? 5 : 10;
  return `${Math.max(1, Math.ceil(ml / step) * step)} ml`;
}

/** Eén regel per product, zodat een lijstjes-app er losse items van maakt. */
export function shoppingText(items: Pick<ShoppingItem, "name" | "amount">[]): string {
  return items.map((item) => `${item.name}, ${item.amount}`).join("\n");
}

export const PLAN_DAYS_MAX = 7;
