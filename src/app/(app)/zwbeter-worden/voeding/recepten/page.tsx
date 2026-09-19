import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { DIET_TAGS, DIET_TAG_LABELS, matchesDiet, portionForRider, type DietTag } from "@/lib/nutrition/recipes";
import { MEAL_MOMENTS, MEAL_MOMENT_LABELS, type MealMoment } from "@/lib/nutrition/targets";
import { nutritionDay } from "@/lib/nutrition/tips";
import {
  energyFactorFor,
  loadNutritionDayInput,
  loadNutritionProfile,
  loadRecipes,
  requireViewer,
  todayKeyAmsterdam,
} from "../_data";
import { RecipeCard } from "../_components/recipe-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Search = { moment?: string | string[]; dieet?: string | string[] };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function chipClass(active: boolean) {
  return `inline-flex min-h-[36px] items-center rounded-full border px-3 text-sm ${
    active ? "border-primary bg-primary/10 font-medium text-primary" : "hover:border-primary"
  }`;
}

export default async function RecipesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const momentParam = one(params.moment);
  const dietParam = one(params.dieet);
  const moment = (MEAL_MOMENTS as readonly string[]).includes(momentParam ?? "")
    ? (momentParam as MealMoment)
    : null;
  // Het dieetfilter staat alleen in de URL en wordt nergens bewaard: een
  // voorkeur als "glutenvrij" kan iets over iemands gezondheid zeggen.
  const diet = (DIET_TAGS as readonly string[]).includes(dietParam ?? "") ? (dietParam as DietTag) : null;

  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();
  const [profile, recipes] = await Promise.all([
    loadNutritionProfile(viewer, today),
    loadRecipes(viewer),
  ]);
  const day = nutritionDay(await loadNutritionDayInput(viewer, today, profile.weightKg));
  const rider = {
    weightKg: profile.weightKg,
    energyFactor: energyFactorFor(profile),
    dayType: day.dayType,
    rideMinutes: day.rideMinutes,
  };

  const href = (next: { moment?: MealMoment | null; dieet?: DietTag | null }) => {
    const query = new URLSearchParams();
    const m = next.moment === undefined ? moment : next.moment;
    const d = next.dieet === undefined ? diet : next.dieet;
    if (m) query.set("moment", m);
    if (d) query.set("dieet", d);
    const text = query.toString();
    return `/zwbeter-worden/voeding/recepten${text ? `?${text}` : ""}`;
  };

  const shown = recipes.filter(
    (recipe) => (moment == null || recipe.meal_moment === moment) && matchesDiet(recipe, diet),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/zwbeter-worden/voeding"
            className="inline-flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground hover:underline"
          >
            <ArrowLeft className="size-4" />
            Voeding
          </Link>
          <h2 className="mt-1 text-xl font-semibold">Recepten</h2>
        </div>
        <Link
          href="/zwbeter-worden/voeding/recepten/nieuw"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md border px-3 text-sm font-medium hover:border-primary"
        >
          <Plus className="size-4" />
          Eigen recept
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Link href={href({ moment: null })} className={chipClass(moment == null)}>
            Alle momenten
          </Link>
          {MEAL_MOMENTS.map((value) => (
            <Link key={value} href={href({ moment: value })} className={chipClass(moment === value)}>
              {MEAL_MOMENT_LABELS[value]}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {DIET_TAGS.map((value) => (
            <Link
              key={value}
              href={href({ dieet: diet === value ? null : value })}
              className={chipClass(diet === value)}
            >
              {DIET_TAG_LABELS[value]}
            </Link>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Geen recepten met deze filters.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} portion={portionForRider(recipe, rider).perPortion} />
          ))}
        </div>
      )}
    </div>
  );
}
