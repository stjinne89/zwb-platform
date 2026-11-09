// De eigen rit in een ZRL-race, uit het bestand per seconde (intervals.icu):
// alleen voor het lid zelf. Puur: geen I/O.
//
// Het bestand begint zelden precies op de start. De uitlijning zoekt de
// verschuiving waarbij het gemiddelde vermogen over de eigen segmentpassages
// het best klopt met wat Zwift per passage gaf (gemeten 2026-10-13: op de watt
// gelijk bij 15 s). Zonder passages met vermogen geldt de starttijd van het
// bestand. Uitwerking: docs/zrl-analyse.md.
//
// Zonder klimsegmenten van Zwift (route niet in de routetabel) komen de
// klimmen uit het eigen hoogteprofiel (ride-story.ts). Het W′-model is dat van
// intervals.icu na deze rit; zonder dat model een schatting uit de curve.

import {
  cadenceStats,
  climbingMeters,
  durability,
  efforts,
  EFFORT_SHARE,
  heartStats,
  terrainBetween,
  terrainClimbs,
  terrainDescents,
  wbalAccount,
  type CadenceStats,
  type DurabilityRow,
  type Effort,
  type FatigueCurve,
  type HeartStats,
  type WbalAccount,
} from "@/lib/zrl-analysis/ride-story";

export type RideStreams = {
  /** Seconden vanaf de start van het bestand. */
  time: number[];
  watts: Array<number | null>;
  heartrate?: Array<number | null>;
  cadence?: Array<number | null>;
  /** Hoogte in m en afgelegde afstand in m, voor klimmen zonder Zwift-segmenten. */
  altitude?: Array<number | null>;
  distance?: Array<number | null>;
  torque?: Array<number | null>;
};

/** Een eigen segmentpassage, in seconden vanaf de eigen start van de race. */
export type RideAnchor = {
  name: string;
  /** Einde van het segment. */
  end: number;
  elapsed: number;
  avgPower: number | null;
  climb: boolean;
};

export type CurvePoint = { seconds: number; watts: number; activityId?: string | null };

export type RideInput = {
  streams: RideStreams;
  /** Bestandsstart min racestart, in seconden: het startpunt van de uitlijning. */
  startOffset: number;
  /** Finishtijd in seconden vanaf de eigen start. */
  finish: number;
  anchors: RideAnchor[];
  ftp: number | null;
  /** Beste vermogen per duur, bv. de laatste 90 dagen. */
  curve: CurvePoint[];
  /** CP en W′ van intervals.icu na deze rit; zonder: een schatting uit de curve. */
  model?: { cp: number; wPrime: number } | null;
  weightKg?: number | null;
  /** Drempelhartslag uit intervals.icu. */
  lthr?: number | null;
  /** Id van de rit in intervals.icu: staat die bij een punt van de curve, dan is dat een nieuw best. */
  activityId?: string | null;
  /** Vermoeide curves van intervals.icu (na 1000 en 2000 kJ). */
  fatigue?: FatigueCurve[];
};

export type RidePhase = {
  name: string;
  climb: boolean;
  from: number;
  to: number;
  avgWatts: number;
  np: number;
  intensity: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  cadence: number | null;
  /** Laagste W′-balans in dit stuk, in % van W′. */
  wbalMin: number | null;
  /** W′-balans aan het eind van dit stuk, in % van W′. */
  wbalEnd: number | null;
  /** W′-balans aan het begin van dit stuk, in % van W′. */
  wbalStart: number | null;
  /** Gemiddeld vermogen in de eerste en de tweede helft van dit stuk. */
  halves: { first: number; second: number } | null;
  /** Zoveel seconden voor het eind was de W′ voor het eerst op (≤ 5%); null als dat niet gebeurde. */
  emptyBeforeEnd: number | null;
  /** Na dit stuk: zoveel seconden tot de W′ weer boven 25% stond; null als hij niet zo laag kwam of niet herstelde. */
  recoveryAfter: number | null;
  /** Eigen beste vermogen over deze duur (uit de curve), voor een klim. */
  seasonBest: number | null;
  /** Netto hoogteverschil (m), afstand (m) en gemiddeld stijgingspercentage; null zonder hoogte. */
  gain: number | null;
  distance: number | null;
  grade: number | null;
  wkg: number | null;
  /** Meter stijgen per uur, voor een klim. */
  vam: number | null;
  /** Kilometer vanaf de eigen start waar dit stuk begint; null zonder afstand. */
  startKm: number | null;
};

