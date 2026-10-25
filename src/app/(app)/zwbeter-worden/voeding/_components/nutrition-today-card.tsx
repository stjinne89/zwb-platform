// De voedingstip op de Vandaag-pagina. Async server component, net als
// CoreTodayCard: de pagina geeft de dag door die ze al heeft (schema, ritten,
// readiness) en de kaart haalt alleen gewicht, lengte en recepten zelf op.

import { nutritionDay, nutritionTipForToday, type NutritionDayInput } from "@/lib/nutrition/tips";
import { rankRecipes } from "@/lib/nutrition/menu";
import { ridePlan } from "@/lib/nutrition/ride-plan";
import { RidePlanView } from "../../_components/ride-plan-view";
import {
  energyFactorFor,
  loadMenuChoices,
  loadNutritionProfile,
  loadRecipePrefs,
  loadRecipes,
  type Viewer,
} from "../_data";
import { NutritionTip } from "./nutrition-tip";

export async function NutritionTodayCard({
  viewer,
  today,
  day,
}: {
  viewer: Viewer;
  today: string;
  day: Omit<NutritionDayInput, "today" | "weightKg">;
}) {
  const [profile, recipes, prefs, choices] = await Promise.all([
    loadNutritionProfile(viewer, today),
    loadRecipes(viewer),
    loadRecipePrefs(viewer),
    loadMenuChoices(viewer, today, today),
  ]);

  const input = { ...day, today, weightKg: profile.weightKg };
  const tip = nutritionTipForToday(input);
  const fuel = nutritionDay(input);
  const energyFactor = energyFactorFor(profile);
  // Dezelfde rangorde als het dagmenu op de voedingspagina.
  const ranked = rankRecipes(recipes, tip.mealMoment, {
    rider: {
      weightKg: profile.weightKg,
      energyFactor,
      dayType: fuel.dayType,
      rideMinutes: fuel.rideMinutes,
      rideIntensity: fuel.rideIntensity,
    },
    dayType: fuel.dayType,
    tomorrowType: fuel.tomorrowType,
    today,
    prefs,
    diet: null,
  });
  const first = ranked[0];

  // Eten onderweg: wat je klaarzet, zoals het dagmenu het toont.
  const chosenId = choices.find((choice) => choice.moment === "tijdens_rit")?.recipeId;
  const chosen = chosenId ? recipes.find((recipe) => recipe.id === chosenId) : undefined;
  const ride =
    tip.kind === "tijdens_rit" && fuel.rideMinutes
      ? ridePlan({
          minutes: fuel.rideMinutes,
          intensity: fuel.rideIntensity,
          ranked: ranked.map((item) => item.recipe),
          lead: chosen ?? first?.recipe ?? null,
          leadChosen: Boolean(chosen),
          energyFactor,
        })
      : null;

  return (
    <>
      <NutritionTip tip={tip} recipe={ride ? null : (first?.recipe ?? null)} titleHref="/zwbeter-worden/voeding" />
      {ride ? <RidePlanView plan={ride} /> : null}
    </>
  );
}
