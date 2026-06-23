// Route-sampling voor het rit-weer: zet een GPX-route om in (a) segmenten voor
// het snelheidsmodel (afstand + gesmoothde gradiënt + bij welke klim ze horen)
// en (b) een beperkt aantal weerpunten (lat/lon + lokale rijrichting) waarvoor
// we de uurforecast ophalen. Pure logica, server- en clientside bruikbaar.

import { gpxBearing, haversineKm, routeCumulativeKm, type GpxPoint } from "@/lib/gpx";
import type { Climb, ClimbCategory } from "@/lib/gpx-climbs";

const SEGMENT_M = 100; // resolutie van het tempo-model (gesmoothd)
const SMOOTH_WINDOW_M = 80; // hoogte-smoothing — ruwe GPX-ele is rommelig
const SAMPLE_KM = 10; // afstand tussen reguliere weerpunten
const MAX_SAMPLE_POINTS = 12; // Open-Meteo multi-point: bewust beperkt

export type ClimbInfo = {
  index: number;
  name: string | null;
  category: ClimbCategory;
  startKm: number;
  endKm: number;
};

export type RouteSampleSegment = {
  distanceM: number;
  gradient: number;
  /** Index in `climbs` als dit segment binnen een klim valt, anders null (basis). */
  climbIndex: number | null;
};

export type RouteWeatherSample = {
  km: number;
  lat: number;
  lon: number;
  /** Lokale rijrichting (graden) voor wind-classificatie. */
  bearing: number;
};

export type SampledRoute = {
  samples: RouteWeatherSample[];
  segments: RouteSampleSegment[];
  climbs: ClimbInfo[];
  totalKm: number;
  hasElevation: boolean;
};

type ElePoint = { m: number; ele: number };

// Forward-fill hoogte zodat punten zonder <ele> de laatst bekende waarde krijgen.
function elevationByMeter(points: GpxPoint[]): { series: ElePoint[]; hasElevation: boolean } {
  const series: ElePoint[] = [];
  let cumM = 0;
  let lastEle: number | undefined;
  let any = false;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) cumM += haversineKm(points[i - 1], points[i]) * 1000;
    const ele = points[i].ele;
    if (ele !== undefined) {
      lastEle = ele;
      any = true;
    }
    if (lastEle !== undefined) series.push({ m: cumM, ele: lastEle });
  }
  return { series, hasElevation: any && series.length >= 2 };
}

// Resample op vaste afstand met lineaire interpolatie + voortschrijdend gemiddelde.
function resampleSmoothed(series: ElePoint[], totalM: number): number[] {
  const raw: number[] = [];
  let j = 0;
  for (let d = 0; d <= totalM; d += SEGMENT_M) {
    while (j < series.length - 2 && series[j + 1].m < d) j++;
    const a = series[j];
    const b = series[j + 1] ?? a;
    const span = b.m - a.m;
    const t = span > 0 ? (d - a.m) / span : 0;
    raw.push(a.ele + (b.ele - a.ele) * t);
  }
  const win = Math.max(1, Math.round(SMOOTH_WINDOW_M / SEGMENT_M));
  return raw.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - win); k <= Math.min(raw.length - 1, i + win); k++) {
      sum += raw[k];
      n++;
    }
    return sum / n;
  });
}

function climbIndexForKm(climbs: Climb[], km: number): number | null {
  for (let i = 0; i < climbs.length; i++) {
    if (km >= climbs[i].startKm && km <= climbs[i].endKm) return i;
  }
  return null;
}

// Lat/lon op een bepaalde km, lineair geïnterpoleerd tussen de routepunten.
function pointAtKm(points: GpxPoint[], cumKm: number[], km: number): { lat: number; lon: number; idx: number } {
  if (km <= 0) return { lat: points[0].lat, lon: points[0].lon, idx: 0 };
  const last = points.length - 1;
  if (km >= cumKm[last]) return { lat: points[last].lat, lon: points[last].lon, idx: last };
  let i = 1;
  while (i < points.length && cumKm[i] < km) i++;
  const a = points[i - 1];
  const b = points[i];
  const span = cumKm[i] - cumKm[i - 1];
  const t = span > 0 ? (km - cumKm[i - 1]) / span : 0;
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t, idx: i - 1 };
}