export type RideBest = {
  seconds: number;
  watts: number;
  at: number;
  season: number | null;
  share: number | null;
  /** Het beste van de curve komt uit deze rit: een nieuw best over 90 dagen. */
  isNew: boolean;
};

export type RideModel = { cp: number; wPrime: number; source: "intervals" | "curve" };

export type RideAnalysis = {
  /** Gevonden verschuiving: racetijd = bestandstijd + offset. */
  offset: number;
  /** Hoeveel watt de uitlijning gemiddeld naast Zwifts passages zat, of null zonder ankers. */
  alignError: number | null;
  /** Het bestand begint zoveel seconden na de start (0 als het eerder begint). */
  missingStart: number;
  avgWatts: number;
  np: number;
  intensity: number | null;
  variability: number;
  kilojoules: number;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  cadence: number | null;
  phases: RidePhase[];
  best: RideBest[];
  /** Het W′-model: van intervals.icu na de rit, anders uit de curve (3 tot 20 minuten); null zonder. */
  cp: RideModel | null;
  /** Ter vergelijking: het model uit de 90-dagencurve en de laagste W′ daarmee, als het hoofdmodel van intervals.icu komt. */
  curveModel: { cp: number; wPrime: number; wbalMin: number } | null;
  /** De klimmen komen uit het eigen hoogteprofiel, niet uit Zwift-segmenten. */
  terrain: boolean;
  weightKg: number | null;
  wbal: WbalAccount | null;
  /** Versnellingen boven 150% van de FTP, tijd boven de FTP en seconden niet getrapt. */
  efforts: { threshold: number; list: Effort[]; aboveFtp: number; coasting: number } | null;
  /** Meters klimmen in de eerste en de tweede helft, om de helften eerlijk te lezen. */
  climbing: { first: number; second: number } | null;
  heart: HeartStats;
  cadenceStats: CadenceStats;
  durability: DurabilityRow[];
  wbalMin: { share: number; at: number } | null;
  /** Watt per hartslag op het eerste en het laatste vlakke stuk. */
  drift: { first: number; last: number; change: number } | null;
  /** Gemiddeld vermogen in de eerste en de tweede helft van de race (verdeling in een tijdrit). */
  halves: { first: number; second: number } | null;
  /** Het eerste tiende van de race tegenover het gemiddelde, in procent (100 = gelijk). */
  startShare: number | null;
  /** Seconden boven de FTP per cadansvak van 10 rpm. */
  cadenceAboveFtp: Array<{ from: number; seconds: number }>;
  /** Voor de grafiek: elke 10 s het gemiddelde over 30 s. */
  series: Array<{ t: number; watts: number; heartRate: number | null; wbal: number | null; altitude: number | null }>;
};

export const BEST_DURATIONS = [60, 120, 180, 300, 600, 1200, 1800, 2400];
/** W′ op of onder dit percentage: op. */
export const EMPTY_SHARE = 5;
/** Na een lege W′: hersteld vanaf dit percentage. */
export const RECOVERED_SHARE = 25;
const ALIGN_RANGE_S = 120;
const SERIES_STEP_S = 10;

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

