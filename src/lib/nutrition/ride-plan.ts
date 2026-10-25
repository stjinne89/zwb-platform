// Het ritplan: van "zoveel gram per uur" naar wat je klaarzet en wanneer je het
// neemt. Stap 2 van docs/ritvoeding-plan.md.
//
// Regelgebaseerd, net als het dagmenu. Bidons eerst: elke bidon draagt
// hoogstens BIDON_MAX_CARBS_G, wat erboven nodig is komt uit vast eten. Een
// recept is een bidon als er een drank in zit (NEVO-groep "Niet-alcoholische
// dranken"); de clubrecepten voor onderweg vallen zo vanzelf goed.

import { basePortion, macrosFor, scaleRecipe, type RecipeIngredient } from "./scale";
import type { Recipe } from "./recipes";
import type { ShoppingSlot } from "./shopping";
import { SHOPPING_NAMES } from "./shopping-names";
import { rideCarbsPerHour } from "./targets";

/**
 * Koolhydraten per bidon van 750 ml: 8%. De review van de Oliveira & Burini
 * (2014) noemt 5–8% het beste tijdens een wedstrijd, en 8–10% met glucose plus
 * fructose; boven 6% alleen glucose kwam er minder vocht door. De clubdranken
 * gebruiken suiker (glucose en fructose 1:1). Wat er per uur meer nodig is,
 * komt uit vast eten.
 */
export const BIDON_MAX_CARBS_G = 60;
/** Een stuk vast eten dat minder dan dit oplevert, laat het plan weg. */
const SOLID_MIN_CARBS_G = 15;
/** Eerste eetmoment na een kwartier, daarna elke twintig minuten. */
export const FIRST_FEED_MINUTE = 15;
export const FEED_INTERVAL_MINUTES = 20;
/** Geen eetmoment meer in de laatste tien minuten. */
const LAST_FEED_MARGIN_MINUTES = 10;

const DRINK_GROUP = "Niet-alcoholische dranken";

export function isBidonRecipe(recipe: Pick<Recipe, "ingredients">): boolean {
  return recipe.ingredients.some((item) => item.food.food_group === DRINK_GROUP);
}

export type RidePlanIngredient = { foodId: string; name: string; amount: number; unit: "g" | "ml" };

export type RidePlanItem = {
  /** Null bij een bidon met alleen water. */
  recipe: { slug: string; title: string } | null;
  count: number;
  /** Koolhydraten per bidon of per portie. */
  carbsG: number;
  ingredients: RidePlanIngredient[];
};

export type RideFeed = {
  minute: number;
  carbsG: number;
  /** Uit welke bidon je drinkt, vanaf 1. */
  bidon: number;
  /** Zoveel porties vast eten op dit moment. */
  solid: number;
};

export type RidePlan = {
  minutes: number;
  perHourG: number;
  totalG: number;
  bidons: RidePlanItem;
  solid: RidePlanItem | null;
  feeds: RideFeed[];
};

export type RidePlanInput = {
  minutes: number;
  /** Recepten voor tijdens de rit, beste eerst (rankRecipes). */
  ranked: Recipe[];
  /** Het recept dat het dagmenu bij "Tijdens de rit" zet; het andere soort komt uit `ranked`. */
  lead?: Recipe | null;
  /** Het lid koos `lead` zelf. */
  leadChosen?: boolean;
  energyFactor: number;
};

function ingredientsOf(items: RecipeIngredient[]): RidePlanIngredient[] {
  return items
    .filter((item) => item.grams > 0)
    .map((item) => ({
      foodId: item.food.id,
      name: item.food.name_nl,
      amount: item.grams,
      // Sap en water in ml, zoals op de boodschappenlijst (1 g ≈ 1 ml).
      unit:
        SHOPPING_NAMES[item.food.nevo_code]?.liquid || (item.food as { quantity_unit?: string }).quantity_unit === "ml"
          ? "ml"
          : "g",
    }));
}

