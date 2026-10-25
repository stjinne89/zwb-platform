import Link from "next/link";
import { Bike } from "lucide-react";
import { formatRideMinute, type RidePlan, type RidePlanItem } from "@/lib/nutrition/ride-plan";

// Het ritplan bij een training: wat je klaarzet en wanneer je het neemt
// (src/lib/nutrition/ride-plan.ts). Zonder hooks, zodat zowel het dagmenu als
// de kalender hem kunnen tonen.

function amount(value: number, unit: "g" | "ml"): string {
  return `${value.toLocaleString("nl-NL")} ${unit}`;
}

function hours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} uur` : `${h}u${String(m).padStart(2, "0")}`;
}

function ItemRow({ item, kind }: { item: RidePlanItem; kind: "bidon" | "vast" }) {
  const name = item.recipe ? (
    <Link href={`/zwbeter-worden/voeding/recepten/${item.recipe.slug}`} className="hover:text-primary hover:underline">
      {item.recipe.title}
    </Link>
  ) : (
    "Water"
  );
  return (
    <li className="space-y-0.5">
      <p className="text-sm">
        <span className="font-medium tabular-nums">{item.count}×</span> {kind === "bidon" ? "bidon" : "portie"}:{" "}
        {name}
        {item.carbsG > 0 ? (
          <span className="text-muted-foreground"> · {item.carbsG} g per {kind === "bidon" ? "bidon" : "portie"}</span>
        ) : null}
      </p>
      {item.ingredients.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {item.ingredients.map((ingredient) => `${amount(ingredient.amount, ingredient.unit)} ${ingredient.name}`).join(", ")}
        </p>
      ) : null}
    </li>
  );
}

const loadDay = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** Op de eventpagina en in de briefing: het plan, en bij een lange wedstrijd het laden ervoor. */
export function EventRidePlan({ eventId, plan, loadFrom }: { eventId: string; plan: RidePlan; loadFrom: string | null }) {
  return (
    <div className="space-y-2">
      <RidePlanView plan={plan} />
      {loadFrom ? (
        <Link
          href={`/zwbeter-worden/voeding/protocollen/koolhydraten-laden?event=${eventId}`}
          className="inline-flex min-h-[44px] items-center text-sm text-primary hover:underline"
        >
          Koolhydraten laden vanaf {loadDay.format(new Date(`${loadFrom}T12:00:00Z`))}
        </Link>
      ) : null}
    </div>
  );
}

export function RidePlanView({ plan }: { plan: RidePlan }) {
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
      <ul className="space-y-2">
        <ItemRow item={plan.bidons} kind="bidon" />
        {plan.waterBidons > 0 ? (
          <ItemRow item={{ recipe: null, count: plan.waterBidons, carbsG: 0, ingredients: [] }} kind="bidon" />
        ) : null}
        {plan.solid ? <ItemRow item={plan.solid} kind="vast" /> : null}
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
              <span className="shrink-0 tabular-nums text-muted-foreground">{feed.carbsG} g</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
