/**
 * Tapdoel van minimaal 44px hoog, zoals de ontwerpregels voorschrijven.
 *
 * Staat los van scroll-tabs.tsx: dat is een client-module, en een
 * server-component die er een string uit importeert krijgt een
 * client-referentie in plaats van de klassen. De chips op /stats en ZWB
 * Segments misten daardoor hun hoogte en opvulling (gezien 2026-10-16).
 */
export const SCROLL_TAB_ITEM =
  "flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-md px-3 text-sm font-medium transition";