/** Vermogen per racetijdseconde bij een gegeven verschuiving; ontbrekende seconden zijn null. */
function perRaceSecond(streams: RideStreams, offset: number, finish: number) {
  const length = Math.floor(finish) + 1;
  const watts: Array<number | null> = new Array(length).fill(null);
  const heart: Array<number | null> = new Array(length).fill(null);
  const cadence: Array<number | null> = new Array(length).fill(null);
  const altitude: Array<number | null> = new Array(length).fill(null);
  const distance: Array<number | null> = new Array(length).fill(null);
  const torque: Array<number | null> = new Array(length).fill(null);
  let joulesBefore = 0;
  streams.time.forEach((t, i) => {
    const r = Math.round(t + offset);
    if (r < 0) joulesBefore += streams.watts[i] ?? 0;
    if (r < 0 || r >= length) return;
    watts[r] = streams.watts[i] ?? 0;
    heart[r] = streams.heartrate?.[i] ?? null;
    cadence[r] = streams.cadence?.[i] ?? null;
    altitude[r] = streams.altitude?.[i] ?? null;
    distance[r] = streams.distance?.[i] ?? null;
    torque[r] = streams.torque?.[i] ?? null;
  });
  return { watts, heart, cadence, altitude, distance, torque, kjBefore: joulesBefore / 1000 };
}

function windowMean(watts: Array<number | null>, from: number, to: number): number | null {
  let sum = 0;
  let n = 0;
  for (let r = Math.max(0, Math.round(from)); r < Math.min(watts.length, Math.round(to)); r++) {
    const w = watts[r];
    if (w == null) continue;
    sum += w;
    n += 1;
  }
  return n ? sum / n : null;
}

/** Zoekt de verschuiving waarbij het bestand het best op Zwifts passages past; lange klimmen tellen zwaarder. */
export function alignRide(streams: RideStreams, startOffset: number, finish: number, anchors: RideAnchor[]) {
  const usable = anchors.filter((a) => a.avgPower && a.elapsed > 0);
  if (usable.length === 0) return { offset: Math.round(startOffset), error: null as number | null };
  let best = { offset: Math.round(startOffset), error: Infinity };
  for (let o = Math.round(startOffset) - ALIGN_RANGE_S; o <= Math.round(startOffset) + ALIGN_RANGE_S; o++) {
    const { watts } = perRaceSecond(streams, o, finish);
    let error = 0;
    let weight = 0;
    for (const a of usable) {
      const m = windowMean(watts, a.end - a.elapsed, a.end);
      if (m === null) {
        error = Infinity;
        break;
      }
      const w = Math.max(1, a.elapsed / 30);
      error += w * Math.abs(m - (a.avgPower as number));
      weight += w;
    }
    const score = weight ? error / weight : Infinity;
    if (score < best.error) best = { offset: o, error: score };
  }
  return { offset: best.offset, error: Number.isFinite(best.error) ? Math.round(best.error) : null };
}

/** Genormaliseerd vermogen: 30-s voortschrijdend gemiddelde tot de vierde macht. */
export function normalizedPower(watts: number[]): number {
  if (watts.length < 30) return Math.round(mean(watts));
  let window = 0;
  for (let i = 0; i < 30; i++) window += watts[i];
  const fourth: number[] = [(window / 30) ** 4];
  for (let i = 30; i < watts.length; i++) {
    window += watts[i] - watts[i - 30];
    fourth.push((window / 30) ** 4);
  }
  return Math.round(mean(fourth) ** 0.25);
}

/**
 * Critical power en W′ uit een vermogenscurve: P = W′/t + CP, kleinste
 * kwadraten over 3 tot 20 minuten. Null met minder dan drie punten of een
 * onzinnige uitkomst.
 */
export function fitCriticalPower(curve: CurvePoint[]): { cp: number; wPrime: number } | null {
  const points = curve.filter((p) => p.seconds >= 180 && p.seconds <= 1200 && p.watts > 0);
  if (points.length < 3) return null;
  const xs = points.map((p) => 1 / p.seconds);
  const ys = points.map((p) => p.watts);
  const mx = mean(xs);
  const my = mean(ys);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  if (den === 0) return null;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den;
  const cp = Math.round(my - slope * mx);
  const wPrime = Math.round(slope);
  return cp > 0 && wPrime > 2000 && wPrime < 60000 ? { cp, wPrime } : null;
}

