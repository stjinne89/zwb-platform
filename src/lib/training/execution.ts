// Hoe een geplande training is uitgevoerd, uit het bestand per seconde: per
// herhaling van de werkblokken het vermogen tegenover het doel, en bij een lange
// gelijkmatige rit de ontkoppeling van vermogen en hartslag, en die van een lang
// gelijkmatig blok apart (de Duurtest, durability-test.ts). Puur: geen I/O.
// Wordt bewaard in de momentopname (`metrics_json.execution`), zodat de trainer
// het ziet zonder nieuw verzoek aan intervals.icu. Regels: training-advice.ts;
// onderbouwing: docs/racestrategie-onderzoek.md.

import { powerRangePercentForBlock, type WorkoutBlock } from "@/lib/training/workouts";

export type ExecutionRep = {
  label: string;
  /** Midden van de doelband in watt, of null zonder FTP of doel. */
  targetWatts: number | null;
  avgWatts: number;
  seconds: number;
};

export type ExecutionAnalysis = {
  version: 1;
  /** Seconden tussen het begin van het bestand en het begin van het schema. */
  offset: number;
  /** Herhalingen van de werkblokken (vanaf sweetspot), in volgorde. */
  reps: ExecutionRep[];
  /** Pw:HR eerste tegenover tweede helft, in procent; alleen bij een lange, gelijkmatige rit. */
  decoupling: number | null;
  /** Genormaliseerd gedeeld door gemiddeld vermogen over de hele rit. */
  variability: number | null;
  /**
   * Het langste gelijkmatige blok van minstens STEADY_BLOCK_MIN_MINUTES, alleen
   * dat blok. Ontbreekt in momentopnames van vóór 2026-10-16.
   */
  steady?: SteadyBlockAnalysis | null;
};

export type SteadyBlockAnalysis = {
  label: string;
  /** Gemeten minuten: het blok zonder zijn eerste STEADY_SETTLE_S. */
  minutes: number;
  avgWatts: number;
  avgHr: number;
  /** Pw:HR eerste tegenover tweede helft van het blok, in procent. */
  decoupling: number;
};

/** Een werkblok begint bij dit deel van de FTP (sweetspot); daaronder is het rust of duur. */
export const WORK_BLOCK_PCT = 88;
/** Langer dan dit (min) is geen herhaling maar een lang blok; daar meten we geen verval. */
const MAX_REP_MINUTES = 30;
/** Ontkoppeling alleen bij een rit van minstens zo lang (s) en zo gelijkmatig. */
export const DECOUPLING_MIN_S = 75 * 60;
export const DECOUPLING_MAX_VI = 1.1;
/** Het eerste stuk van een rit telt niet mee voor ontkoppeling: dan loopt de hartslag nog op. */
const DECOUPLING_SKIP_S = 10 * 60;
/** Een blok telt als gelijkmatig bij een doel van hooguit zo breed (%FTP), zonder burst. */
const STEADY_MAX_RANGE_PCT = 10;
/** Een gelijkmatig blok van minstens zo lang (min) krijgt een eigen ontkoppeling. */
export const STEADY_BLOCK_MIN_MINUTES = 45;
/** De eerste minuten van dat blok tellen niet mee: dan loopt de hartslag nog op naar het nieuwe vermogen. */
const STEADY_SETTLE_S = 5 * 60;
/** Zoveel van de seconden in het blok moet een vermogen én een hartslag hebben. */
const STEADY_MIN_COVERAGE = 0.8;
const ALIGN_STEP_S = 5;
const ALIGN_RANGE_S = [-120, 900] as const;

