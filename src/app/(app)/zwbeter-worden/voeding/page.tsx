import Link from "next/link";
import { Beef, BookOpen, Bike, CalendarDays, ChevronRight, Inbox, Plus, RefreshCw, Wheat } from "lucide-react";
import { FUEL_DAY_LABELS } from "@/lib/nutrition/day-type";
import {
  NUTRITION_CATEGORY_LABELS,
  articlesByCategory,
} from "@/lib/nutrition/library";
import { DIET_TAGS, DIET_TAG_LABELS, type DietTag } from "@/lib/nutrition/recipes";
import {
  DAY_MOMENTS,
  RIDE_MOMENTS,
  dayMenu,
  menuMoments,
  parseSwaps,
  serializeSwaps,
  type MenuSlot,
  type MenuSwaps,
} from "@/lib/nutrition/menu";
import { nutritionDay, nutritionTipForToday } from "@/lib/nutrition/tips";
import { MEAL_MOMENT_LABELS, type MealMoment, type Range } from "@/lib/nutrition/targets";
import { MetricCard } from "../_components/ui";
import {
  energyFactorFor,
  loadNutritionDayInput,
  loadNutritionProfile,
  loadProposedRecipes,
  loadRecipePrefs,
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

type Search = { wissel?: string | string[]; dieet?: string | string[] };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function chipClass(active: boolean) {
  return `inline-flex min-h-[36px] items-center rounded-full border px-3 text-sm ${
    active ? "border-primary bg-primary/10 font-medium text-primary" : "hover:border-primary"
  }`;
}

export default async function VoedingPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const swaps = parseSwaps(one(params.wissel));
  // Het dieetfilter staat alleen in de URL en wordt nergens bewaard, zie recepten/page.tsx.
  const dietParam = one(params.dieet);
  const diet = (DIET_TAGS as readonly string[]).includes(dietParam ?? "") ? (dietParam as DietTag) : null;

  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();
  const canReview = viewer.access.has("training.create_plans");

  const [profile, recipes, prefs, proposed] = await Promise.all([
    loadNutritionProfile(viewer, today),
    loadRecipes(viewer),
    loadRecipePrefs(viewer),
    canReview ? loadProposedRecipes(viewer) : Promise.resolve([]),
  ]);
  const input = await loadNutritionDayInput(viewer, today, profile.weightKg);

  const day = nutritionDay(input);
  const tip = nutritionTipForToday(input);
  const menu = dayMenu(
    recipes,
    menuMoments(input, day),
    {
      rider: {
        weightKg: profile.weightKg,
        energyFactor: energyFactorFor(profile),
        dayType: day.dayType,
        rideMinutes: day.rideMinutes,
      },
      dayType: day.dayType,
      tomorrowType: day.tomorrowType,
      today,
      prefs,
      diet,
    },
    swaps,
  );

  const href = (next: { swaps?: MenuSwaps; dieet?: DietTag | null }) => {
    const query = new URLSearchParams();
    const wissel = serializeSwaps(next.swaps ?? swaps);
    const d = next.dieet === undefined ? diet : next.dieet;
    if (wissel) query.set("wissel", wissel);
    if (d) query.set("dieet", d);
    const text = query.toString();
    return `/zwbeter-worden/voeding${text ? `?${text}` : ""}`;
  };

  const slotRow = (slot: MenuSlot) => (
    <li key={slot.moment} className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {MEAL_MOMENT_LABELS[slot.moment]}
        </h3>
        {slot.choices > 1 && (
          <Link
            href={href({ swaps: { ...swaps, [slot.moment]: slot.index + 1 } })}
            scroll={false}
            className="inline-flex min-h-[36px] items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <RefreshCw className="size-3.5" />
            Ander recept
          </Link>
        )}
      </div>
      <RecipeCard
        recipe={slot.recipe}
        portion={slot.portion.perPortion}
        favorite={prefs.get(slot.recipe.id) === "favoriet"}
      />
    </li>
  );
  const group = (moments: MealMoment[]) => menu.filter((slot) => moments.includes(slot.moment));
  const dayPart = group(DAY_MOMENTS);
  const ridePart = group(RIDE_MOMENTS);

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
          hint={day.protein ? undefined : "1,6–2,1 g per kg"}
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

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Je menu voor vandaag</h2>
          <div className="flex flex-wrap gap-2">
            {DIET_TAGS.map((value) => (
              <Link
                key={value}
                href={href({ dieet: diet === value ? null : value, swaps: {} })}
                scroll={false}
                className={chipClass(diet === value)}
              >
                {DIET_TAG_LABELS[value]}
              </Link>
            ))}
          </div>
        </div>

        {menu.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen recepten met dit filter.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <ul className="space-y-3">{dayPart.map(slotRow)}</ul>
            {ridePart.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Bike className="size-4 text-primary" />
                  Rond de rit
                </h3>
                <ul className="space-y-3">{ridePart.map(slotRow)}</ul>
              </div>
            )}
          </div>
        )}

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
          {proposed.length > 0 && (
            <Link
              href="/zwbeter-worden/voeding/recepten/voorstellen"
              className="inline-flex min-h-[44px] items-center gap-1 text-muted-foreground hover:underline"
            >
              <Inbox className="size-4" />
              {proposed.length} {proposed.length === 1 ? "voorstel" : "voorstellen"}
            </Link>
          )}
        </div>
      </section>

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
