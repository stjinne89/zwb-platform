import Link from "next/link";
import { BookOpen, RefreshCw, Undo2, Users } from "lucide-react";
import { shiftDayKey } from "@/lib/training/mobility";
import { FUEL_DAY_LABELS } from "@/lib/nutrition/day-type";
import { DIET_TAGS, DIET_TAG_LABELS, type DietTag } from "@/lib/nutrition/recipes";
import type { MenuSlot } from "@/lib/nutrition/menu";
import { choiceWindow, planDayMenu } from "@/lib/nutrition/plan";
import { PLAN_DAYS_MAX, householdSize, shoppingList, type Household } from "@/lib/nutrition/shopping";
import { MEAL_MOMENT_LABELS } from "@/lib/nutrition/targets";
import {
  energyFactorFor,
  loadHousehold,
  loadMenuChoices,
  loadNutritionDayInputs,
  loadNutritionProfile,
  loadRecipePrefs,
  loadRecipes,
  requireViewer,
  todayKeyAmsterdam,
} from "../_data";
import { ShoppingList } from "../_components/shopping-list";
import { LogActionButton } from "../_components/log-controls";
import { chooseMenuRecipe, clearMenuChoice } from "../_menu-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Search = {
  dagen?: string | string[];
  vanaf?: string | string[];
  dieet?: string | string[];
};

const START_CHOICES = [
  { value: "vandaag", label: "Vandaag", shift: 0 },
  { value: "morgen", label: "Morgen", shift: 1 },
] as const;
type Start = (typeof START_CHOICES)[number]["value"];

const DEFAULT_DAYS = 3;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function chipClass(active: boolean) {
  return `inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full border px-3 text-sm ${
    active ? "border-primary bg-primary/10 font-medium text-primary" : "hover:border-primary"
  }`;
}

