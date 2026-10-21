// Het dagmenu: per moment van de dag één recept dat bij deze renner en deze dag
// past, met de overige recepten als alternatief.
//
// Regelgebaseerd, net als de tip (tips.ts). Alleen wat het lid zelf kiest wordt
// bewaard (nutrition_menu_choices, zie plan.ts); de rest volgt uit de regels.
// De automatische keuze kijkt naar:
//   1. of de portie na schalen het doel van dat moment haalt (scale.ts);
//   2. het brandstofprofiel dat bij het dagtype hoort;
//   3. het soort eten: licht verteerbaar rond de rit en op zware dagen,
//      vezelrijk op rustige dagen (UCI-positiestandpunt, thema 7);
//   4. wat het lid zelf als favoriet of "niet voor mij" heeft gemarkeerd.
// Een recept dat een ander lid deelt, kiest het menu alleen als favoriet.
// Wat daarna gelijkwaardig is, wisselt per dag door, zodat een recept pas
// terugkomt als de andere geweest zijn.

import { dayIndex } from "@/lib/training/zwbeterworden";
import { isKeyDay, totalMinutes, type FuelDayType } from "./day-type";
import type { DietTag, FuelProfile } from "./labels";
import { matchesDiet, portionForRider, type Recipe, type Rider } from "./recipes";
import { SCALE_MAX, macrosFor, roundGrams, type IngredientRole, type ScaledRecipe } from "./scale";
import { MEAL_MOMENTS, mealTarget, type MealMoment } from "./targets";
import { EVENING_START_HOUR, type NutritionDay, type NutritionDayInput } from "./tips";
import { portionTraits, type PortionTraits } from "./traits";

export const RECIPE_PREFS = ["favoriet", "verborgen"] as const;
export type RecipePref = (typeof RECIPE_PREFS)[number];
export type RecipePrefs = Map<string, RecipePref>;

/** De gewone maaltijden, en wat er rond een rit bij komt. */
export const DAY_MOMENTS: MealMoment[] = ["ontbijt", "lunch", "tussendoor", "diner", "voor_slapen"];
export const RIDE_MOMENTS: MealMoment[] = ["voor_rit", "tijdens_rit", "na_rit"];

const MAIN_MEALS = new Set<MealMoment>(["ontbijt", "lunch", "diner"]);
/** Vanaf deze ritduur hoort er een herstelmoment bij (zelfde grens als de tip). */
const RECOVERY_RIDE_MINUTES = 60;

/** Welke momenten vandaag in het menu staan. */
export function menuMoments(input: NutritionDayInput, day: NutritionDay): MealMoment[] {
  const moments = new Set<MealMoment>(["ontbijt", "lunch", "diner"]);
  if (day.dayType !== "rust" && day.dayType !== "licht") moments.add("tussendoor");

  const planned = totalMinutes(input.plannedToday);
  const ridden = totalMinutes(input.ridesToday);
  const stillToRide = input.ridesToday.length === 0 && planned > 0;
  if (stillToRide) moments.add("voor_rit");
  if (day.rideCarbsPerHour) moments.add("tijdens_rit");
  if (Math.max(planned, ridden) >= RECOVERY_RIDE_MINUTES) moments.add("na_rit");

  const eveningRide = input.ridesToday.some((ride) => (ride.startHour ?? -1) >= EVENING_START_HOUR);
  if (eveningRide || isKeyDay(day.dayType)) moments.add("voor_slapen");

  return MEAL_MOMENTS.filter((moment) => moments.has(moment));
}

/** Het profiel dat bij dit moment past, in volgorde van voorkeur. */
export function wantedProfiles(moment: MealMoment, dayType: FuelDayType, tomorrowType: FuelDayType): FuelProfile[] {
  if (!MAIN_MEALS.has(moment)) return [];
  // De avond voor een zware dag telt als brandstof voor morgen.
  if (isKeyDay(dayType) || (moment === "diner" && isKeyDay(tomorrowType))) return ["hoog_kh", "gemengd"];
  if (dayType === "rust") return ["eiwitrijk", "gemengd"];
  return ["gemengd", "hoog_kh"];
}

export type MenuContext = {
  /** Null zonder gewicht: dan telt alleen profiel, soort eten en voorkeur. */
  rider: Rider | null;
  dayType: FuelDayType;
  tomorrowType: FuelDayType;
  today: string;
  prefs: RecipePrefs;
  diet: DietTag | null;
  /**
   * Ook recepten die andere leden delen. Zonder dit tellen die alleen als het
   * lid ze als favoriet heeft: ze zijn niet nagekeken zoals de clubrecepten.
   */
  includeShared?: boolean;
};

