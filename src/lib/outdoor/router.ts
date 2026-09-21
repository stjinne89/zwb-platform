// Praten met een fietsrouteplanner.
//
// Standaard BRouter (brouter.de): gratis, sleutelloos, MIT, en gemaakt voor
// fietsroutes -- zijn profielen wegen ondergrond, fietspad en verkeersdrukte al
// mee uit OpenStreetMap. Dat is waarom hier geen heatmap nodig is: een heatmap
// is een benadering van precies die eigenschappen, en BRouter heeft ze direct.
// Zie docs/buitenrit-routevoorstel-spike.md.
//
// GraphHopper kan het ook, en heeft zelfs een echte rondrit-stand, maar vraagt
// een sleutel en dus een hostingbesluit. Daarom instelbaar via env en niet de
// standaard: zonder configuratie werkt deze feature gewoon.
//
// Wat hier NIET gebeurt: rondjes verzinnen. De keerpunten komen uit
// roundtrip.ts, zodat die meetkunde zonder netwerk te testen is.

import { safeFetch } from "@/lib/net/safe-fetch";
import type { GpxPoint } from "@/lib/gpx";
import type { LatLon } from "@/lib/outdoor/roundtrip";

const BROUTER_DEFAULT_BASE = "https://brouter.de";
const GRAPHHOPPER_BASE = "https://graphhopper.com/api/1/route";

/**
 * Meer punten maken de route niet beter, alleen de rij in de database groter.
 * Zeshonderd punten is op een rondje van zestig kilometer ongeveer één per
 * honderd meter -- ruim genoeg voor een hoogteprofiel en een kaartlijn.
 */
export const MAX_ROUTE_POINTS = 600;

export type RouterEngine = "brouter" | "graphhopper";

export type RouteResult =
  | { ok: true; points: GpxPoint[]; engine: RouterEngine }
  | { ok: false; error: string };

export function configuredEngine(): RouterEngine {
  return process.env.OUTDOOR_ROUTER === "graphhopper" ? "graphhopper" : "brouter";
}

/**
 * Het BRouter-profiel. `fastbike` past bij een racefiets (asfalt, doorrijden);
 * `trekking` kiest rustiger en vaker onverhard. Instelbaar, want welke van de
 * twee klopt hangt af van wat de leden onder de kont hebben.
 */
function brouterProfile(): string {
  return process.env.OUTDOOR_ROUTE_PROFILE?.trim() || "fastbike";
}

/** Houdt de rij hanteerbaar zonder de vorm van de route te verliezen. */
export function decimate(points: GpxPoint[], max = MAX_ROUTE_POINTS): GpxPoint[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  const out: GpxPoint[] = [];
  for (let i = 0; i < max; i += 1) out.push(points[Math.round(i * step)]);
  // Het eindpunt hoort er altijd bij: anders sluit het rondje niet.
  if (out[out.length - 1] !== points[points.length - 1]) {
    out[out.length - 1] = points[points.length - 1];
  }
  return out;
}

function coordsToPoints(coordinates: unknown): GpxPoint[] {
  if (!Array.isArray(coordinates)) return [];
  const points: GpxPoint[] = [];
  for (const entry of coordinates) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const lon = Number(entry[0]);
    const lat = Number(entry[1]);
    const ele = entry.length > 2 ? Number(entry[2]) : undefined;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    points.push({ lat, lon, ele: Number.isFinite(ele) ? ele : undefined });
  }
  return points;
}

/** Haalt de LineString uit een GeoJSON-antwoord, ongeacht de verpakking. */
export function pointsFromGeoJson(payload: unknown): GpxPoint[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;

  if (record.type === "FeatureCollection" && Array.isArray(record.features)) {
    for (const feature of record.features) {
      const geometry = (feature as { geometry?: Record<string, unknown> })?.geometry;
      if (geometry?.type === "LineString") return coordsToPoints(geometry.coordinates);
    }
    return [];
  }
  if (record.type === "Feature") {
    const geometry = record.geometry as Record<string, unknown> | undefined;
    if (geometry?.type === "LineString") return coordsToPoints(geometry.coordinates);
  }
  if (record.type === "LineString") return coordsToPoints(record.coordinates);
  return [];
}

/** Het GraphHopper-antwoord: paths[0].points is al GeoJSON met hoogte. */
export function pointsFromGraphHopper(payload: unknown): GpxPoint[] {
  const paths = (payload as { paths?: Array<{ points?: unknown }> })?.paths;
  if (!Array.isArray(paths) || paths.length === 0) return [];
  return pointsFromGeoJson(paths[0]?.points);
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const response = await safeFetch(url, {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Routeplanner gaf status ${response.status}.`);
  }
  return response.json();
}

/**
 * Een route langs de opgegeven punten. `waypoints` komt uit roundTripWaypoints,
 * dus het eerste en laatste punt zijn hetzelfde vertrekpunt.
 */
export async function routeAlong(
  waypoints: LatLon[],
  options: { timeoutMs?: number } = {},
): Promise<RouteResult> {
  if (waypoints.length < 2) return { ok: false, error: "Te weinig punten voor een route." };
  const timeoutMs = options.timeoutMs ?? 8000;
  const engine = configuredEngine();

  try {
    if (engine === "graphhopper") {
      const key = process.env.GRAPHHOPPER_API_KEY?.trim();
      if (!key) return { ok: false, error: "GRAPHHOPPER_API_KEY ontbreekt." };
      const url = new URL(GRAPHHOPPER_BASE);
      for (const point of waypoints) {
        url.searchParams.append("point", `${point.lat},${point.lon}`);
      }
      url.searchParams.set("profile", process.env.OUTDOOR_ROUTE_PROFILE?.trim() || "racingbike");
      url.searchParams.set("elevation", "true");
      url.searchParams.set("points_encoded", "false");
      url.searchParams.set("instructions", "false");
      url.searchParams.set("key", key);
      const points = pointsFromGraphHopper(await fetchJson(url.toString(), timeoutMs));
      return points.length >= 2
        ? { ok: true, points: decimate(points), engine }
        : { ok: false, error: "Routeplanner gaf geen bruikbare route terug." };
    }

    const base = (process.env.BROUTER_BASE_URL?.trim() || BROUTER_DEFAULT_BASE).replace(/\/+$/, "");
    const url = new URL(`${base}/brouter`);
    url.searchParams.set(
      "lonlats",
      waypoints.map((point) => `${point.lon},${point.lat}`).join("|"),
    );
    url.searchParams.set("profile", brouterProfile());
    url.searchParams.set("alternativeidx", "0");
    url.searchParams.set("format", "geojson");

    const points = pointsFromGeoJson(await fetchJson(url.toString(), timeoutMs));
    return points.length >= 2
      ? { ok: true, points: decimate(points), engine }
      : { ok: false, error: "Routeplanner gaf geen bruikbare route terug." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Route ophalen mislukt.",
    };
  }
}
