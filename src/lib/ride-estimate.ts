// Fysisch snelheidsmodel voor een fietsrit: schat per routesegment de snelheid
// uit het beschikbare vermogen (watt) en de gradiënt, en accumuleert daaruit de
// doorkomsttijd. Pure logica (geen netwerk/DOM) zodat dit unit-testbaar is en
// zowel server- als clientside draait.
//
// Steady-state vermogensbalans op een helling (windstil — wind hoort bij de
// weergave, niet bij het tempo):
//   eff·P = ½·ρ·CdA·v³ + (Crr·m·g·cosθ + m·g·sinθ)·v
// met gradiënt g = rise/run, sinθ = g/√(1+g²), cosθ = 1/√(1+g²).

export type RouteSegment = {
  distanceM: number;
  /** rise/run, signed (positief = klimmen, negatief = dalen). */
  gradient: number;
  /** Beschikbaar tredvermogen op dit segment (de client vult dit per segment). */
  watts: number;
};

export type SegmentPace = {
  distanceM: number;
  gradient: number;
  speedMs: number;
  durationS: number;
};

export type RideEstimate = {
  totalSeconds: number;
  /** Cumulatieve seconden tot en met het einde van segment i. */
  cumulativeSecondsAtSegmentEnd: number[];
  segments: SegmentPace[];
};

export type RideEstimateInput = {
  segments: RouteSegment[];
  /** Totale massa rijder + uitrusting (kg). */
  totalMassKg: number;
  cda?: number;
  crr?: number;
  airDensity?: number;
  drivetrainEff?: number;
};

export const DEFAULT_CDA = 0.32; // m² — racefiets, handen op de kappen
export const DEFAULT_CRR = 0.005; // asfalt, racebanden
export const AIR_DENSITY = 1.225; // kg/m³ — zeeniveau, 15°C
export const DRIVETRAIN_EFF = 0.97;
export const G = 9.81;
export const DEFAULT_EQUIPMENT_KG = 9; // fiets + kleding + bidons
export const MIN_SPEED_MS = 1.5; // ~5.4 km/h — onder dit tempo lopen/stilstaan
export const MAX_SPEED_MS = 22; // ~79 km/h — algemene bovengrens
export const MAX_DESCENT_MS = 22; // ~79 km/h — afdaling-bovengrens

type SolveOpts = {
  cda: number;
  crr: number;
  airDensity: number;
  drivetrainEff: number;
  massKg: number;
};

/**
 * Lost de vermogensbalans op naar snelheid (m/s) via bisectie — bulletproof en
 * geen NaN/Infinity. Clampt het resultaat binnen realistische grenzen.
 */
export function solveSpeedMs(
  watts: number,
  gradient: number,
  opts: SolveOpts,
): number {
  const a = 0.5 * opts.airDensity * opts.cda; // v³-coëfficiënt
  const sinθ = gradient / Math.sqrt(1 + gradient * gradient);
  const cosθ = 1 / Math.sqrt(1 + gradient * gradient);
  const b = opts.crr * opts.massKg * G * cosθ + opts.massKg * G * sinθ; // v¹-coëfficiënt
  const c = Math.max(0, opts.drivetrainEff * watts);

  // f(v) = a·v³ + b·v − c. We zoeken de fysische (hoge) wortel.
  const f = (v: number) => a * v * v * v + b * v - c;

  const cap = gradient < 0 ? MAX_DESCENT_MS : MAX_SPEED_MS;
  // Ondergrens van het zoekinterval: bij b<0 (zwaartekracht > rolweerstand,
  // steile afdaling) ligt de stijgende tak rechts van v=√(−b/3a).
  let lo = MIN_SPEED_MS;
  if (b < 0) lo = Math.max(lo, Math.sqrt(-b / (3 * a)));
  let hi = cap;
  if (lo >= hi) return clampSpeed(lo, gradient);

  const flo = f(lo);
  const fhi = f(hi);
  // Geen tekenwissel → buiten bereik: clampen op de juiste grens.
  if (flo > 0) return clampSpeed(lo, gradient); // zelfs op min-tempo te weinig vermogen
  if (fhi < 0) return clampSpeed(hi, gradient); // meer vermogen dan de cap toelaat

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (fm > 0) hi = mid;
    else lo = mid;
  }
  return clampSpeed((lo + hi) / 2, gradient);
}

function clampSpeed(v: number, gradient: number): number {
  const cap = gradient < 0 ? MAX_DESCENT_MS : MAX_SPEED_MS;
  if (!Number.isFinite(v)) return MIN_SPEED_MS;
  return Math.min(cap, Math.max(MIN_SPEED_MS, v));
}

export function estimateRide(input: RideEstimateInput): RideEstimate {
  const opts: SolveOpts = {
    cda: input.cda ?? DEFAULT_CDA,
    crr: input.crr ?? DEFAULT_CRR,
    airDensity: input.airDensity ?? AIR_DENSITY,
    drivetrainEff: input.drivetrainEff ?? DRIVETRAIN_EFF,
    massKg: input.totalMassKg,
  };

  const segments: SegmentPace[] = [];
  const cumulativeSecondsAtSegmentEnd: number[] = [];
  let cum = 0;
  for (const seg of input.segments) {
    const speedMs = solveSpeedMs(seg.watts, seg.gradient, opts);
    const durationS = speedMs > 0 ? seg.distanceM / speedMs : 0;
    cum += durationS;
    segments.push({
      distanceM: seg.distanceM,
      gradient: seg.gradient,
      speedMs,
      durationS,
    });
    cumulativeSecondsAtSegmentEnd.push(cum);
  }

  return { totalSeconds: cum, cumulativeSecondsAtSegmentEnd, segments };
}

/**
 * Doorkomsttijd (seconden vanaf start) op een bepaalde km, lineair
 * geïnterpoleerd binnen het segment dat die km bevat. `segmentEndKms` zijn de
 * cumulatieve km aan het einde van elk segment (zelfde lengte als estimate.segments).
 */
export function arrivalSecondsAtKm(
  estimate: RideEstimate,
  segmentEndKms: number[],
  km: number,
): number {
  if (km <= 0 || estimate.segments.length === 0) return 0;
  const total = segmentEndKms[segmentEndKms.length - 1] ?? 0;
  if (km >= total) return estimate.totalSeconds;

  for (let i = 0; i < segmentEndKms.length; i++) {
    if (segmentEndKms[i] < km) continue;
    const prevKm = i === 0 ? 0 : segmentEndKms[i - 1];
    const prevSec = i === 0 ? 0 : estimate.cumulativeSecondsAtSegmentEnd[i - 1];
    const segKm = segmentEndKms[i] - prevKm;
    const frac = segKm > 0 ? (km - prevKm) / segKm : 0;
    return prevSec + frac * estimate.segments[i].durationS;
  }
  return estimate.totalSeconds;
}
