// Sprint- en KOM-segmenten per Zwift-route, met Zwifts eigen segment-ID's.
//
// `zwift-data` kent de segmentvolgorde per route, maar niet de Zwift-ID's die
// `/api/segment-results` nodig heeft; koppelen op naam faalde voor 46 van de 80
// segmenten. Deze tabel komt uit de spelbestanden via Sauce for Zwift 2.3.3
// (`getRoutes`/`getSegments`), eenmalig geëxporteerd op 2026-09-22: 313 routes,
// 143 segmenten. Een nieuwe route van Zwift staat er pas in na een nieuwe export.

import data from "./route-segments.json";

export type RouteSegmentRef = {
  segmentId: string;
  name: string;
  /** Afstand vanaf de start van de ronde, zonder aanloop, in meters. */
  offsetM: number;
};

const table = data as unknown as {
  segments: Record<string, string>;
  routes: Record<string, Array<[string, number]>>;
};

/**
 * Segmenten van een route in rijvolgorde, voor het opgegeven aantal ronden.
 * Null als de route niet in de tabel staat.
 */
export function routeSegments(routeId: number | string, laps = 1): RouteSegmentRef[] | null {
  const lap = table.routes[String(routeId)];
  if (!lap) return null;
  const refs: RouteSegmentRef[] = [];
  for (let i = 0; i < Math.max(1, laps); i++) {
    for (const [segmentId, offsetM] of lap) {
      refs.push({ segmentId, name: table.segments[segmentId] ?? segmentId, offsetM });
    }
  }
  return refs;
}

/** Een sprint of KOM van zwift-data: slug, naam en km binnen de ronde. */
export type NamedSegment = { slug: string; name: string; kind: "climb" | "sprint"; startKm: number };

const normalized = (name: string) => name.toLowerCase().replace(/\brev\.?(?=\s|$)/g, "reverse").replace(/[^a-z0-9]/g, "");
const kindOfName = (name: string) => (/sprint/i.test(name) ? "sprint" : /kom|qom/i.test(name) ? "climb" : null);

/**
 * Zwifts segment-ID per slug van zwift-data. Eerst op naam binnen een kilometer
 * van de plek in de ronde, anders het dichtstbijzijnde segment van dezelfde soort
 * binnen 300 m. Op naam alleen faalt het in Richmond ("SPRINT"), op plek alleen
 * waar twee segmenten dicht bij elkaar liggen. Getoetst op alle routes van
 * zwift-data 2.1 (2026-10-26): 566 van de 607 sprints en KOM's gekoppeld; de rest
 * staat niet in de tabel of ligt meer dan een kilometer verschoven.
 */
export function matchSegmentIds(
  segments: NamedSegment[],
  lap: Array<[string, number]>,
  names: Record<string, string> = table.segments,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const segment of segments) {
    if (out.has(segment.slug)) continue;
    const candidates = lap
      .map(([segmentId, offsetM]) => ({ segmentId, name: names[segmentId] ?? "", distanceM: Math.abs(offsetM - segment.startKm * 1000) }))
      .sort((a, b) => a.distanceM - b.distanceM);
    const byName = candidates.find((c) => normalized(c.name) === normalized(segment.name) && c.distanceM <= 1000);
    const byPlace = candidates.find((c) => c.distanceM <= 300 && (kindOfName(c.name) ?? segment.kind) === segment.kind);
    const match = byName ?? byPlace;
    if (match) out.set(segment.slug, match.segmentId);
  }
  return out;
}

/** De ronde van een route uit de tabel: segment-ID en afstand vanaf de start van de ronde. */
export function routeLap(routeId: number | string): Array<[string, number]> | null {
  return table.routes[String(routeId)] ?? null;
}