/** W′-balans per seconde (Skiba, differentiële vorm). */
export function wPrimeBalance(watts: Array<number | null>, cp: number, wPrime: number): number[] {
  let balance = wPrime;
  return watts.map((w) => {
    const p = w ?? 0;
    if (p > cp) balance -= p - cp;
    else balance += ((cp - p) * (wPrime - balance)) / wPrime;
    return balance;
  });
}

function bestAverage(watts: Array<number | null>, seconds: number): { watts: number; at: number } | null {
  if (watts.length < seconds) return null;
  let sum = 0;
  for (let i = 0; i < seconds; i++) sum += watts[i] ?? 0;
  let best = { watts: sum / seconds, at: 0 };
  for (let i = seconds; i < watts.length; i++) {
    sum += (watts[i] ?? 0) - (watts[i - seconds] ?? 0);
    if (sum / seconds > best.watts) best = { watts: sum / seconds, at: i - seconds + 1 };
  }
  return { watts: Math.round(best.watts), at: best.at };
}

/** Beste vermogen over een duur, lineair tussen de punten van de curve; null buiten de curve. */
export function curveAt(curve: CurvePoint[], seconds: number): number | null {
  const points = [...curve].filter((p) => p.watts > 0).sort((a, b) => a.seconds - b.seconds);
  if (points.length === 0 || seconds < points[0].seconds || seconds > points[points.length - 1].seconds) return null;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.seconds === seconds) return p.watts;
    const next = points[i + 1];
    if (next && seconds > p.seconds && seconds < next.seconds) {
      const f = (seconds - p.seconds) / (next.seconds - p.seconds);
      return Math.round(p.watts + f * (next.watts - p.watts));
    }
  }
  return null;
}

/**
 * Stukken van de race: vlak tussen de klimmen, de klimmen zelf. Zonder
 * klimsegmenten van Zwift de klimmen uit het hoogteprofiel (`terrain`).
 */
export function ridePhases(
  anchors: RideAnchor[],
  finish: number,
  terrain: Array<{ from: number; to: number }> = [],
): Array<{ name: string; climb: boolean; from: number; to: number }> {
  const fromAnchors = anchors
    .filter((a) => a.climb)
    .map((a) => ({ name: a.name, from: Math.max(0, a.end - a.elapsed), to: a.end }));
  const climbs = (fromAnchors.length > 0 ? fromAnchors : terrain.map((c, i) => ({ name: `Klim ${i + 1}`, from: c.from, to: c.to }))).sort(
    (a, b) => a.from - b.from,
  );
  const phases: Array<{ name: string; climb: boolean; from: number; to: number }> = [];
  let at = 0;
  let flat = 1;
  for (const climb of climbs) {
    if (climb.from > at + 30) phases.push({ name: `Vlak ${flat++}`, climb: false, from: at, to: climb.from });
    phases.push({ name: climb.name, climb: true, from: climb.from, to: climb.to });
    at = climb.to;
  }
  if (finish > at + 30) phases.push({ name: `Vlak ${flat}`, climb: false, from: at, to: finish });
  return phases;
}

/** Laagste W′-balans in % bij een model, vanaf de eerste seconde met data. */
function lowestShare(watts: Array<number | null>, first: number, cp: number, wPrime: number): number {
  const bal = wPrimeBalance(watts, cp, wPrime);
  let low = Infinity;
  for (let i = Math.max(first, 0); i < bal.length; i++) low = Math.min(low, bal[i]);
  return Math.round((100 * low) / wPrime);
}

/** Een afdaling: gemiddeld minstens 1,5% omlaag. */
const DESCENT_GRADE = -1.5;
/** Een stuk korter dan dit (s) voegen we niet los toe. */
const MIN_PIECE_S = 30;

