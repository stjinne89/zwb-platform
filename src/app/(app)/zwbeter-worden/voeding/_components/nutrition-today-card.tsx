// De voedingstip op de Vandaag-pagina. Async server component, net als
// CoreTodayCard: de pagina geeft de dag door die ze al heeft (schema, ritten,
// readiness) en de kaart haalt alleen gewicht, lengte en recepten zelf op.

import { nutritionDay, nutritionTipForToday, type NutritionDayInput } from "@/lib/nutrition/tips";
import { rankRecipes } from "@/lib/nutrition/menu";
import { energyFactorFor, loadNutritionProfile, loadRecipePrefs, loadRecipes, type Viewer } from "../_data";
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
  const [profile, recipes, prefs] = await Promise.all([
    loadNutritionProfile(viewer, today),
    loadRecipes(viewer),
    loadRecipePrefs(viewer),
  ]);

  const input = { ...day, today, weightKg: profile.weightKg };
  const tip = nutritionTipForToday(input);
  const fuel = nutritionDay(input);
  // Dezelfde rangorde als het dagmenu op de voedingspagina.
  const [first] = rankRecipes(recipes, tip.mealMoment, {
    rider: {
      weightKg: profile.weightKg,
      energyFactor: energyFactorFor(profile),
      dayType: fuel.dayType,
      rideMinutes: fuel.rideMinutes,
    },
    dayType: fuel.dayType,
    tomorrowType: fuel.tomorrowType,
    today,
    prefs,
    diet: null,
  });

  return <NutritionTip tip={tip} recipe={first?.recipe ?? null} titleHref="/zwbeter-worden/voeding" />;
}
