/**
 * Het labelfilter op de kalender: `?type=zrl,ladder`. Staat naast Alles/Voor
 * mij (`?voor=mij`) en versmalt die lijst; niets gekozen betekent alles tonen.
 *
 * Verjaardagen zijn geen event, maar staan wel tussen de events. Ze krijgen
 * daarom een eigen label, anders kun je ze niet los aan- of uitzetten.
 */

import { EVENT_TYPE_VALUES } from "@/lib/event-types";

export const BIRTHDAY_FILTER = "verjaardag";

const FILTER_ORDER: string[] = [...EVENT_TYPE_VALUES, BIRTHDAY_FILTER];

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

export function calendarHref(filter: { onlyForMe: boolean; types: string[] }): string {
  const params: string[] = [];
  if (filter.onlyForMe) params.push("voor=mij");
  if (filter.types.length > 0) params.push(`type=${filter.types.join(",")}`);
  return params.length > 0 ? `/kalender?${params.join("&")}` : "/kalender";
}
