// Welke provincie en welk land hoort bij een blok?
//
// De omtrekken en de blokaantallen komen uit regions.json, gegenereerd door
// scripts/build-zwblokken-regions.mjs uit Natural Earth 1:10m. Dat script
// telt de blokken per regio met exact hetzelfde criterium als hieronder — het
// middelpunt van het blok moet binnen de omtrek vallen — zodat een blok nooit
// in de teller kan zitten zonder in de noemer mee te tellen.
//
// Alleen server-side gebruiken: regions.json is ruim anderhalve megabyte en
// heeft in een clientbundle niets te zoeken.

import data from "./regions.json";
import { BLOCK_ZOOM } from "./grid";

type RawRegion = {
  code: string;
  name: string;
  level: string;
  bbox: [number, number, number, number];
  blocks: number;
  rings: [number, number][][];
};

export type Region = {
  code: string;
  name: string;
  level: "country" | "province";
  /** Totaal aantal z14-blokken binnen deze regio. */
  blocks: number;
};

const RAW = data.regions as unknown as RawRegion[];

export const REGIONS: Region[] = RAW.map((r) => ({
  code: r.code,
  name: r.name,
  level: r.level as Region["level"],
  blocks: r.blocks,
}));

const BY_CODE = new Map(REGIONS.map((r) => [r.code, r]));
export const regionByCode = (code: string) => BY_CODE.get(code);

const COUNTRIES = RAW.filter((r) => r.level === "country");
const PROVINCES = RAW.filter((r) => r.level === "province");

/** Middelpunt van een blok, in graden. */
function blockCentre(x: number, y: number): [number, number] {
  const n = 2 ** BLOCK_ZOOM;
  const lon = ((x + 0.5) / n) * 360 - 180;
  const t = Math.PI * (1 - (2 * (y + 0.5)) / n);
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(t));
  return [lon, lat];
}

/** Even-oddregel: tel de randen die rechts van het punt gekruist worden. */
function inRings(rings: [number, number][][], lon: number, lat: number): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      const [x1, y1] = ring[i - 1];
      const [x2, y2] = ring[i];
      // Half-open op de breedtegraad, anders telt een hoekpunt dubbel.
      if (y1 > lat !== y2 > lat) {
        const xCross = x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1);
        if (xCross > lon) inside = !inside;
      }
    }
  }
  return inside;
}

function match(list: RawRegion[], lon: number, lat: number): RawRegion | null {
  for (const region of list) {
    const [minLon, minLat, maxLon, maxLat] = region.bbox;
    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
    if (inRings(region.rings, lon, lat)) return region;
  }
  return null;
}

export type BlockRegion = { country: string | null; province: string | null };

/**
 * Land en (voor Nederland) provincie van een blok. Buiten Europa is `country`
 * null: die regio's tonen we niet, maar het blok telt wel gewoon mee op de
 * kaart en in het totaal.
 */
export function regionForBlock(x: number, y: number): BlockRegion {
  const [lon, lat] = blockCentre(x, y);
  const country = match(COUNTRIES, lon, lat);
  // Alleen zoeken naar een provincie als het blok in Nederland ligt.
  const province = country?.code === "NL" ? match(PROVINCES, lon, lat) : null;
  return { country: country?.code ?? null, province: province?.code ?? null };
}
