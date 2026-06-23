// Client-side GPX parsing. Extracts a polyline of [lat, lon, ele?] points
// plus aggregate stats (distance km, elevation gain m, start point).

export type GpxPoint = { lat: number; lon: number; ele?: number };

export type GpxSummary = {
  points: GpxPoint[];
  distance_km: number;
  elevation_m: number;
  start: GpxPoint | null;
};

const R = 6371; // earth radius km

/**
 * Berekent de initial bearing (graden, 0-360) tussen twee punten —
 * gebruikt voor "waar rijd je naartoe?" t.o.v. windrichting.
 */
export function gpxBearing(a: GpxPoint, b: GpxPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Afstand in km tussen twee punten (haversine). */
export function haversineKm(a: GpxPoint, b: GpxPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const haversine = haversineKm;

/** Cumulatieve afstand (km) per punt; cumKm[0] = 0. */
export function routeCumulativeKm(points: GpxPoint[]): number[] {
  const cum = new Array<number>(points.length);
  cum[0] = 0;
  for (let i = 1; i < points.length; i++) {
    cum[i] = cum[i - 1] + haversineKm(points[i - 1], points[i]);
  }
  return cum;
}

/**
 * Server-safe: haal ALLE trkpt-punten (lat/lon + geneste <ele>) uit GPX XML via
 * regex, zonder DOMParser (parseGpx() vereist DOMParser → alleen browser).
 */
export function allTrkptFromGpx(xml: string): GpxPoint[] {
  const re = /<trkpt\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/g;
  const points: GpxPoint[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1];
    const inner = m[2];
    const latMatch = attrs.match(/lat="([^"]+)"/);
    const lonMatch = attrs.match(/lon="([^"]+)"/);
    if (!latMatch || !lonMatch) continue;
    const lat = parseFloat(latMatch[1]);
    const lon = parseFloat(lonMatch[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    let ele: number | undefined;
    if (inner) {
      const eleMatch = inner.match(/<ele>\s*([^<]+?)\s*<\/ele>/);
      if (eleMatch) {
        const e = parseFloat(eleMatch[1]);
        if (Number.isFinite(e)) ele = e;
      }
    }
    points.push({ lat, lon, ele });
  }
  return points;
}

/**
 * Server-safe: haal de eerste twee trkpt-punten uit GPX XML via regex,
 * zonder DOMParser. Voor het berekenen van een initial bearing zonder
 * de hele GPX te parsen (parseGpx() vereist DOMParser → alleen browser).
 */
export function firstTwoTrkptFromGpx(xml: string): [GpxPoint, GpxPoint] | null {
  const re = /<trkpt\s+([^>]+)/g;
  const points: GpxPoint[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1];
    const latMatch = attrs.match(/lat="([^"]+)"/);
    const lonMatch = attrs.match(/lon="([^"]+)"/);
    if (!latMatch || !lonMatch) continue;
    const lat = parseFloat(latMatch[1]);
    const lon = parseFloat(lonMatch[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    points.push({ lat, lon });
    if (points.length >= 2) break;
  }
  return points.length >= 2 ? [points[0], points[1]] : null;
}

export function parseGpx(xmlText: string): GpxSummary {
  if (typeof DOMParser === "undefined") {
    throw new Error("parseGpx must run in the browser.");
  }
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const trkpts = Array.from(doc.getElementsByTagName("trkpt"));
  const points: GpxPoint[] = trkpts.map((el) => {
    const lat = parseFloat(el.getAttribute("lat") ?? "");
    const lon = parseFloat(el.getAttribute("lon") ?? "");
    const eleEl = el.getElementsByTagName("ele")[0];
    const ele = eleEl ? parseFloat(eleEl.textContent ?? "") : undefined;
    return { lat, lon, ele: Number.isFinite(ele) ? ele : undefined };
  }).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

  let distance = 0;
  let elevation = 0;
  for (let i = 1; i < points.length; i++) {
    distance += haversine(points[i - 1], points[i]);
    const a = points[i - 1].ele;
    const b = points[i].ele;
    if (a !== undefined && b !== undefined && b > a) elevation += b - a;
  }

  return {
    points,
    distance_km: Math.round(distance * 100) / 100,
    elevation_m: Math.round(elevation),
    start: points[0] ?? null,
  };
}
