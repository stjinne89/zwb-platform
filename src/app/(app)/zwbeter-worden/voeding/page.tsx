import Link from "next/link";
import { Beef, BookOpen, Bike, CalendarDays, ChevronRight, Plus, Wheat } from "lucide-react";
import { FUEL_DAY_LABELS } from "@/lib/nutrition/day-type";
import {
  NUTRITION_CATEGORY_LABELS,
  articlesByCategory,
} from "@/lib/nutrition/library";
import { pickRecipes, portionForRider } from "@/lib/nutrition/recipes";
import { nutritionDay, nutritionTipForToday } from "@/lib/nutrition/tips";
import type { Range } from "@/lib/nutrition/targets";
import { MetricCard } from "../_components/ui";
import {
  energyFactorFor,
  loadNutritionDayInput,
  loadNutritionProfile,
  loadRecipes,
  requireViewer,
  todayKeyAmsterdam,
} from "./_data";
import { NutritionTip } from "./_components/nutrition-tip";
import { RecipeCard } from "./_components/recipe-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function range(value: Range | null, unit: string, fallback: string) {
  if (!value) return fallback;
  return `${value.min}–${value.max} ${unit}`;
}

export default async function VoedingPage() {
  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();

  const [profile, recipes] = await Promise.all([
    loadNutritionProfile(viewer, today),
    loadRecipes(viewer),
  ]);
  const input = await loadNutritionDayInput(viewer, today, profile.weightKg);

  const day = nutritionDay(input);
  const tip = nutritionTipForToday(input);
  const suggestions = pickRecipes(recipes, tip, today, 3);
  const rider = {
    weightKg: profile.weightKg,
    energyFactor: energyFactorFor(profile),
    dayType: day.dayType,
    rideMinutes: day.rideMinutes,
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={CalendarDays}
          label="Vandaag"
          value={FUEL_DAY_LABELS[day.dayType]}
          hint={`Morgen: ${FUEL_DAY_LABELS[day.tomorrowType].toLowerCase()}`}
        />
        <MetricCard
          icon={Wheat}
          label="Koolhydraten"
          value={range(day.carbs, "g", "-")}
          hint={day.carbs ? undefined : "Per kg lichaamsgewicht"}
        />
        <MetricCard
          icon={Beef}
          label="Eiwit"
          value={range(day.protein, "g", "-")}
          hint={day.protein ? undefined : "1,6–1,8 g per kg"}
        />
        <MetricCard
          icon={Bike}
          label="Onderweg"
          value={range(day.rideCarbsPerHour, "g/u", "-")}
          hint={day.rideCarbsPerHour ? "Koolhydraten per uur" : undefined}
        />
      </section>

      {!profile.weightKg && (
        <p className="text-sm">
          <Link href="/profiel" className="font-medium text-primary hover:underline">
            Vul je gewicht in
          </Link>{" "}
          <span className="text-muted-foreground">voor doelen en porties in grammen.</span>
        </p>
      )}

      <NutritionTip tip={tip} recipe={null} />

      {suggestions.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Recepten voor vandaag</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestions.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                portion={portionForRider(recipe, rider).perPortion}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link
              href="/zwbeter-worden/voeding/recepten"
              className="inline-flex min-h-[44px] items-center gap-1 font-medium text-primary hover:underline"
            >
              Alle recepten
              <ChevronRight className="size-4" />
            </Link>
            <Link
              href="/zwbeter-worden/voeding/recepten/nieuw"
              className="inline-flex min-h-[44px] items-center gap-1 text-muted-foreground hover:underline"
            >
              <Plus className="size-4" />
              Eigen recept
            </Link>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <BookOpen className="size-5 text-primary" />
          Kennisbank
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {articlesByCategory().map(({ category, articles }) => (
            <div key={category} className="rounded-lg border bg-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {NUTRITION_CATEGORY_LABELS[category]}
              </h3>
              <ul className="mt-2 divide-y">
                {articles.map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={`/zwbeter-worden/voeding/kennis/${article.slug}`}
                      className="flex min-h-[44px] items-center justify-between gap-3 text-sm hover:text-primary"
                    >
                      {article.title}
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Link
        href="/hulp#voeding"
        className="inline-flex min-h-[44px] items-center text-sm text-muted-foreground hover:underline"
      >
        Hoe dit werkt
      </Link>
    </div>
  );
}
