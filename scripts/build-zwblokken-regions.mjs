// Bouwt src/lib/zwblokken/regions.json: de regio's waarvoor ZWBlokken dekking
// toont (Nederlandse provincies en Europese landen), met per regio de
// vereenvoudigde omtrek én het totale aantal z14-blokken.
//
// Draaien:  node --max-old-space-size=6144 scripts/build-zwblokken-regions.mjs
//
// Belangrijk: de blokaantallen worden berekend uit dezélfde vereenvoudigde
// omtrek die de app gebruikt om blokken aan een regio toe te wijzen. Teller en
// noemer komen dus uit één bron; een blok kan niet in de teller zitten zonder
// in de noemer mee te tellen.
//
// Bron: Natural Earth 1:10m (public domain), naturalearthdata.com

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "node_modules", ".cache", "natural-earth");
const OUT = join(ROOT, "src", "lib", "zwblokken", "regions.json");

const SOURCES = {
  countries:
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson",
  provinces:
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson",
};

const Z = 14;
const N = 2 ** Z;

// Vereenvoudiging in graden. Een blok is op onze breedte ~1,5 km, dus ~200 m
// afwijking op de grens verschuift hooguit een enkel blok naar de buren.
const TOLERANCE = 0.002;

async function load(name) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${name}.geojson`);
  if (!existsSync(file)) {
    process.stdout.write(`  ${name} downloaden...\n`);
    const res = await fetch(SOURCES[name]);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

// --- Douglas-Peucker ---
function perpendicular(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const c = t < 0 ? a : t > 1 ? b : [a[0] + t * dx, a[1] + t * dy];
  return Math.hypot(p[0] - c[0], p[1] - c[1]);
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicular(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist <= tolerance) return [points[0], points[points.length - 1]];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

function prepareRings(geometry, tolerance) {
  const polygons =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [];
  const rings = [];
  for (const poly of polygons) {
    for (const ring of poly) {
      const simplified = tolerance > 0 ? simplify(ring, tolerance) : ring;
      // Ringen die tot een lijn zijn ingeklapt dragen niets bij.
      if (simplified.length < 4) continue;
      rings.push(simplified.map(([lon, lat]) => [round(lon), round(lat)]));
    }
  }
  return rings;
}

const round = (n) => Math.round(n * 1e4) / 1e4; // ~11 m

// --- rasteriseren: hoeveel z14-blokken heeft deze regio? ---
const latOfRow = (j) =>
  (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - (2 * (j + 0.5)) / N)));
const rowOfLat = (lat) => {
  const c = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const r = (c * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * N;
};
const lonToCentreIndex = (lon) => ((lon + 180) / 360) * N - 0.5;

/**
 * Telt de blokken waarvan het MIDDELPUNT binnen de ringen valt, via een
 * scanline-vulling met even-oddregel. Zelfde criterium als de point-in-polygon
 * hieronder, zodat teller en noemer bij elkaar passen.
 */
function countBlocks(rings) {
  let minLat = 90;
  let maxLat = -90;
  for (const ring of rings)
    for (const [, lat] of ring) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

  const jFrom = Math.max(0, Math.floor(rowOfLat(maxLat)) - 1);
  const jTo = Math.min(N - 1, Math.ceil(rowOfLat(minLat)) + 1);

  const perRow = new Map();
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      const [lo1, la1] = ring[i - 1];
      const [lo2, la2] = ring[i];
      if (la1 === la2) continue;
      const a = Math.max(jFrom, Math.floor(rowOfLat(Math.max(la1, la2))) - 1);
      const b = Math.min(jTo, Math.ceil(rowOfLat(Math.min(la1, la2))) + 1);
      for (let j = a; j <= b; j++) {
        const yc = latOfRow(j);
        const hit = la1 <= la2 ? yc >= la1 && yc < la2 : yc >= la2 && yc < la1;
        if (!hit) continue;
        const lon = lo1 + ((yc - la1) / (la2 - la1)) * (lo2 - lo1);
        let list = perRow.get(j);
        if (!list) perRow.set(j, (list = []));
        list.push(lon);
      }
    }
  }

  let total = 0;
  const mark = new Uint8Array(N);
  for (const [, crossings] of perRow) {
    if (crossings.length < 2) continue;
    crossings.sort((p, q) => p - q);
    const touched = [];
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const from = Math.max(0, Math.ceil(lonToCentreIndex(crossings[i])));
      const to = Math.min(N, Math.ceil(lonToCentreIndex(crossings[i + 1])));
      for (let x = from; x < to; x++)
        if (!mark[x]) {
          mark[x] = 1;
          touched.push(x);
          total++;
        }
    }
    for (const x of touched) mark[x] = 0;
  }
  return total;
}

function bboxOf(rings) {
  let minLon = 180;
  let minLat = 90;
  let maxLon = -180;
  let maxLat = -90;
  for (const ring of rings)
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  return [round(minLon), round(minLat), round(maxLon), round(maxLat)];
}

// --- hoofdprogramma ---
console.log("Natural Earth inlezen...");
const [countries, provinces] = await Promise.all([
  load("countries"),
  load("provinces"),
]);

const regions = [];

console.log("Europese landen...");
for (const f of countries.features) {
  if (f.properties.CONTINENT !== "Europe") continue;
  const code = f.properties.ISO_A2_EH; // ISO_A2 is -99 voor o.a. Frankrijk
  if (!code || code === "-99") continue;
  const rings = prepareRings(f.geometry, TOLERANCE);
  if (rings.length === 0) continue;
  regions.push({
    code,
    name: f.properties.NAME_NL ?? f.properties.NAME,
    level: "country",
    bbox: bboxOf(rings),
    blocks: countBlocks(rings),
    rings,
  });
  process.stdout.write(`  ${code} `);
}
console.log();

console.log("Nederlandse provincies...");
for (const f of provinces.features) {
  if (f.properties.admin !== "Netherlands") continue;
  const code = f.properties.iso_3166_2;
  // De Caribische bijzondere gemeenten zijn geen provincie.
  if (!code || code.startsWith("NL-BQ")) continue;
  const rings = prepareRings(f.geometry, 0); // provincies zijn klein: niet vereenvoudigen
  if (rings.length === 0) continue;
  regions.push({
    code,
    name: f.properties.name,
    level: "province",
    bbox: bboxOf(rings),
    blocks: countBlocks(rings),
    rings,
  });
  process.stdout.write(`  ${code} `);
}
console.log();

regions.sort((a, b) =>
  a.level === b.level ? a.name.localeCompare(b.name, "nl") : a.level.localeCompare(b.level),
);

writeFileSync(OUT, JSON.stringify({ zoom: Z, regions }));
const kb = Math.round(readFileSync(OUT).length / 1024);
console.log(`\n${regions.length} regio's -> ${OUT} (${kb} kB)`);
console.table(
  regions
    .filter((r) => r.level === "province" || ["NL", "BE", "DE", "FR", "ES"].includes(r.code))
    .map((r) => ({ code: r.code, naam: r.name, blokken: r.blocks })),
);