/** Vlakke stukken opdelen bij de afdalingen erin (uit het hoogteprofiel). */
function splitDescents(
  phases: Array<{ name: string; climb: boolean; from: number; to: number }>,
  descents: Array<{ from: number; to: number }>,
): Array<{ name: string; climb: boolean; from: number; to: number; descent?: boolean }> {
  return phases.flatMap((phase) => {
    if (phase.climb) return [phase];
    const inside = descents.filter((d) => d.to > phase.from + MIN_PIECE_S && d.from < phase.to - MIN_PIECE_S);
    if (inside.length === 0) return [phase];
    const pieces: Array<{ name: string; climb: boolean; from: number; to: number; descent?: boolean }> = [];
    let at = phase.from;
    for (const d of inside) {
      const from = Math.max(at, d.from);
      const to = Math.min(phase.to, d.to);
      // Een kort vlak stukje voor de afdaling hoort bij de afdaling.
      const start = from - at >= MIN_PIECE_S ? from : at;
      if (start > at) pieces.push({ ...phase, from: at, to: start });
      const last = pieces[pieces.length - 1];
      // Twee afdalingen direct achter elkaar zijn er een.
      if (last?.descent && last.to >= start) last.to = to;
      else pieces.push({ ...phase, from: start, to, descent: true });
      at = to;
    }
    if (phase.to - at >= MIN_PIECE_S) pieces.push({ ...phase, from: at, to: phase.to });
    else if (pieces.length) pieces[pieces.length - 1].to = phase.to;
    return pieces;
  });
}