export type RankedRecipe = {
  recipe: Recipe;
  portion: ScaledRecipe;
  traits: PortionTraits;
  score: number;
};

/**
 * Hoe dicht de portie bij het doel komt, tussen 0 en 1. Koolhydraten tellen in
 * beide richtingen. Eiwit alleen als het doel niet gehaald wordt: een maaltijd
 * met meer eiwit dan het doel is geen slechtere keuze.
 */
export function portionFit(recipe: Recipe, portion: ScaledRecipe, rider: Rider | null): number {
  if (!rider?.weightKg) return 1;
  const target = mealTarget(recipe.meal_moment, {
    weightKg: rider.weightKg,
    dayType: rider.dayType,
    rideMinutes: rider.rideMinutes,
  });
  const parts: number[] = [];
  if (target.carbsG) {
    const actual = portion.perPortion.carbsG;
    parts.push(actual <= 0 ? 0 : Math.min(actual / target.carbsG, target.carbsG / actual));
  }
  if (target.proteinG) parts.push(Math.min(1, portion.perPortion.proteinG / target.proteinG));
  if (parts.length === 0) return 1;
  // Koolhydraten wegen dubbel: daar zit het verschil tussen de dagen.
  const [first, second] = parts;
  return second == null ? first : target.carbsG ? (first * 2 + second) / 3 : (first + second) / 2;
}

const PROFILE_BONUS = [0.3, 0.15];
const TRAIT_BONUS = 0.15;
const FAVORITE_BONUS = 0.25;
/** Recepten binnen deze afstand van de beste gelden als gelijkwaardig en wisselen per dag. */
const ROTATION_BAND = 0.2;

function daysSinceEpoch(dayKey: string): number {
  return Math.floor(Date.parse(`${dayKey}T12:00:00Z`) / 86_400_000);
}

/**
 * Alle recepten voor één moment, beste eerst. Verborgen recepten en recepten
 * buiten het dieetfilter vallen af. De gelijkwaardige kopgroep schuift per dag
 * één plek op.
 */
export function rankRecipes(recipes: Recipe[], moment: MealMoment, context: MenuContext): RankedRecipe[] {
  const profiles = wantedProfiles(moment, context.dayType, context.tomorrowType);
  const wantsLight = moment === "voor_rit" || (MAIN_MEALS.has(moment) && isKeyDay(context.dayType));
  const wantsFiber = MAIN_MEALS.has(moment) && (context.dayType === "rust" || context.dayType === "licht");

  const ranked = recipes
    .filter(
      (recipe) =>
        recipe.meal_moment === moment &&
        context.prefs.get(recipe.id) !== "verborgen" &&
        (!recipe.from_member || context.includeShared || context.prefs.get(recipe.id) === "favoriet") &&
        matchesDiet(recipe, context.diet),
    )
    .map((recipe) => {
      const portion = portionForRider(recipe, context.rider);
      const traits = portionTraits(portion.ingredients);
      const profileRank = profiles.indexOf(recipe.fuel_profile);
      const score =
        portionFit(recipe, portion, context.rider) +
        (profileRank >= 0 ? PROFILE_BONUS[profileRank] ?? 0 : 0) +
        (wantsLight && traits.lightDigest ? TRAIT_BONUS : 0) +
        (wantsFiber && traits.fiberRich ? TRAIT_BONUS : 0) +
        (context.prefs.get(recipe.id) === "favoriet" ? FAVORITE_BONUS : 0);
      return { recipe, portion, traits, score };
    })
    .sort((a, b) => b.score - a.score || a.recipe.slug.localeCompare(b.recipe.slug));
  if (ranked.length === 0) return [];

  const best = ranked[0].score;
  // Een vaste, van de score onafhankelijke volgorde binnen de kopgroep; anders
  // staat het recept met de hoogste score elke dag vooraan.
  const head = ranked
    .filter((item) => item.score >= best - ROTATION_BAND)
    .sort(
      (a, b) =>
        dayIndex(`${moment}:${a.recipe.slug}`, 1_000_003) - dayIndex(`${moment}:${b.recipe.slug}`, 1_000_003) ||
        a.recipe.slug.localeCompare(b.recipe.slug),
    );
  const offset = (daysSinceEpoch(context.today) + dayIndex(moment, 97)) % head.length;
  return [...head.slice(offset), ...head.slice(0, offset), ...ranked.slice(head.length)];
}

