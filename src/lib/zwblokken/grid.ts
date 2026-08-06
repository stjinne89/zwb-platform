// ZWBlokken: het raster waarin we "waar heb je gereden" vastleggen.
//
// De wereld is opgedeeld in blokken volgens het standaard slippy-map-raster
// (Web Mercator, hetzelfde raster als OSM-kaarttegels). Op zoom 14 is een blok
// ~2,4 km breed op de evenaar en ~1,5 x 1,0 km op Nederlandse breedte. Dat het
// blokraster exact samenvalt met het kaarttegelraster maakt het tekenen later
// pure rekenkunde: een kaarttegel bevat óf een heel aantal blokken, óf valt
// binnen één blok.
//
// Bewust zoom 14 en niet fijner: de Strava-polyline die we als bron gebruiken
// is sterk gedecimeerd (punten staan vaak honderden meters uit elkaar, zie de
// toelichting in src/lib/cols/detector.ts). Een fijner raster zou precisie
// suggereren die de brondata niet heeft.

import { haversineKm, type GpxPoint } from "@/lib/gpx";

export const BLOCK_ZOOM = 14;

/** Hoeveel meter aan begin én eind van een rit we niet meetellen (privacy). */
export const MASK_METERS = 1000;

export type Block = { x: number; y: number };

/** Sleutel voor Set/Map-gebruik. Alleen intern — de DB slaat x en y apart op. */
export function blockKey(x: number, y: number): string {
  return `${x}/${y}`;
}

export function parseBlockKey(key: string): Block {
  const [x, y] = key.split("/");
  return { x: Number(x), y: Number(y) };
}

/**
 * Fractionele blokcoördinaat. De gehele delen vormen het blok; de decimalen
 * geven de positie binnen dat blok. De rasterloop hieronder heeft die
 * decimalen nodig, dus die conversie staat los van `lonLatToBlock`.
 */
function lonLatToBlockFraction(
  lat: number,
  lon: number,
  z: number = BLOCK_ZOOM,
): { fx: number; fy: number } {
  const n = 2 ** z;
  // Mercator klapt om bij de polen; clamp op de grenzen van het raster.
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = (clamped * Math.PI) / 180;
  const fx = ((lon + 180) / 360) * n;
  const fy =
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  return { fx, fy };
}

/** Het blok waarin een coördinaat valt. */
export function lonLatToBlock(
  lat: number,
  lon: number,
  z: number = BLOCK_ZOOM,
): Block {
  const { fx, fy } = lonLatToBlockFraction(lat, lon, z);
  const n = 2 ** z;
  return {
    x: Math.min(n - 1, Math.max(0, Math.floor(fx))),
    y: Math.min(n - 1, Math.max(0, Math.floor(fy))),
  };
}

/** De hoekpunten van een blok, als [[zuid, west], [noord, oost]]. */
export function blockBounds(
  x: number,
  y: number,
  z: number = BLOCK_ZOOM,
): [[number, number], [number, number]] {
  const n = 2 ** z;
  const lon = (bx: number) => (bx / n) * 360 - 180;
  const lat = (by: number) => {
    const t = Math.PI * (1 - (2 * by) / n);
    return (180 / Math.PI) * Math.atan(Math.sinh(t));
  };
  return [
    [lat(y + 1), lon(x)],
    [lat(y), lon(x + 1)],
  ];
}

/**
 * Alle blokken die het lijnstuk a→b raakt, inclusief de blokken ertússen.
 *
 * Dit is het hart van de berekening. Alleen de punten van de polyline in een
 * blok stoppen werkt niet: met gaten van honderden meters tussen de punten
 * sla je blokken over en krijgt de kaart gaten. Daarom lopen we het raster af
 * met een supercover-DDA (Amanatides–Woo): we schuiven van rand naar rand en
 * pakken elk blok dat de lijn doorkruist, hoe lang het segment ook is.
 */
