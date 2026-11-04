// Ladderadvies renner tegen renner, op volgorde: per duur onze beste tegen hun
// beste, nummer twee tegen nummer twee, tot en met vijf. Per paar het verschil in
// procenten (log-verschil, zoals elders in de ladder), en het voordeel van een
// duur is het gemiddelde van die verschillen. Geen teamgemiddelde van W/kg en
// geen toeval: wat er staat, volgt direct uit de vermogens (keuze eigenaar
// 2026-11-04).
//
// Per parcours telt elke duur naar wat het parcours vraagt, en met gewicht (als
// beide kanten het van minstens drie renners hebben) de W/kg omgerekend naar
// 75 kg op de hellingen van dat parcours, zoals in `rider-weight.ts`. Het
// overzicht per duur blijft gewone W/kg.

import { averageWeight, routeWkg, weightsUsable } from "./rider-weight";
import type { DurationTerrain, DurationWeights, PowerDuration } from "./routes";
import { DURATIONS, type PowerWkg } from "./team-power";

export type PowerSource = "intervals" | "90d" | "ladder";

export const LADDER_SIDE = 5;
/** Minimaal aantal paren in een duur voordat die meetelt. */
export const MIN_PAIRS = 3;

export type AdviceRider = {
  /** Uniek binnen een kant (Zwift-ID, profiel- of rosterregel-id). */
  key: string;
  name: string;
  wkg: PowerWkg | null;
  /** Alleen om te rekenen; staat nergens los op de pagina. */
  weightKg: number | null;
  source: PowerSource | null;
};

export type IntervalsPower = {
  /** Beste watt per duur over 90 dagen uit intervals.icu. */
  watts: Record<PowerDuration, number | null>;
  /** Gewicht uit intervals.icu, anders van het profiel. */
  weightKg: number | null;
};

const hasPower = (wkg: PowerWkg | null | undefined) => Boolean(wkg && DURATIONS.some((d) => wkg[d] != null && wkg[d]! > 0));
const validKg = (kg: number | null | undefined): kg is number => kg != null && kg >= 30 && kg <= 200;
const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Vermogen van een renner met zijn bron. Van ons eigen team eerst intervals.icu
 * (de actueelste curve, keuze eigenaar 2026-11-04), dan 90 dagen van
 * ZwiftRacing, dan het beste uit de ladderraces. Intervals.icu geeft watt; die
 * delen we door het gewicht waarmee Zwift rekent (`zwiftWeightKg`), en zonder
 * dat door het gewicht uit intervals.icu of het profiel.
 */
export function riderPower(input: {
  intervals?: IntervalsPower | null;
  power90?: PowerWkg | null;
  ladder?: PowerWkg | null;
  zwiftWeightKg?: number | null;
}): { wkg: PowerWkg | null; source: PowerSource | null; weightKg: number | null } {
  const zwiftKg = validKg(input.zwiftWeightKg) ? input.zwiftWeightKg : null;
  const intervalsKg = zwiftKg ?? (validKg(input.intervals?.weightKg) ? input.intervals!.weightKg : null);
  if (input.intervals && intervalsKg) {
    const wkg = Object.fromEntries(
      DURATIONS.map((d) => {
        const watts = input.intervals!.watts[d];
        return [d, watts != null && watts > 0 ? round2(watts / intervalsKg) : null];
      }),
    ) as PowerWkg;
    if (hasPower(wkg)) return { wkg, source: "intervals", weightKg: intervalsKg };
  }
  if (hasPower(input.power90)) return { wkg: input.power90!, source: "90d", weightKg: zwiftKg ?? intervalsKg };
  if (hasPower(input.ladder)) return { wkg: input.ladder!, source: "ladder", weightKg: zwiftKg ?? intervalsKg };
  return { wkg: null, source: null, weightKg: zwiftKg ?? intervalsKg };
}

export type RiderPair = { ours: number; theirs: number; /** Ons verschil in hele procenten, + is wij sterker. */ pct: number };

export type DurationPairs = {
  duration: PowerDuration;
  pairs: RiderPair[];
  /** Gemiddeld verschil van de paren (log), null met minder dan drie paren. */
  edge: number | null;
};

/** Beide kanten op volgorde, beste tegen beste; zoveel paren als de kleinste kant. */
export function pairUp(ours: number[], theirs: number[]): { pairs: RiderPair[]; edge: number | null } {
  const a = ours.filter((v) => v > 0).sort((x, y) => y - x).slice(0, LADDER_SIDE);
  const b = theirs.filter((v) => v > 0).sort((x, y) => y - x).slice(0, LADDER_SIDE);
  const count = Math.min(a.length, b.length);
  const logs = Array.from({ length: count }, (_, i) => Math.log(a[i] / b[i]));
  return {
    pairs: logs.map((log, i) => ({ ours: a[i], theirs: b[i], pct: Math.round(log * 100) })),
    edge: count >= MIN_PAIRS ? logs.reduce((sum, v) => sum + v, 0) / count : null,
  };
}

/**
 * Sterkte per renner op een weging (log, 0 is gemiddeld voor de hele
 * vergelijking), alleen om onze vijf te kiezen: per duur tegenover het
 * meetkundig gemiddelde, zodat een ontbrekende duur niet als zwak telt.
 */
