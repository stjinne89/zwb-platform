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
import { DEFAULT_BIDON_ML, fluidMl, fluidPerHour, type FluidTarget } from "./sweat";
import { rideTargetPerHour, type GutTraining } from "./targets";

/** De bidons om uit te kiezen bij Klaarzetten en in het receptenboek. */
export const BIDON_SIZES = [500, 750, 1000] as const;
export type BidonMl = (typeof BIDON_SIZES)[number];

export function isBidonMl(value: unknown): value is BidonMl {
  return BIDON_SIZES.includes(Number(value) as BidonMl);
}

/** De maat in de twee bidonhouders aan de fiets. */
export type BidonHolders = readonly [BidonMl, BidonMl];
export const DEFAULT_HOLDERS: BidonHolders = [DEFAULT_BIDON_ML, DEFAULT_BIDON_ML];

/** Bidon `index` (vanaf 0) komt om en om uit houder 1 en 2, ook als je onderweg bijvult. */
function bidonSize(holders: BidonHolders, index: number): BidonMl {
  return holders[index % 2];
}

/** Zoveel bidons dat ze samen het dichtst bij `ml` komen; minstens één. */
export function bidonCountFor(ml: number, holders: BidonHolders): number {
  let count = 1;
  let volume: number = holders[0];
  while (volume < ml) {
    volume += bidonSize(holders, count);
    count += 1;
  }
  const previous = volume - bidonSize(holders, count - 1);
  return count > 1 && ml - previous < volume - ml ? count - 1 : count;
}

