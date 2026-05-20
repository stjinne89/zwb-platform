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

function haversine(a: GpxPoint, b: GpxPoint): number {
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