function dayLabel(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function householdLine(household: Household) {
  const size = householdSize(household);
  if (size === 1 || household.moments.length === 0) return "Voor jou";
  const moments = household.moments.map((moment) => MEAL_MOMENT_LABELS[moment].toLowerCase());
  const list = moments.length === 1 ? moments[0] : `${moments.slice(0, -1).join(", ")} en ${moments.at(-1)}`;
  return `${size} personen bij ${list}`;
}

export default async function BoodschappenPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const requestedDays = Number(one(params.dagen));
  const dayCount =
    Number.isInteger(requestedDays) && requestedDays >= 1 && requestedDays <= PLAN_DAYS_MAX
      ? requestedDays
      : DEFAULT_DAYS;
  const start: Start = one(params.vanaf) === "morgen" ? "morgen" : "vandaag";
  const dietParam = one(params.dieet);
  const diet = (DIET_TAGS as readonly string[]).includes(dietParam ?? "") ? (dietParam as DietTag) : null;

  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();
  const first = shiftDayKey(today, start === "morgen" ? 1 : 0);
  const days = Array.from({ length: dayCount }, (_, index) => shiftDayKey(first, index));

  const nearby = choiceWindow(days[0], days[days.length - 1]);
  const [profile, recipes, prefs, household, choices] = await Promise.all([
    loadNutritionProfile(viewer, today),
    loadRecipes(viewer),
    loadRecipePrefs(viewer),
    loadHousehold(viewer),
    loadMenuChoices(viewer, nearby.from, nearby.to),
  ]);
  const inputs = await loadNutritionDayInputs(viewer, days, profile.weightKg);
  const energyFactor = energyFactorFor(profile);

  // Per dag precies het menu dat het Dagmenu die dag toont: dezelfde keuzes,
  // dezelfde aanvulling tot het minimum (zonder wat er vandaag al gegeten is).
  const plan = days.map((day) => {
    const { nutrition, slots } = planDayMenu({
      recipes,
      input: inputs.get(day)!,
      energyFactor,
      prefs,
      diet,
      choices,
    });
    return { day, dayType: nutrition.dayType, slots };
  });
  const items = shoppingList(
    plan.flatMap((entry) => entry.slots),
    household,
  );

  const href = (next: { dagen?: number; vanaf?: Start; dieet?: DietTag | null }) => {
    const query = new URLSearchParams();
    const dagen = next.dagen ?? dayCount;
    const vanaf = next.vanaf ?? start;
    const dieet = next.dieet === undefined ? diet : next.dieet;
    if (dagen !== DEFAULT_DAYS) query.set("dagen", String(dagen));
    if (vanaf !== "vandaag") query.set("vanaf", vanaf);
    if (dieet) query.set("dieet", dieet);
    const text = query.toString();
    return `/zwbeter-worden/voeding/boodschappen${text ? `?${text}` : ""}`;
  };

  const slotRow = (day: string, slot: MenuSlot) => (
    <li key={slot.moment} className="flex items-start justify-between gap-2 py-1.5">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          {MEAL_MOMENT_LABELS[slot.moment]}
          {slot.chosen && <span className="ml-1.5 text-primary">Gekozen</span>}
        </p>
        <Link
          href={`/zwbeter-worden/voeding/recepten/${slot.recipe.slug}`}
          className="text-sm font-medium hover:text-primary hover:underline"
        >
          {slot.recipe.title}
        </Link>
      </div>
      <div className="flex shrink-0 items-center">
        {slot.chosen && (
          <LogActionButton
            action={clearMenuChoice}
            fields={{ day, moment: slot.moment }}
            variant="ghost"
            size="sm"
            ariaLabel={`${MEAL_MOMENT_LABELS[slot.moment]}: terug naar voorstel`}
          >
            <Undo2 className="size-4" />
          </LogActionButton>
        )}
        {slot.nextRecipeId && (
          <LogActionButton
            action={chooseMenuRecipe}
            fields={{ day, moment: slot.moment, recipe_id: slot.nextRecipeId }}
            variant="ghost"
            size="sm"
            ariaLabel={`Ander recept voor ${MEAL_MOMENT_LABELS[slot.moment].toLowerCase()}`}
          >
            <RefreshCw className="size-4" />
          </LogActionButton>
        )}
        <Link
          href={`/zwbeter-worden/voeding/kiezen?dag=${day}&moment=${slot.moment}&terug=${encodeURIComponent(href({}))}`}
          aria-label={`${MEAL_MOMENT_LABELS[slot.moment]}: recept kiezen`}
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:text-primary"
        >
          <BookOpen className="size-4" />
        </Link>
      </div>
    </li>
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {START_CHOICES.map((choice) => (
            <Link
              key={choice.value}
              href={href({ vanaf: choice.value })}
              scroll={false}
              className={chipClass(start === choice.value)}
            >
              {choice.label}
            </Link>
          ))}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          {Array.from({ length: PLAN_DAYS_MAX }, (_, index) => index + 1).map((count) => (
            <Link
              key={count}
              href={href({ dagen: count })}
              scroll={false}
              aria-label={`${count} ${count === 1 ? "dag" : "dagen"}`}
              className={chipClass(dayCount === count)}
            >
              {count}
            </Link>
          ))}
          <span className="text-sm text-muted-foreground">{dayCount === 1 ? "dag" : "dagen"}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/profiel?weergave=bewerken#gezin"
            className="inline-flex min-h-[36px] items-center gap-2 text-sm hover:text-primary"
          >
            <Users className="size-4 text-primary" />
            {householdLine(household)}
          </Link>
          <div className="flex flex-wrap gap-2">
            {DIET_TAGS.map((value) => (
              <Link
                key={value}
                href={href({ dieet: diet === value ? null : value })}
                scroll={false}
                className={chipClass(diet === value)}
              >
                {DIET_TAG_LABELS[value]}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="grid gap-3 sm:grid-cols-2">
          {plan.map((entry) => (
            <article key={entry.day} className="rounded-lg border bg-card p-4">
              <h2 className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{entry.day === today ? "Vandaag" : dayLabel(entry.day)}</span>
                <span className="text-xs text-muted-foreground">{FUEL_DAY_LABELS[entry.dayType]}</span>
              </h2>
              {entry.slots.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Geen recepten met dit filter.</p>
              ) : (
                <ul className="mt-2 divide-y">{entry.slots.map((slot) => slotRow(entry.day, slot))}</ul>
              )}
            </article>
          ))}
        </section>

        <ShoppingList
          key={items.map((item) => `${item.id}:${item.amount}`).join("|")}
          title={
            dayCount === 1
              ? `Boodschappen ${dayLabel(first)}`
              : `Boodschappen ${dayLabel(first)} t/m ${dayLabel(days[days.length - 1])}`
          }
          items={items.map(({ id, name, amount, department, pantry }) => ({ id, name, amount, department, pantry }))}
        />
      </div>
    </div>
  );
}