export function sameHolders(a: BidonHolders, b: BidonHolders): boolean {
  return a[0] === b[0] && a[1] === b[1];
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

/** Bidons van één maat met hetzelfde erin; `recipe` null is water. */
export type RidePlanBidon = RidePlanItem & { ml: BidonMl };

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
  holders: BidonHolders;
  perHourG: number;
  totalG: number;
  /** Sportdrank eerst, dan water; per maat, in de volgorde van de houders. */
  bidons: RidePlanBidon[];
  /** Hoeveel je per uur drinkt, uit de eigen zweettest; null zonder test. */
  fluid: FluidTarget | null;
  solid: RidePlanItem | null;
  feeds: RideFeed[];
  /** Hetzelfde plan voor elke maat in elke houder, om te kiezen bij Klaarzetten. */
  options?: RidePlan[];
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
  holders?: BidonHolders;
  /**
   * Het doel per uur van buiten, zoals "Reken met" bij een event
   * (docs/eventvoeding-plan.md stap 2). Dan komt er ook onder een uur een plan;
   * bij 0 alleen bidons met water.
   */
  perHourG?: number | null;
  /** Vocht per uur van buiten (het schuifje bij een event); gaat voor de zweettest. */
  fluidMlPerHour?: number | null;
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

/** Gelijke maten bij elkaar, in de volgorde waarin ze voor het eerst voorkomen. */
function groupSizes(sizes: BidonMl[]): { ml: BidonMl; count: number }[] {
  const groups: { ml: BidonMl; count: number }[] = [];
  for (const ml of sizes) {
    const group = groups.find((item) => item.ml === ml);
    if (group) group.count += 1;
    else groups.push({ ml, count: 1 });
  }
  return groups;
}

/**
 * Het plan voor één rit, of null onder een uur: dan hoeft er onderweg niets bij
 * (targets.ts). Het doel per uur volgt de zwaarte (rideTargetPerHour). In
 * `options` staat hetzelfde plan voor elke maat in elke houder.
 */
export function ridePlan(input: RidePlanInput): RidePlan | null {
  const chosen = input.holders ?? DEFAULT_HOLDERS;
  const options = BIDON_SIZES.flatMap((first) =>
    BIDON_SIZES.map((second) => planForHolders(input, [first, second])),
  ).filter((item): item is RidePlan => item != null);
  const plan = options.find((item) => sameHolders(item.holders, chosen));
  return plan ? { ...plan, options } : null;
}

function planForHolders(
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
    perHourG: fixedPerHour = null,
    fluidMlPerHour = null,
  }: RidePlanInput,
  holders: BidonHolders,
): RidePlan | null {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const perHourG = fixedPerHour != null ? Math.max(0, fixedPerHour) : rideTargetPerHour(minutes, intensity, gut);
  if (perHourG == null) return null;
  const target = Math.round((perHourG * minutes) / 60);

  const leadIsBidon = lead ? isBidonRecipe(lead) : false;
  const drink = lead && leadIsBidon ? lead : (ranked.find(isBidonRecipe) ?? null);
  const food = lead && !leadIsBidon ? lead : (ranked.find((recipe) => !isBidonRecipe(recipe)) ?? null);

  // Met een zweettest volgt het aantal bidons uit het vochtdoel, anders uit
  // 750 ml per uur. De bidons komen om en om uit de twee houders.
  const fluid =
    fluidMlPerHour != null
      ? { minMl: Math.max(0, fluidMlPerHour), maxMl: Math.max(0, fluidMlPerHour) }
      : sweatMlPerHour
        ? fluidPerHour(sweatMlPerHour, weightKg, minutes)
        : null;
  const neededMl = fluid ? fluidMl(fluid, minutes) : (minutes * DEFAULT_BIDON_ML) / 60;
  const sizes = Array.from({ length: bidonCountFor(neededMl, holders) }, (_, index) => bidonSize(holders, index));
  const volumeOf = (list: BidonMl[]) => list.reduce((sum, ml) => sum + ml, 0);
  // Koos het lid zelf vast eten, dan draagt de bidon maar de helft: anders
  // verdwijnt die keuze bij een rit waar de bidons alles kunnen dragen.
  const bidonShare = lead && !leadIsBidon && leadChosen ? 0.5 : 1;
  const drinkTotal = food
    ? Math.min(BIDON_MAX_CARBS_PER_ML * volumeOf(sizes), target * bidonShare)
    : target;
  // Vraagt de rit per bidon minder dan een halve portie, dan gaat de sportdrank
  // in minder bidons en gaan de overige met water mee. Die ene bidon mag daarna
  // wel kleiner dan een halve portie (scale.ts, drank).
  const smallest = drink ? portion(drink, 0, energyFactor, false).perPortion.carbsG : 0;
  const drinkCount = drink && drinkTotal > 0
    ? Math.min(sizes.length, Math.max(1, Math.floor(drinkTotal / Math.max(smallest, 1))))
    : 0;
  const drinkVolume = volumeOf(sizes.slice(0, drinkCount));

  // Dezelfde sportdrank in elke bidon: de koolhydraten naar de maat ervan.
  const carbsOf = new Map<BidonMl, number>();
  const bidons: RidePlanBidon[] = [];
  for (const { ml, count } of groupSizes(sizes.slice(0, drinkCount))) {
    const share = (drinkTotal * ml) / drinkVolume;
    const bidonPortion = portion(drink!, food ? Math.min(bidonMaxCarbs(ml), share) : share, energyFactor);
    const carbsG = Math.round(bidonPortion.perPortion.carbsG);
    carbsOf.set(ml, carbsG);
    bidons.push({
      ml,
      recipe: { slug: drink!.slug, title: drink!.title },
      count,
      carbsG,
      ingredients: ingredientsOf(fillBidon(bidonPortion.ingredients, ml)),
    });
  }
  for (const { ml, count } of groupSizes(sizes.slice(drinkCount))) {
    bidons.push({ ml, recipe: null, count, carbsG: 0, ingredients: [] });
  }
  const drinkCarbs = bidons.reduce((sum, item) => sum + item.carbsG * item.count, 0);

  let solid: RidePlanItem | null = null;
  const rest = target - drinkCarbs;
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
  // De bidons op volgorde, sportdrank eerst; een grote bidon gaat langer mee.
  // Elke bidon verdeeld over de momenten waarop je eruit drinkt.
  const total = volumeOf(sizes);
  const bidonOf = (minute: number) => {
    const drunk = (minute / minutes) * total;
    let volume = 0;
    for (let index = 0; index < sizes.length; index += 1) {
      volume += sizes[index];
      if (drunk < volume) return index + 1;
    }
    return sizes.length;
  };
  const feedsPerBidon = new Map<number, number>();
  for (const minute of minutesList) feedsPerBidon.set(bidonOf(minute), (feedsPerBidon.get(bidonOf(minute)) ?? 0) + 1);
  const feeds = minutesList.map((minute) => {
    const portions = solidAt.get(minute) ?? 0;
    const bidon = bidonOf(minute);
    const fromBidon =
      bidon <= drinkCount ? (carbsOf.get(sizes[bidon - 1]) ?? 0) / (feedsPerBidon.get(bidon) ?? 1) : 0;
    return {
      minute,
      carbsG: Math.round(fromBidon + portions * (solid?.carbsG ?? 0)),
      bidon,
      solid: portions,
    };
  });

  return {
    minutes,
    holders,
    perHourG,
    totalG: drinkCarbs + (solid ? solid.carbsG * solid.count : 0),
    bidons,
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
  for (const item of perRecipe(plan)) {
    const recipe = bySlug.get(item.recipe.slug);
    if (!recipe) continue;
    const foods = new Map(recipe.ingredients.map((ingredient) => [ingredient.food.id, ingredient]));
    const ingredients = item.ingredients.flatMap((ingredient) => {
      const source = foods.get(ingredient.foodId);
      return source ? [{ food: source.food, grams: ingredient.amount, role: source.role }] : [];
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
  const counts = new Map<string, number>();
  for (const item of plan.bidons) {
    const name = item.recipe?.title ?? "water";
    counts.set(name, (counts.get(name) ?? 0) + item.count);
  }
  const parts = [...counts].map(([name, count]) => `${count}× bidon ${name}`);
  if (plan.solid?.recipe) parts.push(`${plan.solid.count}× ${plan.solid.recipe.title}`);
  return parts.join(", ");
}

type RecipeTotal = { recipe: { slug: string; title: string }; count: number; ingredients: RidePlanIngredient[] };

/**
 * Per recept alles samen: de bidons met sportdrank (in welke maat ook) en het
 * vaste eten, met de hoeveelheden van alle bidons of porties opgeteld.
 */
function perRecipe(plan: RidePlan): RecipeTotal[] {
  const merged = new Map<string, RecipeTotal>();
  for (const item of [...plan.bidons, ...(plan.solid ? [plan.solid] : [])]) {
    if (!item.recipe || item.ingredients.length === 0) continue;
    const entry = merged.get(item.recipe.slug) ?? { recipe: item.recipe, count: 0, ingredients: [] };
    entry.count += item.count;
    for (const ingredient of item.ingredients) {
      const amount = ingredient.amount * item.count;
      const known = entry.ingredients.find((other) => other.foodId === ingredient.foodId);
      if (known) known.amount += amount;
      else entry.ingredients.push({ ...ingredient, amount });
    }
    merged.set(item.recipe.slug, entry);
  }
  return [...merged.values()];
}

/** "0:15", "1:35". */
export function formatRideMinute(minute: number): string {
  return `${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")}`;
}

/** Wat "Gegeten" vastlegt: per recept alle bidons of porties samen. */
export function ridePlanMeals(
  plan: RidePlan,
): { slug: string; title: string; items: ReturnType<typeof logItemFor>[] }[] {
  return perRecipe(plan).map((item) => ({
    slug: item.recipe.slug,
    title: `${item.count}× ${item.recipe.title}`,
    items: item.ingredients.map((ingredient) =>
      logItemFor({ id: ingredient.foodId, barcode: ingredient.barcode }, Math.round(ingredient.amount * 10) / 10),
    ),
  }));
}
