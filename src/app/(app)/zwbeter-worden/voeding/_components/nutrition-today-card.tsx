// De voedingstip op de Vandaag-pagina. Async server component, net als
// CoreTodayCard: de pagina geeft de dag door die ze al heeft (schema, ritten,
// readiness) en de kaart haalt alleen gewicht, lengte en recepten zelf op.

import { nutritionTipForToday, type NutritionDayInput } from "@/lib/nutrition/tips";
import { pickRecipes } from "@/lib/nutrition/recipes";
import { loadNutritionProfile, loadRecipes, type Viewer } from "../_data";
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
  const [profile, recipes] = await Promise.all([
    loadNutritionProfile(viewer, today),
    loadRecipes(viewer),
  ]);

  const tip = nutritionTipForToday({ ...day, today, weightKg: profile.weightKg });
  const [recipe] = pickRecipes(recipes, tip, today, 1);

  return <NutritionTip tip={tip} recipe={recipe ?? null} titleHref="/zwbeter-worden/voeding" />;
}
