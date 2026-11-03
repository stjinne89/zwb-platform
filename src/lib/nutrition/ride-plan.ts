// Het ritplan: van "zoveel gram per uur" naar wat je klaarzet en wanneer je het
// neemt. Stap 2 van docs/ritvoeding-plan.md.
//
// Regelgebaseerd, net als het dagmenu. Bidons eerst: elke bidon draagt
// hoogstens bidonMaxCarbs, wat erboven nodig is komt uit vast eten. Een
// recept is een bidon als er een drank in zit (NEVO-groep "Niet-alcoholische
// dranken"); de clubrecepten voor onderweg vallen zo vanzelf goed, en een
// gescande drank in ml ook (products.ts). Een recept van alleen verpakte
// producten, zoals een gel, gaat in hele stuks mee.

import {
  basePortion,
  energyFree,
  macrosFor,
  roundGrams,
  scaleRecipe,
  type RecipeIngredient,
  type ScaledRecipe,
} from "./scale";
import { isBidonRecipe, isPackagedRecipe, type Recipe } from "./recipes";
import { logItemFor } from "./products";
import type { ShoppingSlot } from "./shopping";
import { unitFor } from "./shopping-names";
import { DEFAULT_BIDON_ML, fluidBidons, fluidPerHour, type FluidTarget } from "./sweat";
import { rideTargetPerHour, type GutTraining } from "./targets";

/** De bidons om uit te kiezen bij Klaarzetten en in het receptenboek. */
export const BIDON_SIZES = [500, 750, 1000] as const;
export type BidonMl = (typeof BIDON_SIZES)[number];

export function isBidonMl(value: unknown): value is BidonMl {
  return BIDON_SIZES.includes(Number(value) as BidonMl);
}

/**
 * Koolhydraten per bidon: hoogstens 90 g per 500 ml (18%), dus 135 g in een
 * bidon van 750 ml. McCubbin et al. (2020) gaven 90 g per uur als drank van 16%
 * (maltodextrine en fructose); de review van de Oliveira & Burini (2014) noemde
 * nog 5–8%, en 8–10% met glucose plus fructose. De grens zelf is een keuze van
 * ZWB. De clubdranken gebruiken suiker (glucose en fructose 1:1). Wat er per
 * uur meer nodig is, komt uit vast eten.
 */
const BIDON_MAX_CARBS_PER_ML = 90 / 500;

export function bidonMaxCarbs(bidonMl: number): number {
  return Math.round(BIDON_MAX_CARBS_PER_ML * bidonMl);
}

/**
 * Een recept voor onderweg gaat uit van een bidon van 750 ml: water en zout
 * (zonder energie, scale.ts) groeien of krimpen mee met de gekozen bidon.
 */
export function fillBidon<T extends RecipeIngredient>(ingredients: T[], bidonMl: number): T[] {
  if (bidonMl === DEFAULT_BIDON_ML) return ingredients;
  return ingredients.map((item) =>
    energyFree(item.food) ? { ...item, grams: roundGrams((item.grams * bidonMl) / DEFAULT_BIDON_ML) } : item,
  );
}

/**
 * Een portie voor onderweg in een andere bidon, zoals het receptenboek hem toont:
 * alles schaalt mee, dus de koolhydraten ook en de sterkte blijft gelijk. Bij
 * Klaarzetten bepaalt de rit de koolhydraten per bidon en volgt alleen het water.
 */
export function resizeBidon(portion: ScaledRecipe, bidonMl: number): ScaledRecipe {
  if (bidonMl === DEFAULT_BIDON_ML) return portion;
  const ingredients = portion.ingredients.map((item) => ({
    ...item,
    grams: roundGrams((item.grams * bidonMl) / DEFAULT_BIDON_ML),
  }));
  return { ...portion, ingredients, perPortion: macrosFor(ingredients) };
}
/** Een stuk vast eten dat minder dan dit oplevert, laat het plan weg. */
const SOLID_MIN_CARBS_G = 15;
/** Eerste eetmoment na een kwartier, daarna elke twintig minuten. */
export const FIRST_FEED_MINUTE = 15;
export const FEED_INTERVAL_MINUTES = 20;
/** Geen eetmoment meer in de laatste tien minuten. */
const LAST_FEED_MARGIN_MINUTES = 10;

export { isBidonRecipe };

