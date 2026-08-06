import { describe, expect, it } from "vitest";
import {
  BLOCK_ZOOM,
  MASK_METERS,
  blockBounds,
  blockKey,
  blocksForActivity,
  blocksForPolyline,
  isVirtualWorldPoint,
  lonLatToBlock,
  maskEnds,
} from "@/lib/zwblokken/grid";
import { looksVirtual } from "@/lib/strava/sports";
import type { GpxPoint } from "@/lib/gpx";

const M_PER_DEG_LAT = 111320;

/** Rechte lijn noordwaarts vanaf (lat0, lon0), punten `stepM` uit elkaar. */
function northLine(
  lat0: number,
  lon0: number,
  lengthM: number,
  stepM: number,
): GpxPoint[] {
  const points: GpxPoint[] = [];
  for (let d = 0; d <= lengthM; d += stepM) {
    points.push({ lat: lat0 + d / M_PER_DEG_LAT, lon: lon0 });
  }
  return points;
}

describe("lonLatToBlock", () => {
  it("zet de nulmeridiaan op de evenaar midden in het raster", () => {
    // Op zoom 14 telt het raster 2^14 = 16384 blokken per as; (0,0) valt op
    // de grens, dus de eerste blok rechts/onder daarvan.
    expect(lonLatToBlock(0, 0)).toEqual({ x: 8192, y: 8192 });
  });

  it("vindt het bekende blok voor de Cauberg", () => {
    // Referentiewaarde uit de slippy-map-formule voor z14:
    // x = (5.8319 + 180) / 360 * 16384, y via de Mercator-projectie.
    expect(lonLatToBlock(50.8654, 5.8319)).toEqual({ x: 8457, y: 5494 });
  });

  it("blijft binnen het raster bij extreme breedtegraden", () => {
    const n = 2 ** BLOCK_ZOOM;
    const north = lonLatToBlock(89.9, 10);
    const south = lonLatToBlock(-89.9, 10);
    expect(north.y).toBeGreaterThanOrEqual(0);
    expect(south.y).toBeLessThanOrEqual(n - 1);
  });

  it("levert grenzen op die het eigen blok weer teruggeven", () => {
    const block = lonLatToBlock(52.09, 5.11);
    const [[south, west], [north, east]] = blockBounds(block.x, block.y);
    expect(north).toBeGreaterThan(south);
    expect(east).toBeGreaterThan(west);
    const mid = lonLatToBlock((north + south) / 2, (east + west) / 2);
    expect(mid).toEqual(block);
  });
});

describe("blocksForPolyline", () => {
  it("laat geen gaten vallen bij grof gesamplede punten", () => {
    // 20 km noordwaarts met punten van 5 km uit elkaar — veel grover dan een
    // Strava summary-polyline. De gepasseerde blokken moeten aaneengesloten
    // zijn: dezelfde x, en y's zonder onderbreking.
    const points = northLine(51.0, 5.5, 20_000, 5_000);
    const blocks = [...blocksForPolyline(points)].map((k) => {
      const [x, y] = k.split("/").map(Number);
      return { x, y };
    });

    const xs = new Set(blocks.map((b) => b.x));
    expect(xs.size).toBe(1);

    const ys = blocks.map((b) => b.y).sort((a, b) => a - b);
    expect(ys.length).toBeGreaterThan(10);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i] - ys[i - 1]).toBe(1);
    }
  });

  it("geeft hetzelfde resultaat of je nu grof of fijn samplet", () => {
    const coarse = blocksForPolyline(northLine(51.0, 5.5, 20_000, 5_000));
    const fine = blocksForPolyline(northLine(51.0, 5.5, 20_000, 100));
    expect([...coarse].sort()).toEqual([...fine].sort());
  });

  it("pakt bij een diagonaal ook de blokken tussen begin en eind", () => {
    const a: GpxPoint = { lat: 51.0, lon: 5.5 };
    const b: GpxPoint = { lat: 51.1, lon: 5.7 };
    const blocks = blocksForPolyline([a, b]);
    const first = lonLatToBlock(a.lat, a.lon);
    const last = lonLatToBlock(b.lat, b.lon);
    expect(blocks.has(blockKey(first.x, first.y))).toBe(true);
    expect(blocks.has(blockKey(last.x, last.y))).toBe(true);
    // Minstens het aantal rasterlijnen dat je moet kruisen, plus het startblok.
    const crossings = Math.abs(last.x - first.x) + Math.abs(last.y - first.y);
    expect(blocks.size).toBeGreaterThanOrEqual(crossings + 1);
  });

  it("geeft één blok voor een punt en niets voor een lege route", () => {
    expect(blocksForPolyline([{ lat: 51.0, lon: 5.5 }]).size).toBe(1);
    expect(blocksForPolyline([]).size).toBe(0);
  });

  it("blijft snel bij een realistische rit", () => {
    // ~200 km met punten van 200 m: ordegrootte van een lange Strava-polyline.
    const points = northLine(48.0, 5.5, 200_000, 200);
    const started = Date.now();
    const blocks = blocksForPolyline(points);
    expect(blocks.size).toBeGreaterThan(100);
    expect(Date.now() - started).toBeLessThan(500);
  });
});

