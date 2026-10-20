import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Undo2 } from "lucide-react";
import { BackLink } from "@/components/app-ui";
import { shiftDayKey } from "@/lib/training/mobility";
import { choiceMoments, rankRecipes, type RankedRecipe } from "@/lib/nutrition/menu";
import { CHOICE_DAYS_AHEAD } from "@/lib/nutrition/plan";
import { MEAL_MOMENTS, MEAL_MOMENT_LABELS, type MealMoment } from "@/lib/nutrition/targets";
import { nutritionDay } from "@/lib/nutrition/tips";
import {
  energyFactorFor,
  loadMenuChoices,
  loadNutritionDayInputs,
  loadNutritionProfile,
  loadRecipePrefs,
  loadRecipes,
  requireViewer,
  todayKeyAmsterdam,
} from "../_data";
import { LogActionButton } from "../_components/log-controls";
import { chooseMenuRecipe, clearMenuChoice } from "../_menu-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Search = { dag?: string | string[]; moment?: string | string[]; terug?: string | string[] };

const BACK = /^\/zwbeter-worden\/voeding(\/boodschappen)?(\?[\w=&%.,-]*)?$/;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dayLabel(day: string, today: string) {
  if (day === today) return "vandaag";
  if (day === shiftDayKey(today, 1)) return "morgen";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export default async function KiezenPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();

  const day = one(params.dag) ?? "";
  const momentParam = one(params.moment) ?? "";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    day < today ||
    day > shiftDayKey(today, CHOICE_DAYS_AHEAD) ||
    !(MEAL_MOMENTS as readonly string[]).includes(momentParam)
  ) {
    notFound();
  }
  const moment = momentParam as MealMoment;
  const backParam = one(params.terug) ?? "";
  const back = BACK.test(backParam) ? backParam : "/zwbeter-worden/voeding";

  const [profile, recipes, prefs, choices] = await Promise.all([
    loadNutritionProfile(viewer, today),
    loadRecipes(viewer),
    loadRecipePrefs(viewer),
    loadMenuChoices(viewer, day, day),
  ]);
  const input = (await loadNutritionDayInputs(viewer, [day], profile.weightKg)).get(day)!;
  const nutrition = nutritionDay(input);
  const context = {
    rider: {
      weightKg: profile.weightKg,
      energyFactor: energyFactorFor(profile),
      dayType: nutrition.dayType,
      rideMinutes: nutrition.rideMinutes,
    },
    dayType: nutrition.dayType,
    tomorrowType: nutrition.tomorrowType,
    today: day,
    prefs,
    diet: null,
  };
  // Best passend eerst; bij lunch en diner daarna de recepten van het andere moment.
  const ranked = choiceMoments(moment).flatMap((item) => rankRecipes(recipes, item, context));
  const current = choices.find((choice) => choice.moment === moment)?.recipeId ?? null;
  const own = ranked.filter((item) => item.recipe.owner_id === viewer.user.id);
  const club = ranked.filter((item) => item.recipe.owner_id !== viewer.user.id);

  const row = (item: RankedRecipe) => (
    <li key={item.recipe.id} className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <Link
          href={`/zwbeter-worden/voeding/recepten/${item.recipe.slug}`}
          className="text-sm font-medium hover:text-primary hover:underline"
        >
          {item.recipe.title}
        </Link>
        <p className="text-xs text-muted-foreground">
          {[
            item.recipe.meal_moment !== moment ? MEAL_MOMENT_LABELS[item.recipe.meal_moment] : null,
            item.recipe.prep_minutes ? `${item.recipe.prep_minutes} min` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {item.recipe.id === current ? (
        <span className="inline-flex min-h-[36px] items-center gap-1 text-sm text-primary">
          <Check className="size-4" />
          Gekozen
        </span>
      ) : (
        <LogActionButton
          action={chooseMenuRecipe}
          fields={{ day, moment, recipe_id: item.recipe.id, terug: back }}
          size="sm"
        >
          Kies
        </LogActionButton>
      )}
    </li>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <BackLink href={back} label="Terug" />
          <h2 className="mt-1 text-xl font-semibold">
            {MEAL_MOMENT_LABELS[moment]}, {dayLabel(day, today)}
          </h2>
        </div>
        {current && (
          <LogActionButton action={clearMenuChoice} fields={{ day, moment, terug: back }} size="sm">
            <Undo2 className="size-4" />
            Terug naar voorstel
          </LogActionButton>
        )}
      </div>

      {own.length > 0 && (
        <section className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold">Jouw recepten</h3>
          <ul className="mt-1 divide-y">{own.map(row)}</ul>
        </section>
      )}

      <section className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold">Clubrecepten</h3>
        {club.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Geen recepten voor dit moment.</p>
        ) : (
          <ul className="mt-1 divide-y">{club.map(row)}</ul>
        )}
      </section>

      <Link
        href="/zwbeter-worden/voeding/recepten/nieuw"
        className="inline-flex min-h-[44px] items-center text-sm text-primary hover:underline"
      >
        Eigen recept maken
      </Link>
    </div>
  );
}