export type RidePlanIngredient = {
  foodId: string;
  /** Bij een verpakt product; `foodId` is dan ook de barcode. */
  barcode?: string;
  name: string;
  amount: number;
  unit: "g" | "ml";
  /** Gram per schep uit het recept, om poeder in schepjes te tonen. */
  scoopG?: number;
};

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
  bidonMl: BidonMl;
  perHourG: number;
  totalG: number;
  bidons: RidePlanItem;
  /** Bidons met alleen water, naast de bidons met sportdrank. */
  waterBidons: number;
  /** Hoeveel je per uur drinkt, uit de eigen zweettest; null zonder test. */
  fluid: FluidTarget | null;
  solid: RidePlanItem | null;
  feeds: RideFeed[];
  /** Hetzelfde plan per bidongrootte, om te kiezen bij Klaarzetten. */
  sizes?: RidePlan[];
};

export type RidePlanInput = {
  minutes: number;
  /** Zwaarte van de rit (WorkoutIntensity); null = het midden van de band. */
  intensity?: string | null;
  /** Darmtraining op de dag van de rit (gut-training.ts). */
  gut?: GutTraining | null;
  /** Zweetverlies per uur uit de laatste zweettest (sweat.ts); null zonder test. */
  sweatMlPerHour?: number | null;
  /** Voor de 2%-grens van het vochtdoel. */
  weightKg?: number | null;
  /** Recepten voor tijdens de rit, beste eerst (rankRecipes). */
  ranked: Recipe[];
  /** Het recept dat het dagmenu bij "Tijdens de rit" zet; het andere soort komt uit `ranked`. */
  lead?: Recipe | null;
  /** Het lid koos `lead` zelf. */
  leadChosen?: boolean;
  energyFactor: number;
  bidonMl?: BidonMl;
};

function ingredientsOf(items: RecipeIngredient[]): RidePlanIngredient[] {
  return items
    .filter((item) => item.grams > 0)
    .map((item) => ({
      foodId: item.food.id,
      ...(item.food.barcode ? { barcode: item.food.barcode } : {}),
      name: item.food.name_nl,
      amount: item.grams,
      ...(item.food.scoop_g ? { scoopG: Number(item.food.scoop_g) } : {}),
      // Sap en water in ml, zoals op de boodschappenlijst (1 g ≈ 1 ml).
      unit: unitFor(item.food as { nevo_code: number; quantity_unit?: string }),
    }));
}

