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