/** De koolhydraatbasis van een recept: het ingrediënt dat de meeste koolhydraten levert. */
export function stapleOf(recipe: Recipe): string | null {
  let best: { id: string; carbs: number } | null = null;
  for (const item of recipe.ingredients) {
    if (item.role !== "kh_bron") continue;
    const carbs = (Number(item.food.carbs_g ?? 0) * item.grams) / 100;
    if (!best || carbs > best.carbs) best = { id: item.food.id, carbs };
  }
  return best?.id ?? null;
}

export type MenuSlot = RankedRecipe & {
  moment: MealMoment;
  /** Hoeveel recepten er voor dit moment zijn, voor "Ander recept". */
  choices: number;
  /** Het lid heeft dit recept zelf voor deze dag gekozen (nutrition_menu_choices). */
  chosen: boolean;
  /** Het recept dat "Ander recept" kiest; null als er maar één is. */
  nextRecipeId: string | null;
  /** De portie is groter gemaakt omdat de dag anders onder het minimum blijft (topUpMenu). */
  toppedUp?: boolean;
};

/** Lunch en diner zijn uitwisselbaar; de andere momenten hebben hun eigen recepten. */
export function choiceMoments(moment: MealMoment): MealMoment[] {
  return moment === "lunch" || moment === "diner" ? ["lunch", "diner"] : [moment];
}

export type DayMenuOptions = {
  /** Zelf gekozen recepten voor deze dag, per moment. */
  chosen?: Partial<Record<MealMoment, string>>;
  /** Recepten die vlak ervoor of erna zelf gekozen zijn: niet automatisch nog eens. */
  avoid?: Set<string>;
  /** Koolhydraatbasis van de zelf gekozen hoofdmaaltijden op de dag ervoor en erna. */
  avoidStaples?: Set<string>;
};

/**
 * Het menu van één dag. Een zelf gekozen recept staat vast, ook buiten het
 * dieetfilter of als "niet voor mij", en de portie past bij het moment waar
 * het staat. De rest kiest automatisch: geen recept dat het lid vlak ervoor of
 * erna zelf koos, en waar het kan geen koolhydraatbasis die die dag of de dag
 * ernaast al op een hoofdmaaltijd staat.
 */
export function dayMenu(
  recipes: Recipe[],
  moments: MealMoment[],
  context: MenuContext,
  options: DayMenuOptions = {},
): MenuSlot[] {
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const chosen = new Map<MealMoment, Recipe>();
  for (const [moment, recipeId] of Object.entries(options.chosen ?? {}) as [MealMoment, string][]) {
    const recipe = byId.get(recipeId);
    if (recipe && choiceMoments(recipe.meal_moment).includes(moment)) chosen.set(moment, recipe);
  }
  const avoid = new Set([...(options.avoid ?? []), ...[...chosen.values()].map((recipe) => recipe.id)]);
  const avoidStaples = options.avoidStaples ?? new Set<string>();

  const usedStaples = new Set<string>();
  for (const [moment, recipe] of chosen) {
    const staple = MAIN_MEALS.has(moment) ? stapleOf(recipe) : null;
    if (staple) usedStaples.add(staple);
  }

  const slots: MenuSlot[] = [];
  const all = MEAL_MOMENTS.filter((moment) => moments.includes(moment) || chosen.has(moment));
  for (const moment of all) {
    const ranked = rankRecipes(recipes, moment, context);
    const own = chosen.get(moment);
    let pick: RankedRecipe | undefined;
    if (own) {
      const placed = { ...own, meal_moment: moment };
      const portion = portionForRider(placed, context.rider);
      pick = { recipe: own, portion, traits: portionTraits(portion.ingredients), score: 0 };
    } else {
      const open = ranked.filter((item) => !avoid.has(item.recipe.id));
      const pool = open.length > 0 ? open : ranked;
      const fresh = (blocked: Set<string>) =>
        pool.find((item) => {
          const staple = stapleOf(item.recipe);
          return staple == null || !blocked.has(staple);
        });
      pick = MAIN_MEALS.has(moment)
        ? (fresh(new Set([...usedStaples, ...avoidStaples])) ?? fresh(usedStaples) ?? pool[0])
        : pool[0];
      if (pick && MAIN_MEALS.has(moment)) {
        const staple = stapleOf(pick.recipe);
        if (staple) usedStaples.add(staple);
      }
    }
    if (!pick) continue;

    const current = pick.recipe.id;
    const position = ranked.findIndex((item) => item.recipe.id === current);
    const next = ranked[(position + 1) % Math.max(ranked.length, 1)];
    slots.push({
      ...pick,
      moment,
      choices: ranked.length,
      chosen: Boolean(own),
      nextRecipeId: next && next.recipe.id !== current ? next.recipe.id : null,
    });
  }
  return slots;
}