function addBlocksForSegment(
  out: Set<string>,
  a: GpxPoint,
  b: GpxPoint,
  z: number,
): void {
  const from = lonLatToBlockFraction(a.lat, a.lon, z);
  const to = lonLatToBlockFraction(b.lat, b.lon, z);

  let x = Math.floor(from.fx);
  let y = Math.floor(from.fy);
  const endX = Math.floor(to.fx);
  const endY = Math.floor(to.fy);

  out.add(blockKey(x, y));
  if (x === endX && y === endY) return;

  const dx = to.fx - from.fx;
  const dy = to.fy - from.fy;
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;

  // tMax = hoeveel van het segment (0..1) tot de volgende rasterlijn;
  // tDelta = hoeveel per volledig blok.
  const tDeltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
  const tDeltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
  let tMaxX =
    dx === 0 ? Infinity : (dx > 0 ? x + 1 - from.fx : from.fx - x) * tDeltaX;
  let tMaxY =
    dy === 0 ? Infinity : (dy > 0 ? y + 1 - from.fy : from.fy - y) * tDeltaY;

  // Harde bovengrens: het aantal te kruisen rasterlijnen is bekend, dus een
  // segment kan nooit meer stappen kosten dan dat. Voorkomt dat afrondings-
  // ruis een oneindige lus oplevert.
  const maxSteps = Math.abs(endX - x) + Math.abs(endY - y) + 2;
  for (let step = 0; step < maxSteps; step++) {
    if (tMaxX < tMaxY) {
      x += stepX;
      tMaxX += tDeltaX;
    } else {
      y += stepY;
      tMaxY += tDeltaY;
    }
    out.add(blockKey(x, y));
    if (x === endX && y === endY) return;
  }
}

/**
 * Knipt de eerste en laatste `meters` van een route weg. Ritten beginnen en
 * eindigen meestal thuis; door die kilometer te laten vallen komt het
 * woonblok er in de praktijk niet in (een blok is op onze breedte ~1,5 km).
 *
 * Blijven er minder dan twee punten over, dan was de rit te kort om er iets
 * zinnigs uit af te leiden en geven we niets terug.
 */
export function maskEnds(
  points: GpxPoint[],
  meters: number = MASK_METERS,
): GpxPoint[] {
  if (points.length < 2) return [];

  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cum[i] = cum[i - 1] + haversineKm(points[i - 1], points[i]) * 1000;
  }
  const total = cum[cum.length - 1];
  if (total <= meters * 2) return [];

  let start = 0;
  while (start < points.length && cum[start] < meters) start++;
  let end = points.length - 1;
  while (end >= 0 && total - cum[end] < meters) end--;

  if (end - start < 1) return [];
  return points.slice(start, end + 1);
}

/**
 * Alle blokken die een route aandoet. Verwacht al-gemaskeerde punten:
 * maskeren is een aparte stap zodat het testbaar en overslaanbaar blijft.
 */
export function blocksForPolyline(
  points: GpxPoint[],
  z: number = BLOCK_ZOOM,
): Set<string> {
  const out = new Set<string>();
  if (points.length === 0) return out;
  if (points.length === 1) {
    const { x, y } = lonLatToBlock(points[0].lat, points[0].lon, z);
    out.add(blockKey(x, y));
    return out;
  }
  for (let i = 1; i < points.length; i++) {
    addBlocksForSegment(out, points[i - 1], points[i], z);
  }
  return out;
}

/**
 * Zwifts Watopia ligt in de Salomonzee, op een plek waar niemand echt fietst.
 * Dat is het laatste vangnet voor virtuele ritten die noch aan hun sport_type
 * noch aan hun naam te herkennen zijn.
 *
 * Alleen Watopia staat hier. De andere Zwift-werelden (Londen, New York,
 * Parijs, Innsbruck, Yorkshire, Makuri) liggen op echte plekken waar wél
 * gefietst wordt; die geografisch uitsluiten zou echte ritten wegvegen.
 * Daarvoor is `looksVirtual` in @/lib/strava/sports het aangewezen filter.
 */
const VIRTUAL_WORLDS = [
  { minLat: -12.4, maxLat: -10.9, minLon: 166.2, maxLon: 167.7 },
];

export function isVirtualWorldPoint(lat: number, lon: number): boolean {
  return VIRTUAL_WORLDS.some(
    (b) =>
      lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon,
  );
}

/**
 * De blokken van één rit, met de privacy-regel erin verwerkt.
 *
 * Twee maatregelen, want alleen kilometers wegknippen is niet genoeg: een blok
 * is op onze breedte ~1,5 km, dus wie 1 km van huis rijdt zit vaak nog in
 * hetzelfde blok. Daarom gooien we het start- en eindblok er daarnaast ook
 * expliciet uit. De regel wordt daarmee hard en uitlegbaar: het blok waar je
 * rit begint of eindigt telt nooit mee.
 */
export function blocksForActivity(
  points: GpxPoint[],
  z: number = BLOCK_ZOOM,
): Set<string> {
  if (points.length < 2) return new Set();

  const first = points[0];
  const last = points[points.length - 1];

  if (isVirtualWorldPoint(first.lat, first.lon)) return new Set();
  const blocks = blocksForPolyline(maskEnds(points), z);

  for (const edge of [first, last]) {
    const { x, y } = lonLatToBlock(edge.lat, edge.lon, z);
    blocks.delete(blockKey(x, y));
  }
  return blocks;
}
