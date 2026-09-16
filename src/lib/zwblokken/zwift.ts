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
import { haversineKm } from "@/lib/gpx";
import { blockCentre, blocksForPolyline, parseBlockKey } from "./grid";

/**
 * ~600 m. Op zoom 14 is Watopia 36 blokken en Crit City er één: in een paar
 * weken vol. De routelijn van Strava heeft gemiddeld elke 60 m een punt, dus
 * fijner dan dit kan, maar dan snijdt de lijn bochten af en kleuren buurblokken.
 */
export const ZWIFT_BLOCK_ZOOM = 16;

/** Marge rond de wereldgrenzen uit zwift-data, in graden (~2 km). */
const BOUNDS_MARGIN = 0.02;

/**
 * Marge voor de blokken zelf, in graden (~15 km). Ruimer dan hierboven, want de
 * grenzen in zwift-data zijn krapper dan de werelden inmiddels zijn: in
 * productie lag echt gereden weg tot ~10 km erbuiten (France 3.155 punten,
 * Watopia 799). De rommel die we juist willen weren — wereldsprongen en Climb
 * Portals — ligt meer dan 50 km buiten de wereld.
 */
const BLOCK_MARGIN = 0.15;

/**
 * Langer dan dit tussen twee punten is geen fietsen maar een sprong: een event
 * dat naar een andere wereld springt, of een Climb Portal die je op de echte
 * berg zet. Zonder deze grens vulde de supercover-DDA alle blokken op de lijn
 * ertussen. Normale punten liggen vrijwel altijd onder de kilometer; in
 * productie waren er 9 sprongen boven de 10 km, en die waren allemaal van dit
 * soort.
 */
const MAX_SEGMENT_KM = 10;

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

/** Ligt het middelpunt van dit blok binnen de wereld (met marge)? Puur. */
export function blockInWorld(world: ZwiftWorld, key: string): boolean {
  const { x, y } = parseBlockKey(key);
  const [lon, lat] = blockCentre(x, y, ZWIFT_BLOCK_ZOOM);
  const [south, west, north, east] = world.bbox;
  return (
    lat >= south - BLOCK_MARGIN &&
    lat <= north + BLOCK_MARGIN &&
    lon >= west - BLOCK_MARGIN &&
    lon <= east + BLOCK_MARGIN
  );
}

/**
 * Knipt de route bij elke sprong groter dan `MAX_SEGMENT_KM`. Puur, voor de test.
 */
export function splitOnJumps(points: GpxPoint[], maxKm = MAX_SEGMENT_KM): GpxPoint[][] {
  const runs: GpxPoint[][] = [];
  let run: GpxPoint[] = [];
  for (const point of points) {
    const previous = run[run.length - 1];
    if (previous && haversineKm(previous, point) > maxKm) {
      runs.push(run);
      run = [];
    }
    run.push(point);
  }
  if (run.length > 0) runs.push(run);
  return runs;
}

/**
 * Wereld en blokken van één rit, of null als het geen herkenbare Zwift-rit is.
 * De wereld volgt het startpunt: een rit wisselt in Zwift nooit van wereld.
 *
 * Twee vangnetten, want een routelijn blijft niet altijd binnen de wereld:
 * - een enkel event springt halverwege naar een andere wereld, en een Climb
 *   Portal legt een echte klim (Puy de Dôme, Tourmalet) op zijn echte plek. De
 *   lijn ertussen trok anders een spoor van duizenden blokken over de oceaan, en
 *   overschreef onderweg het wereldlabel van bestaande blokken. Vandaar
 *   `splitOnJumps`;
 * - wat daarna nog ver buiten de wereld ligt, valt af via `blockInWorld`.
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
  const blocks = new Set<string>();
  for (const run of splitOnJumps(ride.points)) {
    for (const key of blocksForPolyline(run, ZWIFT_BLOCK_ZOOM)) {
      if (blockInWorld(world, key)) blocks.add(key);
    }
  }
  return { world, blocks };
}
