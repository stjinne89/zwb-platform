// Klim-detectie uit GPX-hoogtedata. Pure logica (geen DOMParser/netwerk), dus
// bruikbaar in client én server. Berekent per route de cols/klimmen met hun
// categorie (4e/3e/2e/1e/HC), lengte, hoogtemeters, gemiddeld en maximaal %.
//
// Bewust géén Strava/VeloViewer: we meten de klim uit de route zelf, dus er is
// geen segment-ambiguïteit ("welk segment hoort bij deze klim"). Een klim krijgt
// alleen een naam als hij dicht bij een bekende col uit de cols-tabel ligt.

import type { GpxPoint } from "@/lib/gpx";

export type ClimbCategory = "4e" | "3e" | "2e" | "1e" | "HC";

export type Climb = {
  /** Index (in de originele points-array) van voet en top van de klim. */
  startIdx: number;
  endIdx: number;
  startKm: number;
  endKm: number;
  lengthM: number;
  gainM: number;
  /** Gemiddeld stijgingspercentage over de hele klim. */
  avgGradient: number;
  /** Steilste stijging over een ~100 m-venster (minder ruisgevoelig). */
  maxGradient: number;
  category: ClimbCategory;
  /** Naam van de gematchte col (indien binnen detection-radius), anders null. */
  name: string | null;
  colSlug: string | null;
};

export type ColLite = {
  slug: string;
  name: string;
  summit_lat: number;
  summit_lon: number;
  detection_radius_m: number | null;
};

// Categorie-kleuren in ZWB-stijl (licht → zwaar). Verwijzen naar de CSS-vars
// uit globals.css zodat ze met het thema meekleuren.
export const CLIMB_CATEGORY_COLORS: Record<ClimbCategory, string> = {
  "4e": "var(--color-zwb-sage)",
  "3e": "var(--color-zwb-teal)",
  "2e": "var(--color-zwb-petrol)",
  "1e": "var(--color-zwb-petrol-dark)",
  HC: "var(--color-zwb-gold)",
};

// Concrete hex-waarden van dezelfde ZWB-kleuren — voor contexten waar CSS-vars
// niet werken (Leaflet zet `stroke` als SVG-attribuut, geen CSS-property).
export const CLIMB_CATEGORY_HEX: Record<ClimbCategory, string> = {
  "4e": "#7f9590",
  "3e": "#1f6068",
  "2e": "#004653",
  "1e": "#0a2b34",
  HC: "#b8873d",
};

// Klim-score = lengte(m) × gemiddeld %. Drempels per categorie (oplopend zwaar).
// Constanten staan hier zodat ze makkelijk te tunen zijn.
const CATEGORY_THRESHOLDS: { category: ClimbCategory; minScore: number }[] = [
  { category: "HC", minScore: 80_000 },
  { category: "1e", minScore: 64_000 },
  { category: "2e", minScore: 32_000 },
  { category: "3e", minScore: 16_000 },
  { category: "4e", minScore: 8_000 },
];

// Detectie-parameters.
const RESAMPLE_M = 25; // vaste afstand-stap voor stabiele gradiënt
const SMOOTH_WINDOW_M = 80; // voortschrijdend gemiddelde over de hoogte
const MAXGRAD_WINDOW_M = 100; // venster voor maximaal %
const MIN_GRADIENT = 0.03; // 3% — minimale stijging om als "klimmend" te tellen
const VALLEY_TOLERANCE_M = 10; // korte dip binnen een klim niet afkappen
const FLAT_BREAK_M = 250; // zoveel meter niet-stijgend → klim eindigt
const PEAK_EPS_M = 0.5; // minimale stijging om een nieuw "hoogste punt" te tellen
const MIN_GAIN_M = 30; // klimmen met minder hoogtewinst negeren

const R = 6371; // earth radius km