function strengths(values: Array<PowerWkg | null>, weights: DurationWeights): Array<number | null> {
  const reference = new Map<PowerDuration, number>();
  for (const d of DURATIONS) {
    const logs = values.map((v) => v?.[d]).filter((v): v is number => v != null && v > 0).map(Math.log);
    if (logs.length > 0) reference.set(d, logs.reduce((sum, v) => sum + v, 0) / logs.length);
  }
  return values.map((value) => {
    let sum = 0;
    let weightSum = 0;
    for (const d of DURATIONS) {
      const v = value?.[d];
      const ref = reference.get(d);
      if (v == null || v <= 0 || ref === undefined || !weights[d]) continue;
      sum += weights[d] * (Math.log(v) - ref);
      weightSum += weights[d];
    }
    return weightSum > 0 ? sum / weightSum : null;
  });
}

/** W/kg van een kant op dit parcours; wie geen gewicht heeft, krijgt het gemiddelde van zijn kant. */
function onRoute(riders: AdviceRider[], terrain: DurationTerrain | null, useWeight: boolean): Array<PowerWkg | null> {
  const fallback = averageWeight(riders.filter((rider) => hasPower(rider.wkg)));
  return riders.map((rider) => {
    if (!hasPower(rider.wkg)) return null;
    const kg = validKg(rider.weightKg) ? rider.weightKg : fallback;
    return useWeight && terrain && kg ? routeWkg(rider.wkg!, kg, terrain) : rider.wkg;
  });
}

/**
 * Onze vijf: wie het sterkst is op deze weging, aangevuld met wie geen
 * vermogen heeft. Een selectie van vijf blijft zo gewoon die vijf.
 */
function chooseFive(riders: AdviceRider[], values: Array<PowerWkg | null>, weights: DurationWeights) {
  const strength = strengths(values, weights);
  const rows = riders.map((rider, i) => ({ rider, value: values[i], strength: strength[i] }));
  const withPower = rows.filter((row) => row.strength != null).sort((a, b) => b.strength! - a.strength!);
  const without = rows.filter((row) => row.strength == null);
  return [...withPower, ...without].slice(0, LADDER_SIDE);
}

export type RouteEdge = {
  /** Voordeel op dit parcours (log), gewogen over de duren die er tellen. */
  edge: number;
  perDuration: Record<PowerDuration, number | null>;
  /** Onze vijf op dit parcours. */
  five: AdviceRider[];
  /** Van onze vijf zonder vermogen. */
  missing: string[];
  weightCounts: boolean;
};

const EQUAL: DurationWeights = { s15: 0.25, m1: 0.25, m5: 0.25, m20: 0.25 };

/**
 * Voordeel van ons op een parcours: per duur de paren op volgorde, dan de duren
 * gewogen naar het parcours. Null zonder een duur met minstens drie paren.
 */
export function routeEdge(input: {
  ours: AdviceRider[];
  theirs: AdviceRider[];
  weights: DurationWeights;
  terrain: DurationTerrain | null;
  /** Zet gewicht uit, om te zien wat het op dit parcours scheelt. */
  ignoreWeight?: boolean;
}): RouteEdge | null {
  const { ours, theirs, weights, terrain } = input;
  const powered = (riders: AdviceRider[]) => riders.filter((rider) => hasPower(rider.wkg));
  const weightCounts = !input.ignoreWeight && terrain != null && weightsUsable(powered(ours), powered(theirs));
  const five = chooseFive(ours, onRoute(ours, terrain, weightCounts), weights);
  const theirValues = onRoute(theirs, terrain, weightCounts);
  const perDuration = {} as Record<PowerDuration, number | null>;
  let sum = 0;
  let weightSum = 0;
  for (const d of DURATIONS) {
    const { edge } = pairUp(
      five.map((row) => row.value?.[d] ?? 0),
      theirValues.map((value) => value?.[d] ?? 0),
    );
    perDuration[d] = edge;
    if (edge != null && weights[d] > 0) {
      sum += weights[d] * edge;
      weightSum += weights[d];
    }
  }
  if (weightSum === 0) return null;
  return {
    edge: sum / weightSum,
    perDuration,
    five: five.map((row) => row.rider),
    missing: five.filter((row) => row.strength == null).map((row) => row.rider.name),
    weightCounts,
  };
}

/**
 * Het overzicht per duur in gewone W/kg: onze vijf (zonder selectie de vijf
 * besten over alle duren samen) tegen hun vijf, op volgorde.
 */
export function powerOverview(ours: AdviceRider[], theirs: AdviceRider[]): { durations: DurationPairs[]; missing: string[] } {
  const five = chooseFive(ours, ours.map((rider) => (hasPower(rider.wkg) ? rider.wkg : null)), EQUAL);
  return {
    durations: DURATIONS.map((duration) => ({
      duration,
      ...pairUp(
        five.map((row) => row.rider.wkg?.[duration] ?? 0),
        theirs.map((rider) => rider.wkg?.[duration] ?? 0),
      ),
    })),
    missing: five.filter((row) => row.strength == null).map((row) => row.rider.name),
  };
}