function portion(recipe: Recipe, carbsG: number, energyFactor: number) {
  return scaleRecipe(
    recipe.ingredients.map((item) => ({ food: item.food, grams: item.grams, role: item.role })),
    recipe.servings,
    { carbsG, proteinG: null },
    energyFactor,
  );
}

function baseCarbs(recipe: Recipe): number {
  return basePortion(
    recipe.ingredients.map((item) => ({ food: item.food, grams: item.grams, role: item.role })),
    recipe.servings,
  ).perPortion.carbsG;
}

/** Elke twintig minuten, vanaf een kwartier, tot tien minuten voor het einde. */
export function feedMinutes(minutes: number): number[] {
  const feeds: number[] = [];
  for (let minute = FIRST_FEED_MINUTE; minute <= minutes - LAST_FEED_MARGIN_MINUTES; minute += FEED_INTERVAL_MINUTES) {
    feeds.push(minute);
  }
  return feeds.length > 0 ? feeds : [FIRST_FEED_MINUTE];
}

/**
 * Het plan voor één rit, of null onder een uur: dan hoeft er onderweg niets bij
 * (targets.ts). Het doel per uur is het midden van de band.
 */
export function ridePlan({
  minutes,
  ranked,
  lead = null,
  leadChosen = false,
  energyFactor,
}: RidePlanInput): RidePlan | null {
  const band = rideCarbsPerHour(minutes);
  if (!band) return null;
  const perHourG = Math.round((band.min + band.max) / 2);
  const target = Math.round((perHourG * minutes) / 60);

  const leadIsBidon = lead ? isBidonRecipe(lead) : false;
  const drink = lead && leadIsBidon ? lead : (ranked.find(isBidonRecipe) ?? null);
  const food = lead && !leadIsBidon ? lead : (ranked.find((recipe) => !isBidonRecipe(recipe)) ?? null);

  const bidonCount = Math.max(1, Math.round(minutes / 60));
  // Koos het lid zelf vast eten, dan draagt de bidon maar de helft: anders
  // verdwijnt die keuze bij een rit waar de bidons alles kunnen dragen.
  const bidonShare = lead && !leadIsBidon && leadChosen ? 0.5 : 1;
  const bidonTarget = food
    ? Math.min(BIDON_MAX_CARBS_G, (target * bidonShare) / bidonCount)
    : target / bidonCount;

  const bidonPortion = drink ? portion(drink, bidonTarget, energyFactor) : null;
  const bidonCarbs = bidonPortion ? Math.round(bidonPortion.perPortion.carbsG) : 0;
  const bidons: RidePlanItem = {
    recipe: drink ? { slug: drink.slug, title: drink.title } : null,
    count: bidonCount,
    carbsG: bidonCarbs,
    ingredients: bidonPortion ? ingredientsOf(bidonPortion.ingredients) : [],
  };

  let solid: RidePlanItem | null = null;
  const rest = target - bidonCarbs * bidonCount;
  if (food && rest >= SOLID_MIN_CARBS_G) {
    const count = Math.max(1, Math.round(rest / Math.max(baseCarbs(food), 1)));
    const solidPortion = portion(food, rest / count, energyFactor);
    solid = {
      recipe: { slug: food.slug, title: food.title },
      count,
      carbsG: Math.round(solidPortion.perPortion.carbsG),
      ingredients: ingredientsOf(solidPortion.ingredients),
    };
  }

  const minutesList = feedMinutes(minutes);
  // Vast eten niet op het eerste moment, als het kan: verdeeld over de rest.
  const slots = minutesList.length > 1 ? minutesList.slice(1) : minutesList;
  const solidAt = new Map<number, number>();
  for (let i = 0; i < (solid?.count ?? 0); i += 1) {
    const minute = slots[Math.min(slots.length - 1, Math.floor(((i + 0.5) * slots.length) / solid!.count))];
    solidAt.set(minute, (solidAt.get(minute) ?? 0) + 1);
  }
  const drinkPerFeed = (bidonCarbs * bidonCount) / minutesList.length;
  const feeds = minutesList.map((minute) => {
    const portions = solidAt.get(minute) ?? 0;
    return {
      minute,
      carbsG: Math.round(drinkPerFeed + portions * (solid?.carbsG ?? 0)),
      bidon: Math.min(bidonCount, Math.floor((minute * bidonCount) / minutes) + 1),
      solid: portions,
    };
  });

  return {
    minutes,
    perHourG,
    totalG: bidonCarbs * bidonCount + (solid ? solid.carbsG * solid.count : 0),
    bidons,
    solid,
    feeds,
  };
}