function haversineKm(a: GpxPoint, b: GpxPoint): number {
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

/**
 * Minimale afstand (meters) van punt p tot lijnsegment a→b via
 * equirectangulaire projectie. Voor col-schaal (<10km) ruim nauwkeurig.
 * (Zelfde aanpak als de Strava-col-detector, hier lokaal om geen
 * @mapbox/polyline-dependency mee te trekken.)
 */
function pointToSegmentMeters(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos(toRad(p[0]));

  const ax = (a[1] - p[1]) * mPerDegLon;
  const ay = (a[0] - p[0]) * mPerDegLat;
  const bx = (b[1] - p[1]) * mPerDegLon;
  const by = (b[0] - p[0]) * mPerDegLat;

  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.sqrt(ax * ax + ay * ay);
  let t = -(ax * dx + ay * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.sqrt(cx * cx + cy * cy);
}

function categoryFor(lengthM: number, avgGradientPct: number): ClimbCategory | null {
  const score = lengthM * avgGradientPct;
  for (const { category, minScore } of CATEGORY_THRESHOLDS) {
    if (score >= minScore) return category;
  }
  return null;
}

export const CLIMB_CATEGORY_LABELS: Record<ClimbCategory, string> = {
  "4e": "4e categorie",
  "3e": "3e categorie",
  "2e": "2e categorie",
  "1e": "1e categorie",
  HC: "Buiten categorie",
};

// Een op vaste afstand geresampled + gesmooth profielpunt, met een terugverwijzing
// naar de dichtstbijzijnde originele index (voor kaart-slicing).
type Resampled = { m: number; ele: number; srcIdx: number };

function buildResampled(points: GpxPoint[]): Resampled[] {
  // 1. Cumulatieve afstand (meters) + alleen punten mét hoogte meenemen.
  const cum: { m: number; ele: number; srcIdx: number }[] = [];
  let cumM = 0;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) cumM += haversineKm(points[i - 1], points[i]) * 1000;
    const ele = points[i].ele;
    if (ele === undefined) continue;
    cum.push({ m: cumM, ele, srcIdx: i });
  }
  if (cum.length < 2) return [];

  // 2. Resample op vaste afstand via lineaire interpolatie.
  const totalM = cum[cum.length - 1].m;
  const out: Resampled[] = [];
  let j = 0;
  for (let d = 0; d <= totalM; d += RESAMPLE_M) {
    while (j < cum.length - 2 && cum[j + 1].m < d) j++;
    const a = cum[j];
    const b = cum[j + 1] ?? a;
    const span = b.m - a.m;
    const t = span > 0 ? (d - a.m) / span : 0;
    const ele = a.ele + (b.ele - a.ele) * t;
    const srcIdx = t < 0.5 ? a.srcIdx : b.srcIdx;
    out.push({ m: d, ele, srcIdx });
  }

  // 3. Smooth de hoogte (voortschrijdend gemiddelde) — ruwe GPX-ele is rommelig.
  const win = Math.max(1, Math.round(SMOOTH_WINDOW_M / RESAMPLE_M));
  const smoothed = out.map((p, i) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - win); k <= Math.min(out.length - 1, i + win); k++) {
      sum += out[k].ele;
      n++;
    }
    return { ...p, ele: sum / n };
  });
  return smoothed;
}

function maxGradientOver(samples: Resampled[], from: number, to: number): number {
  const win = Math.max(1, Math.round(MAXGRAD_WINDOW_M / RESAMPLE_M));
  let max = 0;
  for (let i = from; i + win <= to; i++) {
    const dM = samples[i + win].m - samples[i].m;
    if (dM <= 0) continue;
    const grad = (samples[i + win].ele - samples[i].ele) / dM;
    if (grad > max) max = grad;
  }
  return max;
}

/**
 * Detecteer de klimmen in een GPX-route. Geeft een lege array terug bij
 * onvoldoende hoogtedata of een vlakke route.
 */
