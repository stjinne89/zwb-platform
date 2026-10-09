/**
 * Het labelfilter op de kalender: `?type=zrl,ladder`. Staat naast Alles/Voor
 * mij (`?voor=mij`) en versmalt die lijst; niets gekozen betekent alles tonen.
 *
 * Categorie (Zwift, Outdoor rit) en soort (Training, Social) zijn twee assen:
 * binnen een as is het "of", tussen de assen "en". Zwift plus Training toont
 * dus de Zwift-trainingen, Zwift plus Ladder alles van die twee.
 *
 * Verjaardagen zijn geen event, maar staan wel tussen de events. Ze krijgen
 * daarom een eigen label, anders kun je ze niet los aan- of uitzetten.
 */

import { EVENT_KIND_VALUES, EVENT_TYPE_VALUES } from "@/lib/event-types";

export const BIRTHDAY_FILTER = "verjaardag";

const FILTER_ORDER: string[] = [
  ...EVENT_TYPE_VALUES,
  ...EVENT_KIND_VALUES,
  BIRTHDAY_FILTER,
];

/** Onbekende waarden vallen weg; de volgorde is die van de eventtypes. */
export function parseTypeFilter(param: string | string[] | undefined): string[] {
  const raw = (Array.isArray(param) ? param.join(",") : (param ?? ""))
    .split(",")
    .map((value) => value.trim());
  return FILTER_ORDER.filter((value) => raw.includes(value));
}

export function toggleTypeFilter(selected: string[], value: string): string[] {
  const next = selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
  return FILTER_ORDER.filter((item) => next.includes(item));
}

export type CalendarFilter = { types: string[]; kinds: string[]; birthdays: boolean };

export function splitTypeFilter(selected: string[]): CalendarFilter {
  return {
    types: selected.filter((value) => (EVENT_TYPE_VALUES as string[]).includes(value)),
    kinds: selected.filter((value) => EVENT_KIND_VALUES.includes(value)),
    birthdays: selected.includes(BIRTHDAY_FILTER),
  };
}

/**
 * Verjaardagen horen op de categorie-as: zonder gekozen categorie blijven de
 * events van een gekozen soort staan, met alleen Verjaardagen aan geen enkel.
 */
export function eventMatchesFilter(
  event: { type: string; kind?: string | null },
  filter: CalendarFilter,
): boolean {
  if (filter.kinds.length > 0 && !filter.kinds.includes(event.kind ?? "")) return false;
  if (filter.types.length > 0) return filter.types.includes(event.type);
  return !filter.birthdays || filter.kinds.length > 0;
}

/** Zonder keuze staan verjaardagen erbij; met een keuze alleen als hun label aanstaat. */
export function birthdaysMatchFilter(filter: CalendarFilter): boolean {
  return filter.birthdays || (filter.types.length === 0 && filter.kinds.length === 0);
}

export function calendarHref(filter: { onlyForMe: boolean; types: string[] }): string {
  const params: string[] = [];
  if (filter.onlyForMe) params.push("voor=mij");
  if (filter.types.length > 0) params.push(`type=${filter.types.join(",")}`);
  return params.length > 0 ? `/kalender?${params.join("&")}` : "/kalender";
}
