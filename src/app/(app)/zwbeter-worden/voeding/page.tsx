import Link from "next/link";
import { Beef, Bike, CalendarDays, Check, RefreshCw, Wheat } from "lucide-react";
import { FUEL_DAY_LABELS } from "@/lib/nutrition/day-type";
import { dayTotals, floorStatus } from "@/lib/nutrition/log";
import { DIET_TAGS, DIET_TAG_LABELS, type DietTag } from "@/lib/nutrition/recipes";
import {
  DAY_MOMENTS,
  RIDE_MOMENTS,
  dayMenu,
  menuMoments,
  topUpMenu,
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
  loadLogSettings,
  loadLoggedMeals,
  loadNutritionProfile,
  loadRecipePrefs,
  loadRecipes,
  requireViewer,
  todayKeyAmsterdam,
} from "./_data";
import { logRecipe } from "./_log-actions";
import { LogActionButton } from "./_components/log-controls";
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

  const [profile, recipes, prefs, logSettings] = await Promise.all([
    loadNutritionProfile(viewer, today),
    loadRecipes(viewer),
    loadRecipePrefs(viewer),
    loadLogSettings(viewer),
  ]);
  // Alleen wie Naleving aan heeft staan, kan een recept als gegeten afvinken.
  const logging = logSettings != null && !logSettings.paused;
  const todayMeals = logging ? await loadLoggedMeals(viewer, today, today) : [];
  const eatenMoments = new Set(todayMeals.map((meal) => meal.moment));
  const eatenTotals = dayTotals(todayMeals);
  const input = await loadNutritionDayInput(viewer, today, profile.weightKg);

  const day = nutritionDay(input);
  const tip = nutritionTipForToday(input);
  const baseMenu = dayMenu(
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
  // Met Naleving aan rekent het menu mee: wat nog komt, groeit als er vandaag
  // anders te weinig in zit. Nooit kleiner.
  const menu =
    todayMeals.length > 0
      ? topUpMenu(baseMenu, {
          eaten: eatenTotals,
          eatenMoments,
          floor: { carbsG: day.carbs?.min ?? null, proteinG: day.protein?.min ?? null },
          energyFactor: energyFactorFor(profile),
        })
      : baseMenu;
  const carbsLeft = floorStatus(eatenTotals.carbsG, day.carbs);
  const proteinLeft = floorStatus(eatenTotals.proteinG, day.protein);

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
          {slot.toppedUp && <span className="ml-2 normal-case tracking-normal text-primary">Grotere portie</span>}
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
      {logging &&
        (eatenMoments.has(slot.moment) ? (
          <p className="flex min-h-[36px] items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3.5" />
            Gegeten
          </p>
        ) : (
          <LogActionButton
            action={logRecipe}
            fields={{
              slug: slot.recipe.slug,
              moment: slot.moment,
              day: today,
              // Precies de portie die hier staat, ook als die is vergroot.
              items: JSON.stringify(
                slot.portion.ingredients
                  .filter((item) => item.grams > 0)
                  .map((item) => ({ food_id: item.food.id, grams: item.grams })),
              ),
            }}
            size="sm"
          >
            <Check className="size-4" />
            Gegeten
          </LogActionButton>
        ))}
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
        {todayMeals.length > 0 && carbsLeft.floorG != null && (
          <p className="text-sm text-muted-foreground">
            {carbsLeft.reached && proteinLeft.reached
              ? "Je minimum voor vandaag is gehaald."
              : `Nog ${carbsLeft.remainingG} g koolhydraten en ${proteinLeft.remainingG} g eiwit tot je minimum.`}
          </p>
        )}
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