export function detectClimbs(points: GpxPoint[]): Climb[] {
  const samples = buildResampled(points);
  if (samples.length < 3) return [];

  const climbs: Climb[] = [];

  let i = 0;
  while (i < samples.length - 1) {
    // Zoek de start van een klim: een stijgende stap.
    if (samples[i + 1].ele - samples[i].ele <= 0) {
      i++;
      continue;
    }

    const startIdx = i;
    let peakIdx = i + 1;
    let peakEle = samples[i + 1].ele;
    let flatRun = 0;

    for (let k = i + 1; k < samples.length; k++) {
      const ele = samples[k].ele;
      if (ele > peakEle + PEAK_EPS_M) {
        // Echt hoger punt: verleng de klim en reset de vlak-teller.
        peakEle = ele;
        peakIdx = k;
        flatRun = 0;
      } else if (peakEle - ele <= VALLEY_TOLERANCE_M) {
        // Korte dip binnen de klim: tellen als (bijna) vlak, niet afkappen.
        flatRun += RESAMPLE_M;
        if (flatRun >= FLAT_BREAK_M) break;
      } else {
        // Echte daling voorbij de tolerantie → klim eindigt op de piek.
        break;
      }
    }
    const endIdx = peakIdx; // peakIdx >= startIdx+1, dus de lus vordert altijd

    const startM = samples[startIdx].m;
    const endM = samples[endIdx].m;
    const lengthM = endM - startM;
    const gainM = samples[endIdx].ele - samples[startIdx].ele;

    if (lengthM > 0 && gainM >= MIN_GAIN_M) {
      const avgGradient = (gainM / lengthM) * 100;
      if (avgGradient >= MIN_GRADIENT * 100) {
        const category = categoryFor(lengthM, avgGradient);
        if (category) {
          const maxGradient = maxGradientOver(samples, startIdx, endIdx) * 100;
          climbs.push({
            startIdx: samples[startIdx].srcIdx,
            endIdx: samples[endIdx].srcIdx,
            startKm: startM / 1000,
            endKm: endM / 1000,
            lengthM,
            gainM,
            avgGradient,
            maxGradient: Math.max(maxGradient, avgGradient),
            category,
            name: null,
            colSlug: null,
          });
        }
      }
    }

    // Ga verder vanaf de top; de daling erna wordt door de while-check
    // overgeslagen tot de volgende stijging.
    i = endIdx;
  }

  return climbs;
}

function nearestColInRange(
  points: GpxPoint[],
  startIdx: number,
  endIdx: number,
  cols: ColLite[],
): { name: string; slug: string } | null {
  let best: { name: string; slug: string; dist: number } | null = null;
  for (const col of cols) {
    const radius = col.detection_radius_m ?? 500;
    const summit: [number, number] = [col.summit_lat, col.summit_lon];
    let minDist = Infinity;
    for (let i = startIdx; i < endIdx; i++) {
      const a: [number, number] = [points[i].lat, points[i].lon];
      const b: [number, number] = [points[i + 1].lat, points[i + 1].lon];
      const d = pointToSegmentMeters(summit, a, b);
      if (d < minDist) minDist = d;
      if (minDist === 0) break;
    }
    if (minDist <= radius && (!best || minDist < best.dist)) {
      best = { name: col.name, slug: col.slug, dist: minDist };
    }
  }
  return best ? { name: best.name, slug: best.slug } : null;
}

// Een door de admin/creator opgeslagen klim-override: alleen het bereik + naam +
// categorie. De stats (lengte/hoogtemeters/%) worden uit de GPX herberekend.
export type ClimbRange = {
  startKm: number;
  endKm: number;
  name?: string | null;
  category?: ClimbCategory | null;
};

/**
 * Bouw Climb-objecten uit handmatige bereiken (admin-overrides). Stats komen uit
 * de GPX over het gekozen bereik; categorie en naam zijn override-baar (anders
 * automatisch berekend resp. via col-match). Zo wordt bv. een over-gesplitste
 * Col du Glandon één klim met de juiste totalen.
 */
