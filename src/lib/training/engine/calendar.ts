// Datums, beschikbaarheid en vaste afspraken voor de regelmotor. Alles leest
// alleen TrainingAiInput, zodat de motor hetzelfde ziet als de AI.

import { mondayKey, weekdayOf } from "@/lib/training/availability";
import { daysBetween, shiftDays } from "@/lib/training/season";
import type { SeasonPeriodKind } from "@/lib/training/season";
import type { TrainingAiInput } from "@/lib/training/engine/types";

export { daysBetween, mondayKey, shiftDays, weekdayOf };

/** Alle dagen van `from` tot en met `to`. */
export function datesBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = shiftDays(day, 1)) days.push(day);
  return days;
}

/**
 * Minuten die het lid op `date` kan trainen, zoals de prompt het voorschrijft:
 * de eigen week uit availability.weeks, anders availability.default. Ontbreekt
 * de dag daar, dan goal.availableDays: een aangevinkte dag is onbeperkt (null),
 * een niet-aangevinkte dag 0. Zonder enige bron: null.
 */
export function minutesOn(input: TrainingAiInput, date: string): number | null {
  const weekday = weekdayOf(date);
  const availability = input.availability;
  if (availability) {
    const week = (availability.weeks ?? []).find((row) => row.weekStart === mondayKey(date));
    const byDay = week?.minutesByDay ?? availability.default;
    const value = byDay?.[weekday];
    if (value != null) return Math.max(0, Number(value));
  }
  const days = input.goal.availableDays ?? [];
  if (days.length === 0) return null;
  return days.includes(weekday) ? null : 0;
}

/** Vaste afspraken op een dag: eigen rit, toegezegd clubevent of FTP-test. */
export function fixedOn(input: TrainingAiInput, date: string) {
  return (input.fixedWorkouts ?? []).filter((workout) => workout.date === date);
}

/** Toegezegde events op een dag. */
export function eventsOn(input: TrainingAiInput, date: string) {
  return (input.upcomingEvents ?? []).filter((event) => event.date === date);
}

/**
 * Valt er op deze dag een race, event, test of A/B-mikpunt: dan is de dag
 * ervoor licht. Een mikpunt telt mee omdat de prompt de dag vóór een B-mikpunt
 * licht wil, en een A-mikpunt is de piek zelf.
 */
export function isRaceOrTestDay(input: TrainingAiInput, date: string): boolean {
  return (
    eventsOn(input, date).length > 0 ||
    fixedOn(input, date).some((workout) => workout.kind === "clubevent" || workout.kind === "ftp_test") ||
    (input.seasonPlan?.targets ?? []).some((target) => target.priority !== "c" && target.date === date)
  );
}

/** De soort periode uit de jaarplanning waarin `date` valt, of null. */
export function periodOn(input: TrainingAiInput, date: string): SeasonPeriodKind | null {
  const period = (input.seasonPlan?.periods ?? []).find((row) => date >= row.from && date <= row.to);
  return period?.kind ?? null;
}

/** Minuten van vaste afspraken in [from, to]; telt mee in de weekbelasting. */
export function fixedMinutesBetween(input: TrainingAiInput, from: string, to: string): number {
  return (input.fixedWorkouts ?? [])
    .filter((workout) => workout.date >= from && workout.date <= to)
    .reduce((sum, workout) => sum + Math.max(0, workout.durationMinutes || 0), 0);
}
