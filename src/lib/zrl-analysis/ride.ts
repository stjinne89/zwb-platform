// De eigen rit in een ZRL-race, uit het bestand per seconde (intervals.icu):
// alleen voor het lid zelf. Puur: geen I/O.
//
// Het bestand begint zelden precies op de start. De uitlijning zoekt de
// verschuiving waarbij het gemiddelde vermogen over de eigen segmentpassages
// het best klopt met wat Zwift per passage gaf (gemeten 2026-10-13: op de watt
// gelijk bij 15 s). Zonder passages met vermogen geldt de starttijd van het
// bestand. Uitwerking: docs/zrl-analyse.md.

export type RideStreams = {
  /** Seconden vanaf de start van het bestand. */
  time: number[];
  watts: Array<number | null>;
  heartrate?: Array<number | null>;
  cadence?: Array<number | null>;
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

export type CurvePoint = { seconds: number; watts: number };

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
};

export type RideBest = { seconds: number; watts: number; at: number; season: number | null; share: number | null };

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
  /** Critical power en W′ uit de curve (3 tot 20 minuten), of null als die te dun is. */
  cp: { cp: number; wPrime: number } | null;
  wbalMin: { share: number; at: number } | null;
  /** Watt per hartslag op het eerste en het laatste vlakke stuk. */
  drift: { first: number; last: number; change: number } | null;
  /** Gemiddeld vermogen in de eerste en de tweede helft van de race (verdeling in een tijdrit). */
  halves: { first: number; second: number } | null;
  /** Seconden boven de FTP per cadansvak van 10 rpm. */
  cadenceAboveFtp: Array<{ from: number; seconds: number }>;
  /** Voor de grafiek: elke 10 s het gemiddelde over 30 s. */
  series: Array<{ t: number; watts: number; heartRate: number | null; wbal: number | null }>;
};

export const BEST_DURATIONS = [60, 120, 180, 300, 600, 1200, 1800, 2400];
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
  streams.time.forEach((t, i) => {
    const r = Math.round(t + offset);
    if (r < 0 || r >= length) return;
    watts[r] = streams.watts[i] ?? 0;
    heart[r] = streams.heartrate?.[i] ?? null;
    cadence[r] = streams.cadence?.[i] ?? null;
  });
  return { watts, heart, cadence };
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

/** Stukken van de race: vlak tussen de klimmen, de klimmen zelf. */
export function ridePhases(anchors: RideAnchor[], finish: number): Array<{ name: string; climb: boolean; from: number; to: number }> {
  const climbs = anchors
    .filter((a) => a.climb)
    .map((a) => ({ name: a.name, from: Math.max(0, a.end - a.elapsed), to: a.end }))
    .sort((a, b) => a.from - b.from);
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

export function analyseRide(input: RideInput): RideAnalysis {
  const { offset, error } = alignRide(input.streams, input.startOffset, input.finish, input.anchors);
  const { watts, heart, cadence } = perRaceSecond(input.streams, offset, input.finish);
  const first = watts.findIndex((w) => w != null);
  const present = watts.flatMap((w) => (w == null ? [] : [w]));
  const np = normalizedPower(present);
  const avgWatts = Math.round(mean(present));
  const hr = heart.flatMap((h) => (h && h > 0 ? [h] : []));
  const cad = cadence.flatMap((c) => (c && c > 0 ? [c] : []));
  const ftp = input.ftp && input.ftp > 0 ? input.ftp : null;

  const cp = fitCriticalPower(input.curve);
  const wbal = cp ? wPrimeBalance(watts, cp.cp, cp.wPrime) : null;
  const share = (j: number) => (cp ? Math.round((100 * j) / cp.wPrime) : 0);

  const phases: RidePhase[] = ridePhases(input.anchors, input.finish).map((phase) => {
    const from = Math.max(phase.from, first < 0 ? 0 : first);
    const range = (list: Array<number | null>) => list.slice(Math.round(from), Math.round(phase.to)).flatMap((v) => (v == null || v <= 0 ? [] : [v]));
    const w = watts.slice(Math.round(from), Math.round(phase.to)).flatMap((v) => (v == null ? [] : [v]));
    const h = range(heart);
    const c = range(cadence);
    const p = normalizedPower(w);
    const low = wbal ? Math.min(...wbal.slice(Math.round(from), Math.round(phase.to))) : null;
    const end = wbal ? wbal[Math.min(wbal.length - 1, Math.round(phase.to))] : null;
    return {
      ...phase,
      from,
      avgWatts: Math.round(mean(w)),
      np: p,
      intensity: ftp ? Math.round((100 * p) / ftp) / 100 : null,
      avgHeartRate: h.length ? Math.round(mean(h)) : null,
      maxHeartRate: h.length ? Math.max(...h) : null,
      cadence: c.length ? Math.round(mean(c)) : null,
      wbalMin: low === null || !Number.isFinite(low) ? null : share(low),
      wbalEnd: end === null || end === undefined ? null : share(end),
    };
  });

  const season = new Map(input.curve.map((p) => [p.seconds, p.watts]));
  const best: RideBest[] = BEST_DURATIONS.flatMap((d) => {
    const b = bestAverage(watts, d);
    if (!b || d > present.length) return [];
    const s = season.get(d) ?? null;
    return [{ seconds: d, watts: b.watts, at: b.at, season: s, share: s ? Math.round((100 * b.watts) / s) : null }];
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
    series.push({
      t,
      watts: Math.round(w),
      heartRate: h.length ? Math.round(mean(h)) : null,
      wbal: wbal ? share(wbal[t]) : null,
    });
  }

  const middle = Math.round((Math.max(first, 0) + watts.length) / 2);
  const firstHalf = watts.slice(Math.max(first, 0), middle).flatMap((w) => (w == null ? [] : [w]));
  const secondHalf = watts.slice(middle).flatMap((w) => (w == null ? [] : [w]));
  const halves =
    firstHalf.length >= 60 && secondHalf.length >= 60
      ? { first: Math.round(mean(firstHalf)), second: Math.round(mean(secondHalf)) }
      : null;

  return {
    offset,
    alignError: error,
    halves,
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
    wbalMin,
    drift,
    cadenceAboveFtp: [...bins].sort((a, b) => a[0] - b[0]).map(([from, s]) => ({ from, seconds: s })),
    series,
  };
}