function portion(recipe: Recipe, carbsG: number, energyFactor: number, drink = isBidonRecipe(recipe)) {
  if (isPackagedRecipe(recipe)) return basePortion(recipe.ingredients, recipe.servings);
  return scaleRecipe(
    recipe.ingredients.map((item) => ({ food: item.food, grams: item.grams, role: item.role })),
    recipe.servings,
    { carbsG, proteinG: null },
    energyFactor,
    { drink },
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
 * (targets.ts). Het doel per uur volgt de zwaarte (rideTargetPerHour). In
 * `sizes` staat hetzelfde plan voor elke bidongrootte.
 */
export function ridePlan(input: RidePlanInput): RidePlan | null {
  const plans = BIDON_SIZES.map((bidonMl) => planForBidon(input, bidonMl));
  const plan = plans[BIDON_SIZES.indexOf(input.bidonMl ?? DEFAULT_BIDON_ML)];
  return plan ? { ...plan, sizes: plans.filter((item): item is RidePlan => item != null) } : null;
}

function planForBidon(
  {
    minutes,
    intensity = null,
    gut = null,
    sweatMlPerHour = null,
    weightKg = null,
    ranked,
    lead = null,
    leadChosen = false,
    energyFactor,
  }: RidePlanInput,
  bidonMl: BidonMl,
): RidePlan | null {
  const perHourG = rideTargetPerHour(minutes, intensity, gut);
  if (perHourG == null) return null;
  const target = Math.round((perHourG * minutes) / 60);

  const leadIsBidon = lead ? isBidonRecipe(lead) : false;
  const drink = lead && leadIsBidon ? lead : (ranked.find(isBidonRecipe) ?? null);
  const food = lead && !leadIsBidon ? lead : (ranked.find((recipe) => !isBidonRecipe(recipe)) ?? null);

  // Met een zweettest volgt het aantal bidons uit het vochtdoel, anders zoveel
  // als één bidon van 750 ml per uur.
  const fluid = sweatMlPerHour ? fluidPerHour(sweatMlPerHour, weightKg, minutes) : null;
  const bidonCount = fluid
    ? fluidBidons(fluid, minutes, bidonMl)
    : Math.max(1, Math.round((minutes * DEFAULT_BIDON_ML) / 60 / bidonMl));
  const maxCarbs = bidonMaxCarbs(bidonMl);
  // Koos het lid zelf vast eten, dan draagt de bidon maar de helft: anders
  // verdwijnt die keuze bij een rit waar de bidons alles kunnen dragen.
  const bidonShare = lead && !leadIsBidon && leadChosen ? 0.5 : 1;
  const drinkTotal = food ? Math.min(maxCarbs * bidonCount, target * bidonShare) : target;
  // Vraagt de rit per bidon minder dan een halve portie, dan gaat de sportdrank
  // in minder bidons en gaan de overige met water mee. Die ene bidon mag daarna
  // wel kleiner dan een halve portie (scale.ts, drank).
  const smallest = drink ? portion(drink, 0, energyFactor, false).perPortion.carbsG : 0;
  const drinkBidons = drink ? Math.min(bidonCount, Math.max(1, Math.floor(drinkTotal / Math.max(smallest, 1)))) : 0;
  const bidonTarget = drink
    ? food
      ? Math.min(maxCarbs, drinkTotal / drinkBidons)
      : drinkTotal / drinkBidons
    : 0;

  const bidonPortion = drink ? portion(drink, bidonTarget, energyFactor) : null;
  const bidonCarbs = bidonPortion ? Math.round(bidonPortion.perPortion.carbsG) : 0;
  const carbBidons = drink ? drinkBidons : bidonCount;
  const bidons: RidePlanItem = {
    recipe: drink ? { slug: drink.slug, title: drink.title } : null,
    count: carbBidons,
    carbsG: bidonCarbs,
    ingredients: bidonPortion ? ingredientsOf(fillBidon(bidonPortion.ingredients, bidonMl)) : [],
  };

  let solid: RidePlanItem | null = null;
  const rest = target - bidonCarbs * carbBidons;
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
  // De bidons op volgorde, sportdrank eerst; elke bidon verdeeld over de
  // momenten waarop je eruit drinkt.
  const bidonOf = (minute: number) => Math.min(bidonCount, Math.floor((minute * bidonCount) / minutes) + 1);
  const feedsPerBidon = new Map<number, number>();
  for (const minute of minutesList) feedsPerBidon.set(bidonOf(minute), (feedsPerBidon.get(bidonOf(minute)) ?? 0) + 1);
  const feeds = minutesList.map((minute) => {
    const portions = solidAt.get(minute) ?? 0;
    const bidon = bidonOf(minute);
    const drinkCarbs = bidon <= carbBidons ? bidonCarbs / (feedsPerBidon.get(bidon) ?? 1) : 0;
    return {
      minute,
      carbsG: Math.round(drinkCarbs + portions * (solid?.carbsG ?? 0)),
      bidon,
      solid: portions,
    };
  });

  return {
    minutes,
    bidonMl,
    perHourG,
    totalG: bidonCarbs * carbBidons + (solid ? solid.carbsG * solid.count : 0),
    bidons,
    waterBidons: bidonCount - carbBidons,
    fluid,
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
  if (plan.waterBidons > 0) parts.push(`${plan.waterBidons}× bidon water`);
  if (plan.solid?.recipe) parts.push(`${plan.solid.count}× ${plan.solid.recipe.title}`);
  return parts.join(", ");
}

/** "0:15", "1:35". */
export function formatRideMinute(minute: number): string {
  return `${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")}`;
}

/** Wat "Gegeten" vastlegt: per recept alle bidons of porties samen. */
export function ridePlanMeals(
  plan: RidePlan,
): { slug: string; title: string; items: ReturnType<typeof logItemFor>[] }[] {
  return [plan.bidons, plan.solid]
    .filter((item): item is RidePlanItem => item != null && item.recipe != null && item.ingredients.length > 0)
    .map((item) => ({
      slug: item.recipe!.slug,
      title: `${item.count}× ${item.recipe!.title}`,
      items: item.ingredients.map((ingredient) =>
        logItemFor(
          { id: ingredient.foodId, barcode: ingredient.barcode },
          Math.round(ingredient.amount * item.count * 10) / 10,
        ),
      ),
    }));
}
