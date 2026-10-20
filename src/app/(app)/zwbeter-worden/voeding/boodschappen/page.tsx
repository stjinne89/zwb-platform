import Link from "next/link";
import { RefreshCw, Users } from "lucide-react";
import { shiftDayKey } from "@/lib/training/mobility";
import { FUEL_DAY_LABELS } from "@/lib/nutrition/day-type";
import { DIET_TAGS, DIET_TAG_LABELS, type DietTag } from "@/lib/nutrition/recipes";
import { dayMenu, menuMoments, type MenuSlot } from "@/lib/nutrition/menu";
import {
  PLAN_DAYS_MAX,
  householdSize,
  parseDaySwaps,
  serializeDaySwaps,
  shoppingList,
  withDaySwap,
  type DaySwaps,
  type Household,
} from "@/lib/nutrition/shopping";
import { nutritionDay } from "@/lib/nutrition/tips";
import { MEAL_MOMENT_LABELS } from "@/lib/nutrition/targets";
import {
  energyFactorFor,
  loadHousehold,
  loadNutritionDayInputs,
  loadNutritionProfile,
  loadRecipePrefs,
  loadRecipes,
  requireViewer,
  todayKeyAmsterdam,
} from "../_data";
import { ShoppingList } from "../_components/shopping-list";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Search = {
  dagen?: string | string[];
  vanaf?: string | string[];
  wissel?: string | string[];
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
  const swaps = parseDaySwaps(one(params.wissel));
  const dietParam = one(params.dieet);
  const diet = (DIET_TAGS as readonly string[]).includes(dietParam ?? "") ? (dietParam as DietTag) : null;

  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();
  const first = shiftDayKey(today, start === "morgen" ? 1 : 0);
  const days = Array.from({ length: dayCount }, (_, index) => shiftDayKey(first, index));

  const [profile, recipes, prefs, household] = await Promise.all([
    loadNutritionProfile(viewer, today),
    loadRecipes(viewer),
    loadRecipePrefs(viewer),
    loadHousehold(viewer),
  ]);
  const inputs = await loadNutritionDayInputs(viewer, days, profile.weightKg);
  const energyFactor = energyFactorFor(profile);

  // Per dag precies het menu dat het Dagmenu die dag toont, plus de eigen keuzes hier.
  const plan = days.map((day, index) => {
    const input = inputs.get(day)!;
    const nutrition = nutritionDay(input);
    const slots = dayMenu(
      recipes,
      menuMoments(input, nutrition),
      {
        rider: {
          weightKg: profile.weightKg,
          energyFactor,
          dayType: nutrition.dayType,
          rideMinutes: nutrition.rideMinutes,
        },
        dayType: nutrition.dayType,
        tomorrowType: nutrition.tomorrowType,
        today: day,
        prefs,
        diet,
      },
      swaps.get(index) ?? {},
    );
    return { day, index, dayType: nutrition.dayType, slots };
  });
  const items = shoppingList(
    plan.flatMap((entry) => entry.slots),
    household,
  );

  const href = (next: { dagen?: number; vanaf?: Start; swaps?: DaySwaps; dieet?: DietTag | null }) => {
    const query = new URLSearchParams();
    const dagen = next.dagen ?? dayCount;
    const vanaf = next.vanaf ?? start;
    const wissel = serializeDaySwaps(next.swaps ?? swaps);
    const dieet = next.dieet === undefined ? diet : next.dieet;
    if (dagen !== DEFAULT_DAYS) query.set("dagen", String(dagen));
    if (vanaf !== "vandaag") query.set("vanaf", vanaf);
    if (wissel) query.set("wissel", wissel);
    if (dieet) query.set("dieet", dieet);
    const text = query.toString();
    return `/zwbeter-worden/voeding/boodschappen${text ? `?${text}` : ""}`;
  };

  const slotRow = (index: number, slot: MenuSlot) => (
    <li key={slot.moment} className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{MEAL_MOMENT_LABELS[slot.moment]}</p>
        <Link
          href={`/zwbeter-worden/voeding/recepten/${slot.recipe.slug}`}
          className="text-sm font-medium hover:text-primary hover:underline"
        >
          {slot.recipe.title}
        </Link>
      </div>
      {slot.choices > 1 && (
        <Link
          href={href({ swaps: withDaySwap(swaps, index, slot.moment, slot.index + 1) })}
          scroll={false}
          aria-label={`Ander recept voor ${MEAL_MOMENT_LABELS[slot.moment].toLowerCase()}`}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-primary"
        >
          <RefreshCw className="size-4" />
        </Link>
      )}
    </li>
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {START_CHOICES.map((choice) => (
            <Link
              key={choice.value}
              href={href({ vanaf: choice.value, swaps: new Map() })}
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
                href={href({ dieet: diet === value ? null : value, swaps: new Map() })}
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
                <ul className="mt-2 divide-y">{entry.slots.map((slot) => slotRow(entry.index, slot))}</ul>
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