function bearingAtIdx(points: GpxPoint[], idx: number): number {
  const a = points[Math.min(idx, points.length - 2)];
  // Kijk een paar punten vooruit voor een stabielere richting.
  const b = points[Math.min(idx + 3, points.length - 1)];
  if (!a || !b || (a.lat === b.lat && a.lon === b.lon)) return 0;
  return gpxBearing(a, b);
}

/**
 * Sample een route in tempo-segmenten + weerpunten. `climbs` komt uit de
 * bestaande klim-detectie (detectClimbs/climbsFromRanges) en bepaalt welk
 * segment bij welke klim hoort.
 */
export function sampleRoute(points: GpxPoint[], climbs: Climb[]): SampledRoute {
  const climbInfos: ClimbInfo[] = climbs.map((c, index) => ({
    index,
    name: c.name,
    category: c.category,
    startKm: c.startKm,
    endKm: c.endKm,
  }));

  if (points.length < 2) {
    return { samples: [], segments: [], climbs: climbInfos, totalKm: 0, hasElevation: false };
  }

  const cumKm = routeCumulativeKm(points);
  const totalKm = cumKm[cumKm.length - 1];
  const totalM = totalKm * 1000;
  const { series, hasElevation } = elevationByMeter(points);

  // --- Segmenten (tempo-model) ---
  const segments: RouteSampleSegment[] = [];
  if (hasElevation) {
    const eleS = resampleSmoothed(series, totalM);
    for (let i = 0; i < eleS.length - 1; i++) {
      const startM = i * SEGMENT_M;
      const endM = Math.min((i + 1) * SEGMENT_M, totalM);
      const distanceM = endM - startM;
      if (distanceM <= 0) continue;
      const gradient = (eleS[i + 1] - eleS[i]) / distanceM;
      const midKm = (startM + endM) / 2 / 1000;
      segments.push({ distanceM, gradient, climbIndex: climbIndexForKm(climbs, midKm) });
    }
  } else {
    // Geen hoogte → vlak; één segment per SEGMENT_M, gradiënt 0.
    for (let startM = 0; startM < totalM; startM += SEGMENT_M) {
      const distanceM = Math.min(SEGMENT_M, totalM - startM);
      if (distanceM <= 0) continue;
      segments.push({ distanceM, gradient: 0, climbIndex: null });
    }
  }
  if (segments.length === 0) {
    segments.push({ distanceM: totalM, gradient: 0, climbIndex: null });
  }

  // --- Weerpunten ---
  const candidateKms = new Set<number>();
  candidateKms.add(0);
  for (let km = SAMPLE_KM; km < totalKm; km += SAMPLE_KM) candidateKms.add(Math.round(km * 10) / 10);
  for (const c of climbs) candidateKms.add(Math.round(c.startKm * 10) / 10);
  candidateKms.add(Math.round(totalKm * 10) / 10);

  let kms = [...candidateKms].filter((k) => k >= 0 && k <= totalKm).sort((a, b) => a - b);
  // Dedup punten die te dicht bij elkaar liggen (<1.5 km), maar houd start/finish.
  const deduped: number[] = [];
  for (const k of kms) {
    if (deduped.length === 0 || k - deduped[deduped.length - 1] >= 1.5 || k === kms[kms.length - 1]) {
      deduped.push(k);
    }
  }
  kms = deduped;
  // Cap op MAX_SAMPLE_POINTS: gelijkmatig uitdunnen, start + finish behouden.
  if (kms.length > MAX_SAMPLE_POINTS) {
    const first = kms[0];
    const lastK = kms[kms.length - 1];
    const picked: number[] = [];
    for (let i = 0; i < MAX_SAMPLE_POINTS; i++) {
      const pos = Math.round((i / (MAX_SAMPLE_POINTS - 1)) * (kms.length - 1));
      picked.push(kms[pos]);
    }
    picked[0] = first;
    picked[picked.length - 1] = lastK;
    kms = [...new Set(picked)].sort((a, b) => a - b);
  }

  const samples: RouteWeatherSample[] = kms.map((km) => {
    const p = pointAtKm(points, cumKm, km);
    return { km, lat: p.lat, lon: p.lon, bearing: bearingAtIdx(points, p.idx) };
  });

  return { samples, segments, climbs: climbInfos, totalKm, hasElevation };
}