/** Laden loont bij een wedstrijd van meer dan ongeveer 90 minuten (protocol koolhydraten-laden). */
export const LOADING_MIN_MINUTES = 90;

/**
 * Duur en zwaarte van de rit bij een event: het eigen pacingplan eerst, dan de
 * eigen training voor dit event in het schema, dan de schatting van het schema.
 * `longRace`: een wedstrijd (of gran fondo) van 90 minuten of meer, waarvoor
 * koolhydraten laden loont.
 */
export function eventRide(input: {
  pacedSeconds: number | null;
  workout: { minutes: number | null; intensity: string | null } | null;
  estimate: { minutes: number; intensity: string };
  eventType: string;
}): { minutes: number; intensity: string; longRace: boolean } {
  const paced = input.pacedSeconds && input.pacedSeconds > 0 ? Math.round(input.pacedSeconds / 60) : null;
  const minutes = paced ?? (input.workout?.minutes || input.estimate.minutes);
  const intensity = input.workout?.intensity ?? input.estimate.intensity;
  const longRace = minutes >= LOADING_MIN_MINUTES && (intensity === "race" || input.eventType === "gran_fondo");
  return { minutes, intensity, longRace };
}

/**
 * Het ritplan als regels voor de boodschappenlijst (shoppingList): per recept
 * alle bidons of porties samen. Een recept dat er niet meer is, valt weg.
 */
export function ridePlanShoppingSlots(plan: RidePlan, recipes: Recipe[]): ShoppingSlot[] {
  const bySlug = new Map(recipes.map((recipe) => [recipe.slug, recipe]));
  const slots: ShoppingSlot[] = [];
  for (const item of [plan.bidons, plan.solid]) {
    const recipe = item?.recipe ? bySlug.get(item.recipe.slug) : undefined;
    if (!item || !recipe) continue;
    const foods = new Map(recipe.ingredients.map((ingredient) => [ingredient.food.id, ingredient]));
    const ingredients = item.ingredients.flatMap((ingredient) => {
      const source = foods.get(ingredient.foodId);
      return source ? [{ food: source.food, grams: ingredient.amount * item.count, role: source.role }] : [];
    });
    slots.push({
      moment: "tijdens_rit",
      recipe,
      portion: { factors: { kh_bron: 1, eiwit_bron: 1, vast: 1 }, ingredients, perPortion: macrosFor(ingredients) },
    });
  }
  return slots;
}

/** Kort, voor een pushbericht: "2× bidon Zelfgemaakte sportdrank, 1× Zacht wit broodje met jam". */
export function ridePlanSummary(plan: RidePlan): string {
  const parts = [`${plan.bidons.count}× bidon ${plan.bidons.recipe?.title ?? "water"}`];
  if (plan.solid?.recipe) parts.push(`${plan.solid.count}× ${plan.solid.recipe.title}`);
  return parts.join(", ");
}

/** "0:15", "1:35". */
export function formatRideMinute(minute: number): string {
  return `${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")}`;
}

/** Wat "Gegeten" vastlegt: per recept alle bidons of porties samen. */
export function ridePlanMeals(plan: RidePlan): { slug: string; title: string; items: { food_id: string; grams: number }[] }[] {
  return [plan.bidons, plan.solid]
    .filter((item): item is RidePlanItem => item != null && item.recipe != null && item.ingredients.length > 0)
    .map((item) => ({
      slug: item.recipe!.slug,
      title: `${item.count}× ${item.recipe!.title}`,
      items: item.ingredients.map((ingredient) => ({
        food_id: ingredient.foodId,
        grams: Math.round(ingredient.amount * item.count * 10) / 10,
      })),
    }));
}
