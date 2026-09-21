// Wegdek in Zwift: waar ligt gravel, kassei of hout, en wat kost dat.
//
// Zwift rekent op elk wegdek met een eigen rolweerstand, en die hangt ook van
// het fietstype af: een racefiets zakt op onverhard weg (Crr 0,025 tegen 0,004
// op asfalt), een gravelbike verliest daar minder maar is op asfalt trager. Dat
// maakt de fietskeuze op een gemengde route pas een echte keuze.
//
// De vlakken komen uit ZwiftMap (polygons.ts, MIT). `zwift-data` kent geen
// wegdek. Onze routebibliotheek bewaart de vorm van een ronde elke 100 m in
// dezelfde coördinaten, dus per pacingsegment valt het wegdek op te zoeken
// zonder nieuwe data.

import { SURFACE_POLYGONS } from "@/lib/zwift/surfaces/polygons";
import type { Surface, SurfacePolygon } from "@/lib/zwift/surfaces/crr";

export {
  crrFor,
  SURFACE_LABELS,
  ZWIFT_CRR,
  type RollingClass,
  type Surface,
  type SurfacePolygon,
} from "@/lib/zwift/surfaces/crr";

/** Ray casting; de vlakken zijn klein genoeg om lat/lon als plat vlak te lezen. */
export function pointInPolygon(lat: number, lon: number, polygon: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lonI] = polygon[i];
    const [latJ, lonJ] = polygon[j];
    const crosses =
      lonI > lon !== lonJ > lon &&
      lat < ((latJ - latI) * (lon - lonI)) / (lonJ - lonI) + latI;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Het wegdek op dit punt in deze wereld; asfalt waar geen vlak ligt. */
export function surfaceAt(
  world: string | null | undefined,
  lat: number,
  lon: number,
  polygons: Record<string, SurfacePolygon[]> = SURFACE_POLYGONS,
): Surface {
  if (!world) return "tarmac";
  const list = polygons[world];
  if (!list) return "tarmac";
  return list.find((item) => pointInPolygon(lat, lon, item.polygon))?.type ?? "tarmac";
}

/** Het wegdek voor elk punt van een routevorm. */
export function surfacesAlongShape(
  world: string | null | undefined,
  shape: { lat: number[]; lon: number[] } | null | undefined,
  polygons: Record<string, SurfacePolygon[]> = SURFACE_POLYGONS,
): Surface[] {
  if (!shape?.lat?.length) return [];
  return shape.lat.map((lat, index) => surfaceAt(world, lat, shape.lon[index], polygons));
}
