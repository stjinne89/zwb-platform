// Van een ZwiftInsider-routelink naar naam, wereld en afstand.
//
// Scrapen is niet nodig: `zwift-data` zet bij bijna elke fietsroute de link
// naar zwiftinsider.com/route/<slug>. Die slug is dus een sleutel in de
// catalogus die we al meeleveren.

import { routes, worlds } from "zwift-data";

export type ZwiftInsiderRoute = {
  name: string;
  /** Weergavenaam, zoals "Watopia". */
  world: string;
  /** Eén ronde, zonder lead-in (km, één decimaal). */
  distanceKm: number;
};

/** De routeslug uit een zwiftinsider.com/route/<slug>-link, of null. */
export function zwiftInsiderSlug(input: string): string | null {
  const match = /zwiftinsider\.com\/route\/([^/?#\s]+)/i.exec(input.trim());
  return match ? decodeURIComponent(match[1]).toLowerCase() : null;
}

const WORLD_NAMES = new Map(worlds.map((world) => [world.slug, world.name]));

const BY_SLUG = new Map<string, ZwiftInsiderRoute>();
for (const route of routes) {
  if (!route.sports.includes("cycling") || !route.zwiftInsiderUrl) continue;
  const slug = zwiftInsiderSlug(route.zwiftInsiderUrl);
  if (!slug || BY_SLUG.has(slug)) continue;
  BY_SLUG.set(slug, {
    name: route.name,
    world: WORLD_NAMES.get(route.world) ?? route.world,
    distanceKm: Math.round(route.distance * 10) / 10,
  });
}

export function routeFromZwiftInsiderUrl(input: string): ZwiftInsiderRoute | null {
  const slug = zwiftInsiderSlug(input);
  return slug ? (BY_SLUG.get(slug) ?? null) : null;
}
