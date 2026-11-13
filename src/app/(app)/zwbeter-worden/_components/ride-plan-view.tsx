"use client";

import { Fragment, useEffect, useId, useState, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { Bike, Check } from "lucide-react";
import {
  BIDON_SIZES,
  formatRideMinute,
  ridePlanMeals,
  sameHolders,
  type BidonHolders,
  type BidonMl,
  type RidePlan,
  type RidePlanBidon,
  type RidePlanIngredient,
  type RidePlanItem,
} from "@/lib/nutrition/ride-plan";
import { scoopsLabel } from "@/lib/nutrition/scoops";
import { LogActionButton } from "../voeding/_components/log-controls";
import { BidonChoice, BidonIcon } from "./bidon-icon";
import { EventFuelControls, useEventFuelPlan } from "./event-fuel-planner";
import type { EventFuelPlanner } from "@/lib/nutrition/event-planner";
import { bidonGroupClass, bidonLabel, bidonOptionClass } from "./bidon-options";

// Het ritplan bij een training: wat je klaarzet en wanneer je het neemt
// (src/lib/nutrition/ride-plan.ts). De maat in elk van de twee bidonhouders
// kies je hier; die keuze geldt alleen voor deze weergave.

function amount(value: number, unit: "g" | "ml"): string {
  return `${value.toLocaleString("nl-NL")} ${unit}`;
}

function liters(ml: number): string {
  return (ml / 1000).toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function hours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} uur` : `${h}u${String(m).padStart(2, "0")}`;
}

function ingredientText(ingredient: RidePlanIngredient): string {
  const scoops = ingredient.unit === "g" ? scoopsLabel(ingredient.amount, ingredient.scoopG) : null;
  return `${amount(ingredient.amount, ingredient.unit)}${scoops ? ` (${scoops})` : ""} ${ingredient.name}`;
}

/** Hoogstens zoveel bidons naast elkaar; daarboven staat alleen het aantal. */
const MAX_ICONS = 6;

function ItemRow({ item }: { item: RidePlanItem & { ml?: BidonMl } }) {
  const name = item.recipe ? (
    <Link href={`/zwbeter-worden/voeding/recepten/${item.recipe.slug}`} className="hover:text-primary hover:underline">
      {item.recipe.title}
    </Link>
  ) : (
    "Water"
  );
  const unit = item.ml ? "bidon" : "portie";
  return (
    <li className="flex gap-3">
      <span className="flex min-w-7 items-end gap-0.5 self-start">
        {item.ml && item.count <= MAX_ICONS
          ? Array.from({ length: item.count }, (_, index) => (
              <BidonIcon key={index} ml={item.ml!} fill={item.recipe ? "drank" : "water"} />
            ))
          : null}
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm">
          <span className="font-medium tabular-nums">
            {item.count}× {item.ml ? bidonLabel(item.ml) : "portie"}
          </span>
          : {name}
          {item.carbsG > 0 ? (
            <span className="text-muted-foreground">
              {" "}
              · {item.carbsG} g per {unit}
            </span>
          ) : null}
        </p>
        {item.ingredients.length > 0 ? (
          <p className="text-xs text-muted-foreground">{item.ingredients.map(ingredientText).join(", ")}</p>
        ) : null}
      </div>
    </li>
  );
}

const loadDay = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function LoadingLink({ eventId, day }: { eventId: string; day: string }) {
  return (
    <Link
      href={`/zwbeter-worden/voeding/protocollen/koolhydraten-laden?event=${eventId}`}
      className="inline-flex min-h-[44px] items-center text-sm text-primary hover:underline"
    >
      Koolhydraten laden vanaf {loadDay.format(new Date(`${day}T12:00:00Z`))}
    </Link>
  );
}

/**
 * Op de eventpagina en in de briefing: het plan met de knop en de schuifjes
 * (docs/eventvoeding-plan.md stap 2), en het laden ervoor als de balans daarom
 * vraagt. Zonder vermogen of planner de oude regel: een lange wedstrijd.
 */
export function EventRidePlan({
  eventId,
  plan,
  loadFrom,
  loadDay: loadDayKey,
  planner,
}: {
  eventId: string;
  plan: RidePlan;
  loadFrom: string | null;
  loadDay?: string;
  planner?: EventFuelPlanner | null;
}) {
  if (!planner) {
    return (
      <div className="space-y-2">
        <RidePlanView plan={plan} />
        {loadFrom ? <LoadingLink eventId={eventId} day={loadFrom} /> : null}
      </div>
    );
  }
  return <PlannedEventRide eventId={eventId} initial={plan} loadFrom={loadFrom} loadDay={loadDayKey ?? loadFrom} planner={planner} />;
}

function PlannedEventRide({
  eventId,
  initial,
  loadFrom,
  loadDay: loadDayKey,
  planner,
}: {
  eventId: string;
  initial: RidePlan;
  loadFrom: string | null;
  loadDay: string | null;
  planner: EventFuelPlanner;
}) {
  const { choice, setChoice, result, plan } = useEventFuelPlan(planner);
  const loading = result.advice ? result.advice.loadingHelps : loadFrom != null;
  return (
    <div className="space-y-2">
      <RidePlanView
        plan={plan ?? initial}
        controls={<EventFuelControls planner={planner} choice={choice} setChoice={setChoice} result={result} />}
      />
      {loading && loadDayKey ? <LoadingLink eventId={eventId} day={loadDayKey} /> : null}
    </div>
  );
}

// Terugklikken naar een training toont het plan meteen. De sleutel draagt duur en
// zwaarte mee, zodat een aangepaste training een nieuw plan krijgt; na een minuut
// halen we het toch opnieuw, voor een keuze die elders is veranderd.
const PLAN_TTL_MS = 60_000;
const fetchedPlans = new Map<string, { at: number; plan: Promise<RidePlan | null> }>();

function fetchWorkoutRidePlan(workoutId: string, key: string): Promise<RidePlan | null> {
  const cached = fetchedPlans.get(key);
  if (cached && Date.now() - cached.at < PLAN_TTL_MS) return cached.plan;
  const plan = fetch(`/api/training/workouts/${encodeURIComponent(workoutId)}/ride-plan`, { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : { plan: null }))
    .then((body: { plan?: RidePlan | null }) => body.plan ?? null)
    .catch(() => {
      // Een mislukte poging niet onthouden: bij de volgende klik opnieuw.
      fetchedPlans.delete(key);
      return null;
    });
  fetchedPlans.set(key, { at: Date.now(), plan });
  return plan;
}

/**
 * Het ritplan bij een training in de kalender, opgehaald zodra het detail opent.
 * Zo hoeft het schema niet elk plan van maanden vooruit mee te sturen.
 */
export function WorkoutRidePlan({
  workoutId,
  durationMinutes,
  intensity,
}: {
  workoutId: string;
  durationMinutes: number | null;
  intensity: string | null;
}) {
  const key = `${workoutId}:${durationMinutes ?? ""}:${intensity ?? ""}`;
  const [loaded, setLoaded] = useState<{ key: string; plan: RidePlan | null } | null>(null);
  useEffect(() => {
    let active = true;
    void fetchWorkoutRidePlan(workoutId, key).then((plan) => {
      if (active) setLoaded({ key, plan });
    });
    return () => {
      active = false;
    };
  }, [workoutId, key]);

  if (!loaded || loaded.key !== key) {
    return <div aria-hidden className="h-28 animate-pulse rounded-lg border bg-muted/40" />;
  }
  return loaded.plan ? <RidePlanView key={key} plan={loaded.plan} /> : null;
}

export function RidePlanView({
  plan: initial,
  log,
  controls,
}: {
  plan: RidePlan;
  /** Boven de bidonkeuze, zoals de knop en de schuifjes bij een event. */
  controls?: ReactNode;
  /** "Gegeten" onder het plan: legt de gekozen bidons en porties vast. */
  log?: { action: ComponentProps<typeof LogActionButton>["action"]; day: string };
}) {
  const [holders, setHolders] = useState<BidonHolders>(initial.holders);
  const options = initial.options ?? [initial];
  const plan = options.find((option) => sameHolders(option.holders, holders)) ?? initial;
  const pickerId = useId();
  const choose = (holder: 0 | 1, ml: BidonMl) =>
    setHolders((current) => (holder === 0 ? [ml, current[1]] : [current[0], ml]));
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Bike className="size-4 text-primary" />
          Klaarzetten
        </h4>
        <p className="text-sm tabular-nums text-muted-foreground">
          {hours(plan.minutes)} · {plan.totalG} g koolhydraten
        </p>
      </div>
      {controls}
      {options.length > 1 ? (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
          {([0, 1] as const).map((holder) => (
            <Fragment key={holder}>
              <span id={`${pickerId}-${holder}`} className="text-sm text-muted-foreground">
                Bidon {holder + 1}
              </span>
              <div role="group" aria-labelledby={`${pickerId}-${holder}`} className={bidonGroupClass}>
                {BIDON_SIZES.map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    aria-pressed={plan.holders[holder] === ml}
                    onClick={() => choose(holder, ml)}
                    className={bidonOptionClass(plan.holders[holder] === ml)}
                  >
                    <BidonChoice ml={ml} active={plan.holders[holder] === ml} />
                  </button>
                ))}
              </div>
            </Fragment>
          ))}
        </div>
      ) : null}
      {plan.fluid ? (
        <p className="text-sm">
          Drinken:{" "}
          <span className="tabular-nums">
            {plan.fluid.minMl === plan.fluid.maxMl ? "" : plan.fluid.minMl == null ? "tot " : `${liters(plan.fluid.minMl)}–`}
            {liters(plan.fluid.maxMl)} l per uur
          </span>
        </p>
      ) : (
        <Link href="/zwbeter-worden/voeding/protocollen/zweettest" className="text-sm text-primary hover:underline">
          Zweettest
        </Link>
      )}
      <ul className="space-y-2">
        {plan.bidons.map((item: RidePlanBidon) => (
          <ItemRow key={`${item.recipe?.slug ?? "water"}-${item.ml}`} item={item} />
        ))}
        {plan.solid ? <ItemRow item={plan.solid} /> : null}
      </ul>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Per 20 minuten</summary>
        <ol className="mt-2 divide-y">
          {plan.feeds.map((feed) => (
            <li key={feed.minute} className="flex justify-between gap-3 py-1.5">
              <span className="tabular-nums">{formatRideMinute(feed.minute)}</span>
              <span className="min-w-0 flex-1 text-muted-foreground">
                Bidon {feed.bidon}
                {feed.solid > 0 && plan.solid ? ` + ${feed.solid === 1 ? "1 portie" : `${feed.solid} porties`}` : ""}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{feed.carbsG > 0 ? `${feed.carbsG} g` : ""}</span>
            </li>
          ))}
        </ol>
      </details>
      {log ? (
        <LogActionButton
          action={log.action}
          fields={{ day: log.day, parts: JSON.stringify(ridePlanMeals(plan)) }}
          size="sm"
        >
          <Check className="size-4" />
          Gegeten
        </LogActionButton>
      ) : null}
    </div>
  );
}