export function analyseRide(input: RideInput): RideAnalysis {
  const { offset, error } = alignRide(input.streams, input.startOffset, input.finish, input.anchors);
  const { watts, heart, cadence, altitude, distance, torque, kjBefore } = perRaceSecond(input.streams, offset, input.finish);
  const first = watts.findIndex((w) => w != null);
  const present = watts.flatMap((w) => (w == null ? [] : [w]));
  const np = normalizedPower(present);
  const avgWatts = Math.round(mean(present));
  const hr = heart.flatMap((h) => (h && h > 0 ? [h] : []));
  const cad = cadence.flatMap((c) => (c && c > 0 ? [c] : []));
  const ftp = input.ftp && input.ftp > 0 ? input.ftp : null;
  const weight = input.weightKg && input.weightKg > 0 ? input.weightKg : null;

  const fitted = fitCriticalPower(input.curve);
  const given = input.model && input.model.cp > 0 && input.model.wPrime > 2000 ? input.model : null;
  const cp: RideModel | null = given
    ? { cp: Math.round(given.cp), wPrime: Math.round(given.wPrime), source: "intervals" }
    : fitted
      ? { ...fitted, source: "curve" }
      : null;
  const curveModel = given && fitted ? { ...fitted, wbalMin: lowestShare(watts, first, fitted.cp, fitted.wPrime) } : null;
  const wbal = cp ? wPrimeBalance(watts, cp.cp, cp.wPrime) : null;
  const share = (j: number) => (cp ? Math.round((100 * j) / cp.wPrime) : 0);

  const fromZwift = input.anchors.some((a) => a.climb);
  const terrain = fromZwift ? [] : terrainClimbs(altitude, distance);
  const descents = terrainDescents(altitude, distance);

  const startDistance = distance.find((d) => d != null) ?? null;
  const kmAt = (r: number) => {
    if (startDistance === null) return null;
    for (let k = Math.max(0, Math.round(r)); k < distance.length; k++) {
      const d = distance[k];
      if (d != null) return Math.round((d - startDistance) / 10) / 100;
    }
    return null;
  };

  let flatCount = 0;
  let descentCount = 0;
  const phases: RidePhase[] = splitDescents(ridePhases(input.anchors, input.finish, terrain), descents).map((raw) => {
    const shape = terrainBetween(altitude, distance, raw.from, raw.to);
    const descent = !raw.climb && (raw.descent || (shape?.grade != null && shape.grade <= DESCENT_GRADE));
    const name = raw.climb ? raw.name : descent ? `Afdaling ${++descentCount}` : `Vlak ${++flatCount}`;
    const phase = { ...raw, name };
    const startIndex = Math.round(Math.max(phase.from, first < 0 ? 0 : first));
    const endIndex = Math.round(phase.to);
    const middleIndex = Math.round((startIndex + endIndex) / 2);
    const part = (a: number, b: number) => watts.slice(a, b).flatMap((v) => (v == null ? [] : [v]));
    const firstPart = part(startIndex, middleIndex);
    const secondPart = part(middleIndex, endIndex);
    let emptyAt: number | null = null;
    let recovered: number | null = null;
    if (wbal && cp) {
      for (let r = startIndex; r < endIndex && r < wbal.length; r++) {
        if (share(wbal[r]) <= EMPTY_SHARE) {
          emptyAt = r;
          break;
        }
      }
      const endShare = share(wbal[Math.min(wbal.length - 1, endIndex)]);
      if (endShare < RECOVERED_SHARE) {
        for (let r = endIndex; r < wbal.length; r++) {
          if (share(wbal[r]) >= RECOVERED_SHARE) {
            recovered = r - endIndex;
            break;
          }
        }
      }
    }
    const from = Math.max(phase.from, first < 0 ? 0 : first);
    const range = (list: Array<number | null>) => list.slice(Math.round(from), Math.round(phase.to)).flatMap((v) => (v == null || v <= 0 ? [] : [v]));
    const w = watts.slice(Math.round(from), Math.round(phase.to)).flatMap((v) => (v == null ? [] : [v]));
    const h = range(heart);
    const c = range(cadence);
    const p = normalizedPower(w);
    const low = wbal ? Math.min(...wbal.slice(Math.round(from), Math.round(phase.to))) : null;
    const end = wbal ? wbal[Math.min(wbal.length - 1, Math.round(phase.to))] : null;
    const avg = Math.round(mean(w));
    const seconds = endIndex - startIndex;
    return {
      ...phase,
      from,
      avgWatts: avg,
      np: p,
      intensity: ftp ? Math.round((100 * p) / ftp) / 100 : null,
      avgHeartRate: h.length ? Math.round(mean(h)) : null,
      maxHeartRate: h.length ? Math.max(...h) : null,
      cadence: c.length ? Math.round(mean(c)) : null,
      wbalMin: low === null || !Number.isFinite(low) ? null : share(low),
      wbalEnd: end === null || end === undefined ? null : share(end),
      wbalStart: wbal ? share(wbal[Math.min(wbal.length - 1, startIndex)]) : null,
      halves: firstPart.length >= 30 && secondPart.length >= 30 ? { first: Math.round(mean(firstPart)), second: Math.round(mean(secondPart)) } : null,
      emptyBeforeEnd: emptyAt === null ? null : endIndex - emptyAt,
      recoveryAfter: recovered,
      seasonBest: phase.climb ? curveAt(input.curve, endIndex - startIndex) : null,
      gain: shape?.gain ?? null,
      distance: shape?.distance ?? null,
      grade: shape?.grade ?? null,
      wkg: weight ? Math.round((100 * avg) / weight) / 100 : null,
      vam: phase.climb && shape && shape.gain > 0 && seconds > 0 ? Math.round((shape.gain * 3600) / seconds) : null,
      startKm: kmAt(from),
    };
  });

  const season = new Map(input.curve.map((p) => [p.seconds, p]));
  const best: RideBest[] = BEST_DURATIONS.flatMap((d) => {
    const b = bestAverage(watts, d);
    if (!b || d > present.length) return [];
    const point = season.get(d) ?? null;
    const s = point?.watts ?? null;
    const isNew = Boolean(input.activityId && point?.activityId && point.activityId === input.activityId);
    return [{ seconds: d, watts: b.watts, at: b.at, season: s, share: s ? Math.round((100 * b.watts) / s) : null, isNew }];
  });

  let wbalMin: RideAnalysis["wbalMin"] = null;
  if (wbal) {
    let low = Infinity;
    let at = 0;
    wbal.forEach((v, i) => {
      if (i >= Math.max(first, 0) && v < low) {
        low = v;
        at = i;
      }
    });
    if (Number.isFinite(low)) wbalMin = { share: share(low), at };
  }

  const flats = phases.filter((p) => !p.climb && p.avgHeartRate);
  const drift =
    flats.length >= 2
      ? (() => {
          const a = flats[0].avgWatts / (flats[0].avgHeartRate as number);
          const b = flats[flats.length - 1].avgWatts / (flats[flats.length - 1].avgHeartRate as number);
          return { first: Math.round(a * 100) / 100, last: Math.round(b * 100) / 100, change: Math.round((100 * (b - a)) / a) };
        })()
      : null;

  const bins = new Map<number, number>();
  if (ftp) {
    watts.forEach((w, i) => {
      const c = cadence[i];
      if (w == null || w <= ftp || !c || c <= 0) return;
      const from = Math.floor(c / 10) * 10;
      bins.set(from, (bins.get(from) ?? 0) + 1);
    });
  }

  const series: RideAnalysis["series"] = [];
  for (let t = Math.max(first, 0); t < watts.length; t += SERIES_STEP_S) {
    const w = windowMean(watts, t - 15, t + 15);
    if (w === null) continue;
    const h = heart.slice(Math.max(0, t - 15), t + 15).flatMap((v) => (v && v > 0 ? [v] : []));
    const alt = altitude[t];
    series.push({
      t,
      watts: Math.round(w),
      heartRate: h.length ? Math.round(mean(h)) : null,
      wbal: wbal ? share(wbal[t]) : null,
      altitude: alt == null ? null : Math.round(alt * 10) / 10,
    });
  }

  const start = Math.max(first, 0);
  const middle = Math.round((start + watts.length) / 2);
  const firstHalf = watts.slice(start, middle).flatMap((w) => (w == null ? [] : [w]));
  const secondHalf = watts.slice(middle).flatMap((w) => (w == null ? [] : [w]));
  const halves =
    firstHalf.length >= 60 && secondHalf.length >= 60
      ? { first: Math.round(mean(firstHalf)), second: Math.round(mean(secondHalf)) }
      : null;
  const climbFirst = climbingMeters(altitude, start, middle);
  const climbSecond = climbingMeters(altitude, middle, watts.length);

  const tenth = Math.max(60, Math.round((watts.length - start) / 10));
  const opening = watts.slice(start, start + tenth).flatMap((w) => (w == null ? [] : [w]));
  const startShare = opening.length >= 60 && avgWatts > 0 ? Math.round((100 * mean(opening)) / avgWatts) : null;

  const threshold = ftp ? Math.round(EFFORT_SHARE * ftp) : null;
  const shares = wbal ? wbal.map((j) => share(j)) : null;

  return {
    offset,
    alignError: error,
    halves,
    startShare,
    missingStart: Math.max(0, first),
    avgWatts,
    np,
    intensity: ftp ? Math.round((100 * np) / ftp) / 100 : null,
    variability: avgWatts ? Math.round((100 * np) / avgWatts) / 100 : 1,
    kilojoules: Math.round(present.reduce((s, w) => s + w, 0) / 1000),
    avgHeartRate: hr.length ? Math.round(mean(hr)) : null,
    maxHeartRate: hr.length ? Math.max(...hr) : null,
    cadence: cad.length ? Math.round(mean(cad)) : null,
    phases,
    best,
    cp,
    curveModel,
    terrain: !fromZwift && terrain.length > 0,
    weightKg: weight,
    wbalMin,
    wbal: shares && first >= 0 ? wbalAccount(shares, watts, first) : null,
    efforts:
      threshold && ftp
        ? {
            threshold,
            list: efforts(watts, threshold),
            aboveFtp: present.filter((w) => w > ftp).length,
            coasting: present.filter((w) => w === 0).length,
          }
        : null,
    climbing: climbFirst !== null && climbSecond !== null ? { first: climbFirst, second: climbSecond } : null,
    heart: heartStats(watts, heart, start, input.lthr ?? null),
    cadenceStats: cadenceStats(watts, cadence, torque, ftp),
    durability: input.fatigue?.length ? durability(watts, kjBefore, input.fatigue, input.curve) : [],
    drift,
    cadenceAboveFtp: [...bins].sort((a, b) => a[0] - b[0]).map(([from, s]) => ({ from, seconds: s })),
    series,
  };
}
