// Welke week het weekoverzicht terugblikt, en wanneer de pop-up opent.
//
// De pop-up komt op zondagavond (vanaf 18:00) en blijft tot en met woensdag
// staan voor wie de app later pas opent. Daarna is het geen terugblik meer
// maar oud nieuws; /weekoverzicht toont hem dan nog wel.
//
// Puur, met de Nederlandse kalenderdag en het Nederlandse uur.

import { amsterdamDateKey } from "@/lib/birthdays";
import { amsterdamHour } from "@/lib/greeting";

/** Vanaf dit uur op zondag telt de lopende week als afgesloten. */
export const REVIEW_FROM_HOUR = 18;

export type ReviewPeriod = {
  /** Maandag van de week waarop teruggeblikt wordt. */
  weekStart: string;
  /** Zondag van die week. */
  weekEnd: string;
  /** Maandag en zondag van de week erna: de vooruitblik. */
  nextWeekStart: string;
  nextWeekEnd: string;
  /** Mag de pop-up nu vanzelf opengaan? */
  inPopupWindow: boolean;
};

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 1 = maandag … 7 = zondag. */
export function isoWeekday(day: string): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay() || 7;
}

export function reviewPeriod(now: Date = new Date()): ReviewPeriod {
  const today = amsterdamDateKey(now);
  const weekday = isoWeekday(today);
  const sundayEvening = weekday === 7 && amsterdamHour(now) >= REVIEW_FROM_HOUR;
  // Zondag vóór zes uur loopt de week nog: dan is de vorige week de laatste
  // afgesloten week.
  const weekEnd = sundayEvening ? today : addDays(today, -(weekday === 7 ? 7 : weekday));
  return {
    weekStart: addDays(weekEnd, -6),
    weekEnd,
    nextWeekStart: addDays(weekEnd, 1),
    nextWeekEnd: addDays(weekEnd, 7),
    inPopupWindow: sundayEvening || weekday <= 3,
  };
}

/** De zeven kalenderdagen vanaf een maandag. */
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/** Weeknummer volgens ISO 8601. */
export function isoWeekNumber(day: string): number {
  const date = new Date(`${day}T12:00:00Z`);
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1, 12));
  return Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
