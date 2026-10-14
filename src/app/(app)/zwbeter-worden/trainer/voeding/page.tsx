// Voeding-tab van de trainer: het eetdagboek van de renner, alleen als die het
// zelf heeft gedeeld (Naleving, 0235). Alleen lezen.

import { EmptyState } from "@/components/app-ui";
import { shiftDayKey } from "@/lib/training/mobility";
import { FUEL_DAY_LABELS } from "@/lib/nutrition/day-type";
import { dayTotals, floorStatus, weekSummary } from "@/lib/nutrition/log";
import { MEAL_MOMENT_LABELS } from "@/lib/nutrition/targets";
import { nutritionDay } from "@/lib/nutrition/tips";
import type { SearchParamsProp } from "../../_components/types";
import {
  loadLogSettings,
  loadLoggedMeals,
  loadNutritionDayInputs,
  todayKeyAmsterdam,
} from "../../voeding/_data";
import { WeekStrip } from "../../voeding/_components/week-strip";
import { loadAthlete, trainerContext } from "../_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function dayLabel(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export default async function TrainerNutritionPage({ searchParams }: SearchParamsProp) {
  const context = await trainerContext(searchParams);
  if (!context.ok) {
    return (
      <EmptyState>
        {context.reason === "no-permission" ? "Je hebt geen trainer-rechten." : "Geen toegewezen leden."}
      </EmptyState>
    );
  }
  const { viewer, athleteId } = context;

  // RLS laat de instellingen alleen zien als de renner meekijken heeft aangezet.
  const settings = await loadLogSettings(viewer, athleteId);
  if (!settings?.trainerVisible) return <EmptyState>Deze renner deelt het eetdagboek niet.</EmptyState>;

  const today = todayKeyAmsterdam();
  const days = Array.from({ length: 7 }, (_, i) => shiftDayKey(today, i - 6));
  const athlete = await loadAthlete(viewer, athleteId);
  const weightKg = athlete?.weight_kg == null ? null : Number(athlete.weight_kg) || null;
  const [meals, inputs] = await Promise.all([
    loadLoggedMeals(viewer, days[0], today, athleteId),
    loadNutritionDayInputs(viewer, days, weightKg, athleteId),
  ]);

  const perDay = days.map((day) => {
    const fuel = nutritionDay(inputs.get(day)!);
    return { day, fuel, meals: meals.filter((meal) => meal.eatenOn === day) };
  });
  const week = weekSummary(
    perDay.map(({ day, fuel, meals: own }) => ({
      day,
      dayType: fuel.dayType,
      carbs: fuel.carbs,
      protein: fuel.protein,
      meals: own,
    })),
  );

  return (
    <div className="space-y-6">
      <WeekStrip days={week.days} tally={week.tally} />
      {settings.paused && <p className="text-sm text-muted-foreground">De renner heeft het eetdagboek gepauzeerd.</p>}

      <ul className="space-y-3">
        {[...perDay].reverse().map(({ day, fuel, meals: own }) => {
          const totals = dayTotals(own);
          const carbs = floorStatus(totals.carbsG, fuel.carbs);
          const protein = floorStatus(totals.proteinG, fuel.protein);
          const prefix = totals.incomplete ? "≥ " : "";
          return (
            <li key={day} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold first-letter:uppercase">{dayLabel(day)}</h3>
                <span className="text-xs text-muted-foreground">{FUEL_DAY_LABELS[fuel.dayType]}</span>
              </div>
              {own.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">Niet ingevuld.</p>
              ) : (
                <>
                  <p className="mt-1 text-sm tabular-nums">
                    {prefix}
                    {carbs.eatenG} g koolhydraten{carbs.floorG != null ? ` (minstens ${carbs.floorG})` : ""} · {prefix}
                    {protein.eatenG} g eiwit{protein.floorG != null ? ` (minstens ${protein.floorG})` : ""}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {own.map((meal) => (
                      <li key={meal.id}>
                        {MEAL_MOMENT_LABELS[meal.moment]}: {meal.title}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