function mean(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

/** Vermogen per seconde vanaf de start van het bestand; null waar niets gemeten is. */
function perSecond(time: number[], values: Array<number | null>): Array<number | null> {
  const end = Math.max(0, ...time.map((t) => Math.round(t)));
  const out: Array<number | null> = new Array(end + 1).fill(null);
  time.forEach((t, i) => {
    const v = values[i];
    if (v != null) out[Math.round(t)] = v;
  });
  return out;
}

function windowMean(values: Array<number | null>, from: number, to: number): number | null {
  const slice = values.slice(Math.max(0, Math.round(from)), Math.max(0, Math.round(to))).filter((v): v is number => v != null);
  return slice.length ? mean(slice) : null;
}

function normalized(watts: number[]): number {
  if (watts.length < 30) return mean(watts);
  let window = 0;
  for (let i = 0; i < 30; i++) window += watts[i];
  const fourth = [(window / 30) ** 4];
  for (let i = 30; i < watts.length; i++) {
    window += watts[i] - watts[i - 30];
    fourth.push((window / 30) ** 4);
  }
  return mean(fourth) ** 0.25;
}

type PlannedSecond = {
  start: number;
  end: number;
  targetWatts: number | null;
  work: boolean;
  /** Eén vast doel, zonder burst: geschikt voor een eigen ontkoppeling. */
  steady: boolean;
  label: string;
};

/** Het schema als tijdlijn in seconden, met het doel per blok. */
export function plannedTimeline(blocks: WorkoutBlock[], ftp: number | null): PlannedSecond[] {
  let at = 0;
  return blocks.map((block) => {
    const seconds = Math.max(0, Math.round(block.durationMinutes * 60));
    const range = powerRangePercentForBlock(block, ftp);
    const mid = range ? (range[0] + range[1]) / 2 : null;
    const item = {
      start: at,
      end: at + seconds,
      targetWatts: mid !== null && ftp ? Math.round((mid * ftp) / 100) : null,
      work: mid !== null && mid >= WORK_BLOCK_PCT && block.durationMinutes <= MAX_REP_MINUTES,
      steady:
        range !== null && range[1] - range[0] <= STEADY_MAX_RANGE_PCT && !block.burstSeconds && block.intensity !== "rest",
      label: block.label,
    };
    at += seconds;
    return item;
  });
}

/**
 * Waar in het bestand het schema begint. Een rit in Zwift begint meestal met het
 * schema, buiten vaak met een stuk naar de start. We schuiven het geplande
 * vermogen langs het gemeten vermogen en nemen de verschuiving waarbij ze het
 * best overeenkomen (Pearson-correlatie, in stappen van 5 s).
 */
export function alignPlan(watts: Array<number | null>, timeline: PlannedSecond[]): number {
  const total = timeline.at(-1)?.end ?? 0;
  if (total === 0) return 0;
  const target = (t: number) => timeline.find((p) => t >= p.start && t < p.end)?.targetWatts ?? 0;
  const planned: number[] = [];
  for (let t = 0; t < total; t += ALIGN_STEP_S) planned.push(target(t));
  let best = { offset: 0, score: -Infinity };
  for (let o = ALIGN_RANGE_S[0]; o <= ALIGN_RANGE_S[1]; o += ALIGN_STEP_S) {
    const actual = planned.map((_, i) => windowMean(watts, o + i * ALIGN_STEP_S, o + (i + 1) * ALIGN_STEP_S));
    const pairs = planned.flatMap((p, i) => (actual[i] == null ? [] : [[p, actual[i] as number]]));
    if (pairs.length < planned.length * 0.8) continue;
    const mp = mean(pairs.map((x) => x[0]));
    const ma = mean(pairs.map((x) => x[1]));
    let cov = 0, vp = 0, va = 0;
    for (const [p, a] of pairs) {
      cov += (p - mp) * (a - ma);
      vp += (p - mp) ** 2;
      va += (a - ma) ** 2;
    }
    const score = vp > 0 && va > 0 ? cov / Math.sqrt(vp * va) : -Infinity;
    if (score > best.score) best = { offset: o, score };
  }
  return Number.isFinite(best.score) ? best.offset : 0;
}

/** Ontkoppeling binnen het langste gelijkmatige blok, of null als dat er niet is of te weinig gemeten is. */
function steadyBlock(
  timeline: PlannedSecond[],
  watts: Array<number | null>,
  heart: Array<number | null> | null,
  offset: number,
): SteadyBlockAnalysis | null {
  const block = timeline
    .filter((p) => p.steady && p.end - p.start >= STEADY_BLOCK_MIN_MINUTES * 60)
    .sort((a, b) => b.end - b.start - (a.end - a.start))[0];
  if (!block || !heart) return null;
  const from = offset + block.start + STEADY_SETTLE_S;
  const to = offset + block.end;
  if (from < 0 || to > watts.length) return null;
  const both: Array<[number, number]> = [];
  for (let t = from; t < to; t++) {
    const w = watts[t];
    const h = heart[t];
    if (w != null && h != null && h > 0) both.push([w, h]);
  }
  if (both.length < (to - from) * STEADY_MIN_COVERAGE) return null;
  const blockWatts = both.map(([w]) => w);
  const avgWatts = mean(blockWatts);
  if (avgWatts <= 0 || normalized(blockWatts) / avgWatts > DECOUPLING_MAX_VI) return null;
  const half = Math.floor(both.length / 2);
  const ratio = (pairs: Array<[number, number]>) => mean(pairs.map(([w]) => w)) / mean(pairs.map(([, h]) => h));
  const first = ratio(both.slice(0, half));
  const second = ratio(both.slice(half));
  return {
    label: block.label,
    minutes: Math.round((to - from) / 60),
    avgWatts: Math.round(avgWatts),
    avgHr: Math.round(mean(both.map(([, h]) => h))),
    decoupling: Math.round((1000 * (first - second)) / first) / 10,
  };
}

export function analyseExecution(
  streams: { time: number[]; watts: Array<number | null>; heartrate?: Array<number | null> },
  blocks: WorkoutBlock[],
  ftp: number | null,
): ExecutionAnalysis {
  const watts = perSecond(streams.time, streams.watts);
  const heart = streams.heartrate ? perSecond(streams.time, streams.heartrate) : null;
  const timeline = plannedTimeline(blocks, ftp);
  const hasWork = timeline.some((p) => p.work);
  const hasSteady = timeline.some((p) => p.steady && p.end - p.start >= STEADY_BLOCK_MIN_MINUTES * 60);
  const offset = hasWork || hasSteady ? alignPlan(watts, timeline) : 0;

  const reps: ExecutionRep[] = timeline.flatMap((p) => {
    if (!p.work) return [];
    // De eerste seconden van een herhaling komt het vermogen nog op gang.
    const settle = Math.min(10, Math.round((p.end - p.start) / 10));
    const avg = windowMean(watts, offset + p.start + settle, offset + p.end);
    return avg === null ? [] : [{ label: p.label, targetWatts: p.targetWatts, avgWatts: Math.round(avg), seconds: p.end - p.start }];
  });

  const ridden = watts.flatMap((w) => (w == null ? [] : [w]));
  const avg = mean(ridden);
  const variability = ridden.length >= 60 && avg > 0 ? Math.round((100 * normalized(ridden)) / avg) / 100 : null;

  let decoupling: number | null = null;
  if (heart && ridden.length >= DECOUPLING_MIN_S && variability !== null && variability <= DECOUPLING_MAX_VI) {
    const start = DECOUPLING_SKIP_S;
    const middle = Math.round((start + watts.length) / 2);
    const ratio = (from: number, to: number) => {
      const w = windowMean(watts, from, to);
      const h = windowMean(heart, from, to);
      return w && h ? w / h : null;
    };
    const first = ratio(start, middle);
    const second = ratio(middle, watts.length);
    if (first && second) decoupling = Math.round((1000 * (first - second)) / first) / 10;
  }

  return { version: 1, offset, reps, decoupling, variability, steady: steadyBlock(timeline, watts, heart, offset) };
}
