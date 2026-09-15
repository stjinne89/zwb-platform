// ZWBlokken in de Zwift-werelden: welke wereld, welke blokken?
//
// Zwift legt zijn werelden op vaste coördinaten: Watopia, Makuri Islands, France
// en Crit City op verzonnen plekken in de Stille Oceaan, London, New York, Paris
// en de rest op de echte stad. Een VirtualRide-routelijn ligt dus gewoon op de
// kaart, en het blokraster uit grid.ts werkt er ongewijzigd op — alleen fijner,
// en in een eigen tabel (zie migratie 0165).
//
// Alleen Zwift. Rouvy en FulGaz rijden over echte video-routes (Paris, de Gavia),
// MyWhoosh heeft eigen werelden; die zouden hier verkeerd of nergens landen.

import { worlds } from "zwift-data";
import type { GpxPoint } from "@/lib/gpx";
import { blocksForPolyline } from "./grid";

/**
 * ~600 m. Op zoom 14 is Watopia 36 blokken en Crit City er één: in een paar
 * weken vol. De routelijn van Strava heeft gemiddeld elke 60 m een punt, dus
 * fijner dan dit kan, maar dan snijdt de lijn bochten af en kleuren buurblokken.
 */
export const ZWIFT_BLOCK_ZOOM = 16;

/** Marge rond de wereldgrenzen uit zwift-data, in graden (~2 km). */
const BOUNDS_MARGIN = 0.02;

export type ZwiftWorld = {
  slug: string;
  name: string;
  /** [zuid, west, noord, oost], zonder marge. */
  bbox: [number, number, number, number];
  /**
   * Zwifts eigen minimap, precies op `bbox`. Het beeld is van Zwift en wordt
   * rechtstreeks van hun CDN geladen, niet gekopieerd (besluit eigenaar,
   * 2026-09-15). Alleen een https-adres van cdn.zwift.com wordt doorgegeven.
   */
  imageUrl: string | null;
};

const ZWIFT_CDN = /^https:\/\/cdn\.zwift\.com\//;

export const ZWIFT_WORLDS: ZwiftWorld[] = worlds.map((world) => {
  const [[lat1, lon1], [lat2, lon2]] = world.bounds as [[number, number], [number, number]];
  const imageUrl = (world as { imageUrl?: string }).imageUrl;
  return {
    slug: world.slug,
    name: world.name,
    imageUrl: imageUrl && ZWIFT_CDN.test(imageUrl) ? imageUrl : null,
    bbox: [
      Math.min(lat1, lat2),
      Math.min(lon1, lon2),
      Math.max(lat1, lat2),
      Math.max(lon1, lon2),
    ],
  };
});

const BY_SLUG = new Map(ZWIFT_WORLDS.map((w) => [w.slug, w]));
export const zwiftWorldBySlug = (slug: string) => BY_SLUG.get(slug);

/** Regiocode voor de titels, zodat die niet botst met landen of provincies. */
export const zwiftRegionCode = (slug: string) => `zwift:${slug}`;

/**
 * Komt deze rit van Zwift? Strikter dan looksVirtual (sports.ts): die vangt ook
 * Rouvy en MyWhoosh, en die horen hier juist niet.
 */
export function isZwiftRide(meta: {
  name?: string | null;
  deviceName?: string | null;
  externalId?: string | null;
}): boolean {
  return /zwift/i.test([meta.deviceName, meta.externalId, meta.name].filter(Boolean).join(" "));
}

/** De wereld waarin dit punt ligt, met een kleine marge rond de grenzen. */
export function zwiftWorldAt(lat: number, lon: number): ZwiftWorld | null {
  for (const world of ZWIFT_WORLDS) {
    const [south, west, north, east] = world.bbox;
    if (
      lat >= south - BOUNDS_MARGIN &&
      lat <= north + BOUNDS_MARGIN &&
      lon >= west - BOUNDS_MARGIN &&
      lon <= east + BOUNDS_MARGIN
    ) {
      return world;
    }
  }
  return null;
}

/**
 * Wereld en blokken van één rit, of null als het geen herkenbare Zwift-rit is.
 * De wereld volgt het startpunt: een rit wisselt in Zwift nooit van wereld.
 */
export function zwiftBlocksForRide(ride: {
  points: GpxPoint[];
  name?: string | null;
  deviceName?: string | null;
  externalId?: string | null;
}): { world: ZwiftWorld; blocks: Set<string> } | null {
  if (ride.points.length < 2 || !isZwiftRide(ride)) return null;
  const world = zwiftWorldAt(ride.points[0].lat, ride.points[0].lon);
  if (!world) return null;
  return { world, blocks: blocksForPolyline(ride.points, ZWIFT_BLOCK_ZOOM) };
}