export function climbsFromRanges(
  points: GpxPoint[],
  ranges: ClimbRange[],
  cols: ColLite[] = [],
): Climb[] {
  if (points.length < 2 || ranges.length === 0) return [];

  const cumKm: number[] = new Array(points.length);
  cumKm[0] = 0;
  for (let i = 1; i < points.length; i++) {
    cumKm[i] = cumKm[i - 1] + haversineKm(points[i - 1], points[i]);
  }
  const samples = buildResampled(points);

  const nearestIdx = (km: number): number => {
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < cumKm.length; i++) {
      const d = Math.abs(cumKm[i] - km);
      if (d < bd) {
        bd = d;
        best = i;
      } else if (cumKm[i] > km) {
        break;
      }
    }
    return best;
  };

  const out: Climb[] = [];
  for (const range of ranges) {
    let startIdx = nearestIdx(Math.min(range.startKm, range.endKm));
    let endIdx = nearestIdx(Math.max(range.startKm, range.endKm));
    if (endIdx <= startIdx) {
      if (startIdx < points.length - 1) endIdx = startIdx + 1;
      else startIdx = Math.max(0, endIdx - 1);
    }

    const startKm = cumKm[startIdx];
    const endKm = cumKm[endIdx];
    const lengthM = (endKm - startKm) * 1000;

    // Net hoogtewinst van eerste → laatste hoogte-punt in het bereik.
    let eleStart: number | undefined;
    let eleEnd: number | undefined;
    for (let i = startIdx; i <= endIdx; i++) {
      if (points[i].ele !== undefined) {
        eleStart = points[i].ele;
        break;
      }
    }
    for (let i = endIdx; i >= startIdx; i--) {
      if (points[i].ele !== undefined) {
        eleEnd = points[i].ele;
        break;
      }
    }
    const gainM =
      eleStart !== undefined && eleEnd !== undefined
        ? Math.max(0, eleEnd - eleStart)
        : 0;
    const avgGradient = lengthM > 0 ? (gainM / lengthM) * 100 : 0;

    // Max % over het bereik (resampled, ~100 m-venster).
    const startM = startKm * 1000;
    const endM = endKm * 1000;
    let fromS = 0;
    while (fromS < samples.length && samples[fromS].m < startM) fromS++;
    let toS = fromS;
    while (toS < samples.length && samples[toS].m <= endM) toS++;
    const maxGradient =
      samples.length > 0 ? maxGradientOver(samples, fromS, toS) * 100 : avgGradient;

    const category =
      range.category ?? categoryFor(lengthM, avgGradient) ?? "4e";

    let name = range.name?.trim() || null;
    let colSlug: string | null = null;
    if (!name && cols.length > 0) {
      const match = nearestColInRange(points, startIdx, endIdx, cols);
      if (match) {
        name = match.name;
        colSlug = match.slug;
      }
    }

    out.push({
      startIdx,
      endIdx,
      startKm,
      endKm,
      lengthM,
      gainM,
      avgGradient,
      maxGradient: Math.max(maxGradient, avgGradient),
      category,
      name,
      colSlug,
    });
  }
  return out;
}

/**
 * Geef elke klim de naam van de dichtstbijzijnde bekende col, mits de
 * summit binnen detection-radius van het klim-segment ligt. Muteert niet:
 * retourneert een nieuwe array.
 */
export function labelClimbsWithCols(
  climbs: Climb[],
  points: GpxPoint[],
  cols: ColLite[],
): Climb[] {
  if (cols.length === 0) return climbs;

  return climbs.map((climb) => {
    let best: { col: ColLite; dist: number } | null = null;
    for (const col of cols) {
      const radius = col.detection_radius_m ?? 500;
      const summit: [number, number] = [col.summit_lat, col.summit_lon];
      let minDist = Infinity;
      for (let i = climb.startIdx; i < climb.endIdx; i++) {
        const a: [number, number] = [points[i].lat, points[i].lon];
        const b: [number, number] = [points[i + 1].lat, points[i + 1].lon];
        const d = pointToSegmentMeters(summit, a, b);
        if (d < minDist) minDist = d;
        if (minDist === 0) break;
      }
      if (minDist <= radius && (!best || minDist < best.dist)) {
        best = { col, dist: minDist };
      }
    }
    return best
      ? { ...climb, name: best.col.name, colSlug: best.col.slug }
      : climb;
  });
}
