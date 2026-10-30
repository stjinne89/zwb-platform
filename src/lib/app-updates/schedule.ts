// Wanneer een app-update verschijnt en hoe lang de pop-up meegaat (0293).
//
// Elke update hoort bij een week en verschijnt op de donderdag van die week om
// 17:00 Nederlandse tijd. De pop-up blijft een week staan voor wie de app later
// pas opent; daarna is hij oud nieuws en staat hij alleen nog op /updates. Zo
// krijgt een nieuw lid ook niet meteen een update van maanden terug.
//
// Puur, met de Nederlandse kalenderdag.

import { amsterdamDateKey, amsterdamWallTimeToIso } from "@/lib/birthdays";
import { addDays, isoWeekday } from "@/lib/weekly-review/period";

export const PUBLISH_WEEKDAY = 4; // donderdag
export const PUBLISH_TIME = "17:00";
export const POPUP_DAYS = 7;

export const SUMMARY_MIN = 10;
export const SUMMARY_MAX = 400;
export const ITEM_MAX = 200;
export const ITEMS_MAX = 30;

/** Maandag van de week waarin deze dag valt. */
export function weekStartOf(day: string): string {
  return addDays(day, 1 - isoWeekday(day));
}

/** Het moment waarop de update van deze week verschijnt (ISO, UTC). */
export function publishAtFor(weekStart: string): string {
  const iso = amsterdamWallTimeToIso(addDays(weekStart, PUBLISH_WEEKDAY - 1), PUBLISH_TIME);
  if (!iso) throw new Error(`Ongeldige week: ${weekStart}`);
  return iso;
}

/**
 * De week waarvoor je nu een update schrijft: deze week tot hij verschenen is,
 * daarna de volgende.
 */
export function upcomingWeekStart(now: Date = new Date()): string {
  const thisWeek = weekStartOf(amsterdamDateKey(now));
  return now.getTime() < Date.parse(publishAtFor(thisWeek)) ? thisWeek : addDays(thisWeek, 7);
}

/** Is deze update al verschenen? */
export function isPublished(publishAt: string, now: Date = new Date()): boolean {
  return now.getTime() >= Date.parse(publishAt);
}

/** Mag de pop-up voor deze update nu nog vanzelf opengaan? */
export function inPopupWindow(publishAt: string, now: Date = new Date()): boolean {
  const start = Date.parse(publishAt);
  return now.getTime() >= start && now.getTime() < start + POPUP_DAYS * 86_400_000;
}

/** Eén punt per regel; lege regels en opsommingstekens vallen weg. */
export function parseItems(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}