/** Momenten waarvan de portie mee kan groeien als er vandaag nog iets bij moet. */
const TOP_UP_MOMENTS = new Set<MealMoment>(["ontbijt", "lunch", "diner", "tussendoor"]);

export type TopUpInput = {
  /** Wat er vandaag al is vastgelegd (Naleving). */
  eaten: { carbsG: number; proteinG: number };
  /** Momenten waar al iets bij staat; die tellen als gegeten. */
  eatenMoments: Set<MealMoment>;
  /** De ondergrens van de dag; null zonder gewicht. */
  floor: { carbsG: number | null; proteinG: number | null };
  energyFactor: number;
};

/**
 * Het menu dat meerekent met wat er al gegeten is (Naleving; zonder Naleving is
 * dat niets, en dan vult het menu zichzelf aan). Haalt wat er gegeten is plus
 * de rest van het menu de onderkant van de dag niet, dan groeien de porties van
 * de hoofdmaaltijden en het tussendoortje die nog komen, naar rato. Nooit
 * kleiner dan normaal: een menu dat om minder eten vraagt, past niet bij de
 * ondergrens (docs/naleving-voeding-plan.md, §6). Groter dan twee keer de
 * gewone portie wordt het niet (scale.ts).
 */
export function topUpMenu(slots: MenuSlot[], input: TopUpInput): MenuSlot[] {
  const open = slots.filter((slot) => TOP_UP_MOMENTS.has(slot.moment) && !input.eatenMoments.has(slot.moment));
  if (open.length === 0) return slots;
  const planned = (key: "carbsG" | "proteinG") =>
    slots
      .filter((slot) => !input.eatenMoments.has(slot.moment))
      .reduce((total, slot) => total + slot.portion.perPortion[key], 0);
  const short = (key: "carbsG" | "proteinG") => {
    const floor = input.floor[key];
    return floor == null ? 0 : Math.max(0, floor - input.eaten[key] - planned(key));
  };
  const carbShort = short("carbsG");
  const proteinShort = short("proteinG");
  if (carbShort === 0 && proteinShort === 0) return slots;

  const share = (key: "carbsG" | "proteinG", slot: MenuSlot) => {
    const total = open.reduce((sum, item) => sum + item.portion.perPortion[key], 0);
    return total > 0 ? slot.portion.perPortion[key] / total : 1 / open.length;
  };
  return slots.map((slot) => {
    if (!open.includes(slot)) return slot;
    const { ingredients, factors } = slot.portion;
    // Alleen erbij: de koolhydraatbron groeit voor koolhydraten, de eiwitbron
    // voor eiwit, de rest blijft. Zo wordt geen onderdeel kleiner.
    const contribution = (role: "kh_bron" | "eiwit_bron", key: "carbs_g" | "protein_g") =>
      ingredients
        .filter((item) => item.role === role)
        .reduce((total, item) => total + (Number(item.food[key] ?? 0) * item.grams) / 100, 0);
    const grow = (role: "kh_bron" | "eiwit_bron", key: "carbs_g" | "protein_g", extra: number) => {
      const base = contribution(role, key);
      if (extra <= 0 || base <= 0) return 1;
      // Niet voorbij twee keer de gewone portie (SCALE_MAX in scale.ts).
      return Math.min(1 + extra / base, SCALE_MAX / Math.max(factors[role], 1e-6));
    };
    const multiplier: Record<IngredientRole, number> = {
      kh_bron: grow("kh_bron", "carbs_g", carbShort * share("carbsG", slot)),
      eiwit_bron: grow("eiwit_bron", "protein_g", proteinShort * share("proteinG", slot)),
      vast: 1,
    };
    if (multiplier.kh_bron <= 1 && multiplier.eiwit_bron <= 1) return slot;
    const grown = ingredients.map((item) =>
      multiplier[item.role] > 1 ? { ...item, grams: roundGrams(item.grams * multiplier[item.role]) } : item,
    );
    const portion: ScaledRecipe = {
      factors: {
        kh_bron: Math.round(factors.kh_bron * multiplier.kh_bron * 100) / 100,
        eiwit_bron: Math.round(factors.eiwit_bron * multiplier.eiwit_bron * 100) / 100,
        vast: factors.vast,
      },
      ingredients: grown,
      perPortion: macrosFor(grown),
    };
    return { ...slot, portion, toppedUp: true };
  });
}
