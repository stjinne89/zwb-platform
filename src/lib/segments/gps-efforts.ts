// Segment- en coltijden die ZWB zelf meet uit een spoor met tijdstempels: een
// GPX-upload of de streams van een intervals.icu-rit. Een Strava-rit krijgt zijn
// tijden van Strava (sync.ts); dit is voor ritten die dat niet hebben.
//
// Een doorkomst is het moment waarop het spoor het dichtst bij een punt komt,
// geïnterpoleerd tussen de twee omliggende GPS-punten. Een poging op een segment
// loopt van een doorkomst langs het begin van de lijn tot de eerste doorkomst
// langs het eind daarna, en telt alleen als het spoor de lijn daartussen echt
// volgt. Zie docs/segmenttijden-uit-gps-onderzoek.md.
//
// Puur: geen database.

export type TimedPoint = { lat: number; lon: number; t: number };
export type LatLon = [number, number];

export type GpsEffort = {
  startMs: number;
  endMs: number;
  seconds: number;
};

type Visit = {
  /** Index van het tweede punt van het dichtstbijzijnde lijnstuk. */
  index: number;
  t: number;
  distance: number;
};

const M_PER_DEG_LAT = 110_540;
const M_PER_DEG_LON = 111_320;

/** Beginpunt en eindpunt van een Strava-segment: het spoor moet er zo dicht langs. */
export const SEGMENT_ENDPOINT_RADIUS_M = 35;
/** Hoe ver het spoor van de segmentlijn mag afwijken. */
export const SEGMENT_CORRIDOR_M = 40;
/** Welk deel van de lijn binnen de corridor moet liggen. */
export const SEGMENT_COVERAGE = 0.9;
/** Een startpunt uit een openbare bron ligt niet altijd precies op de weg. */
export const COL_START_RADIUS_M = 250;

const MAX_LINE_SAMPLES = 120;

function project(
  point: LatLon,
  a: LatLon,
  b: LatLon,
): { distance: number; fraction: number } {
  const cos = Math.cos((point[0] * Math.PI) / 180);
  const ax = (a[1] - point[1]) * M_PER_DEG_LON * cos;
  const ay = (a[0] - point[0]) * M_PER_DEG_LAT;
  const bx = (b[1] - point[1]) * M_PER_DEG_LON * cos;
  const by = (b[0] - point[0]) * M_PER_DEG_LAT;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const fraction =
    lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq));
  return { distance: Math.hypot(ax + fraction * dx, ay + fraction * dy), fraction };
}

function meters(a: LatLon, b: LatLon): number {
  return project(a, b, b).distance;
}

function at(point: TimedPoint): LatLon {
  return [point.lat, point.lon];
}

/**
 * Elke keer dat het spoor binnen `radius` van `target` komt, één doorkomst: het
 * dichtstbijzijnde moment van dat bezoek.
 */
export function passages(points: TimedPoint[], target: LatLon, radius: number): Visit[] {
  const visits: Visit[] = [];
  let current: Visit | null = null;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const { distance, fraction } = project(target, at(a), at(b));
    if (distance <= radius) {
      const t = a.t + fraction * (b.t - a.t);
      if (!current) current = { index: i, t, distance };
      else if (distance < current.distance) Object.assign(current, { index: i, t, distance });
    } else if (current) {
      visits.push(current);
      current = null;
    }
  }
  if (current) visits.push(current);
  return visits;
}

function trackLength(points: TimedPoint[], from: number, to: number): number {
  let total = 0;
  for (let i = Math.max(1, from); i <= to && i < points.length; i++) {
    total += meters(at(points[i - 1]), at(points[i]));
  }
  return total;
}

function lineLength(line: LatLon[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i++) total += meters(line[i - 1], line[i]);
  return total;
}

function followsLine(
  points: TimedPoint[],
  line: LatLon[],
  from: number,
  to: number,
): boolean {
  const stride = Math.max(1, Math.ceil(line.length / MAX_LINE_SAMPLES));
  const samples = line.filter((_, i) => i % stride === 0);
  let covered = 0;
  for (const sample of samples) {
    for (let i = Math.max(1, from); i <= to && i < points.length; i++) {
      if (project(sample, at(points[i - 1]), at(points[i])).distance <= SEGMENT_CORRIDOR_M) {
        covered += 1;
        break;
      }
    }
  }
  return covered / samples.length >= SEGMENT_COVERAGE;
}

function effort(startMs: number, endMs: number): GpsEffort | null {
  const seconds = Math.round((endMs - startMs) / 1000);
  return seconds > 0 ? { startMs, endMs, seconds } : null;
}

/**
 * Pogingen op een segment met een bekende lijn (van begin naar eind). Een rondje
 * dat het segment twee keer rijdt, geeft twee pogingen.
 */
export function matchSegmentLine(points: TimedPoint[], line: LatLon[]): GpsEffort[] {
  if (points.length < 2 || line.length < 2) return [];
  const starts = passages(points, line[0], SEGMENT_ENDPOINT_RADIUS_M);
  if (starts.length === 0) return [];
  const ends = passages(points, line[line.length - 1], SEGMENT_ENDPOINT_RADIUS_M);
  // Een omweg tussen begin en eind is geen poging op dit segment.
  const maxLength = lineLength(line) * 1.5 + 200;

  const efforts: GpsEffort[] = [];
  let after = -1;
  for (const end of ends) {
    // De laatste doorkomst bij het begin vóór dit eind. De eerste zou op een
    // heen-en-weer de doorkomst in de tegenrichting kunnen zijn.
    const start = latestBefore(starts, end, after);
    if (!start) continue;
    if (trackLength(points, start.index, end.index) > maxLength) continue;
    if (!followsLine(points, line, start.index, end.index)) continue;
    const found = effort(start.t, end.t);
    if (found) {
      efforts.push(found);
      after = end.index;
    }
  }
  return efforts;
}

function latestBefore(starts: Visit[], end: Visit, after: number): Visit | undefined {
  for (let i = starts.length - 1; i >= 0; i--) {
    const visit = starts[i];
    if (visit.index <= after) return undefined;
    if (visit.index <= end.index && visit.t < end.t) return visit;
  }
  return undefined;
}

/**
 * Pogingen op een col zonder segmentlijn: van de doorkomst bij het startpunt tot
 * de eerstvolgende doorkomst bij de top. Een rit die langs het startpunt komt en
 * pas veel later via een andere kant boven is, telt niet: het spoor ertussen mag
 * niet veel langer zijn dan de klim.
 */
export function matchColClimb(
  points: TimedPoint[],
  start: LatLon,
  summit: LatLon,
  summitRadius: number,
): GpsEffort[] {
  if (points.length < 2) return [];
  const starts = passages(points, start, COL_START_RADIUS_M);
  if (starts.length === 0) return [];
  const tops = passages(points, summit, summitRadius);
  // Haarspeldbochten maken de weg tot drie keer zo lang als hemelsbreed.
  const maxLength = meters(start, summit) * 3 + 1000;

  const efforts: GpsEffort[] = [];
  let after = -1;
  for (const top of tops) {
    // De laatste doorkomst bij het startpunt vóór deze top: wie eerst een rondje
    // door het dorp rijdt, begint pas bij de echte aanloop.
    const begin = latestBefore(starts, top, after);
    if (!begin) continue;
    if (trackLength(points, begin.index, top.index) > maxLength) continue;
    const found = effort(begin.t, top.t);
    if (found) {
      efforts.push(found);
      after = top.index;
    }
  }
  return efforts;
}