describe("maskEnds", () => {
  it("knipt aan beide kanten ongeveer het maskerbereik weg", () => {
    const points = northLine(51.0, 5.5, 20_000, 100);
    const masked = maskEnds(points);

    const droppedStart =
      (masked[0].lat - points[0].lat) * M_PER_DEG_LAT;
    const droppedEnd =
      (points[points.length - 1].lat - masked[masked.length - 1].lat) *
      M_PER_DEG_LAT;

    expect(droppedStart).toBeGreaterThanOrEqual(MASK_METERS - 100);
    expect(droppedEnd).toBeGreaterThanOrEqual(MASK_METERS - 100);
    expect(masked.length).toBeGreaterThan(100);
  });

  it("houdt niets over bij een rit korter dan twee keer het masker", () => {
    expect(maskEnds(northLine(51.0, 5.5, 1_500, 100))).toEqual([]);
    expect(maskEnds([{ lat: 51.0, lon: 5.5 }])).toEqual([]);
    expect(maskEnds([])).toEqual([]);
  });
});

describe("blocksForActivity", () => {
  it("laat het start- en eindblok altijd weg", () => {
    const points = northLine(51.0, 5.5, 20_000, 100);
    const startBlock = lonLatToBlock(points[0].lat, points[0].lon);
    const endBlock = lonLatToBlock(
      points[points.length - 1].lat,
      points[points.length - 1].lon,
    );

    const blocks = blocksForActivity(points);
    expect(blocks.has(blockKey(startBlock.x, startBlock.y))).toBe(false);
    expect(blocks.has(blockKey(endBlock.x, endBlock.y))).toBe(false);
    expect(blocks.size).toBeGreaterThan(5);
  });

  it("houdt een rondrit die thuis begint en eindigt weg van huis", () => {
    // Uit-en-terug: 6 km noord, 6 km terug. Het thuisblok mag er niet in zitten,
    // ook al ligt het aan beide uiteinden van de route.
    const out = northLine(51.0, 5.5, 6_000, 100);
    const back = [...out].reverse().slice(1);
    const home = lonLatToBlock(51.0, 5.5);

    const blocks = blocksForActivity([...out, ...back]);
    expect(blocks.has(blockKey(home.x, home.y))).toBe(false);
    expect(blocks.size).toBeGreaterThan(0);
  });

  it("levert niets op voor een te korte rit", () => {
    expect(blocksForActivity(northLine(51.0, 5.5, 800, 100)).size).toBe(0);
    expect(blocksForActivity([]).size).toBe(0);
  });

  it("negeert een rit die in Watopia begint", () => {
    // Zwift-ritten komen soms binnen als gewone Ride met trainer=false; dan is
    // de locatie het laatste wat ze verraadt.
    expect(blocksForActivity(northLine(-11.64, 166.95, 20_000, 100)).size).toBe(
      0,
    );
  });
});

describe("isVirtualWorldPoint", () => {
  it("herkent Watopia en laat echte plekken met rust", () => {
    expect(isVirtualWorldPoint(-11.64, 166.95)).toBe(true);
    expect(isVirtualWorldPoint(51.0, 5.5)).toBe(false);
    // Makuri ligt bij Japan, Zwift-Londen in Londen: die mogen we niet
    // geografisch uitsluiten, daar wordt echt gefietst.
    expect(isVirtualWorldPoint(35.7, 139.7)).toBe(false);
    expect(isVirtualWorldPoint(51.5, -0.15)).toBe(false);
  });
});

describe("looksVirtual", () => {
  it("herkent Strava's standaardnaam voor Zwift-uploads", () => {
    expect(looksVirtual({ name: "Zwift - Watopia deel 1" })).toBe(true);
    expect(looksVirtual({ name: "Ochtendrit", deviceName: "Zwift" })).toBe(true);
    expect(
      looksVirtual({ name: "Rit", externalId: "mywhoosh-12345.fit" }),
    ).toBe(true);
  });

  it("laat gewone ritnamen met rust", () => {
    expect(looksVirtual({ name: "Ochtendrit" })).toBe(false);
    expect(looksVirtual({ name: "Rondje Limburg", deviceName: "Garmin" })).toBe(
      false,
    );
    expect(looksVirtual({})).toBe(false);
  });
});
