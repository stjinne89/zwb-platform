// Het pacingplan: van een handvol accenten naar watt per honderd meter, en
// vandaar naar tijden en een W′-balans.
//
// Een plan is een korte lijst stukken met een doel in w/kg — dat is wat de AI
// oplevert en wat het lid bijschuift. Het rekenmodel werkt op het segmentraster
// van de route. Dit bestand vertaalt tussen die twee, begrenst wat fysiologisch
// niet kan, en toetst het resultaat aan de anaerobe reserve.
//
// De volgorde is niet vrijblijvend: eerst uitrollen, dan begrenzen per stuk
// (niemand rijdt vijf minuten op zijn minuutvermogen), dan de W′-balans over het
// geheel. Een stuk kan op zichzelf haalbaar zijn en toch onhaalbaar in
// combinatie met wat eraan voorafging.

import {
  arrivalSecondsAtKm,
  DEFAULT_EQUIPMENT_KG,
  estimateRide,
  wattsForSpeed,
  type RideEstimate,
  type RouteSegment,
} from "@/lib/ride-estimate";
import { wattsAtDuration } from "@/lib/teams/power-profile";
import type { CpModel, CurvePoint } from "@/lib/pacing/cp";
import {
  deepestDrawPct,
  wPrimeBalance,
  type WPrimeBalance,
} from "@/lib/pacing/w-prime";
import { cpAfterKj, type DurabilityModel } from "@/lib/pacing/durability";
import {
  neutralSegmentMask,
  segmentEndKms,
  type PacingRoute,
} from "@/lib/pacing/route-profile";

export type PlanEffort =
  | "rustig"
  | "duur"
  | "tempo"
  | "drempel"
  | "vol";

export type PlanSegment = {
  startKm: number;
  endKm: number;
  targetWkg: number;
  label: string;
  effort: PlanEffort;
  /** Waarom dit stuk zo is ingedeeld; komt van de AI of van baseline.ts. */
  rationale?: string;
  /** Verwijst naar `route.accents` als dit stuk een accent is. */
  accentId?: string | null;
  /**
   * Een neutralisatie: vast tempo achter de wagen, geen eigen doel. Het getal in
   * targetWkg is dan alleen het vlakke equivalent, voor weergave elders.
   */
  kind?: "neutral";
};

/** Het tempo achter de wagen. Keuze van de eigenaar, 14 september 2026. */
export const NEUTRAL_SPEED_KMH = 30;
/** Nooit meer dan dit deel van CP, ook niet op een helling in de neutralisatie. */
export const NEUTRAL_MAX_CP_FRACTION = 0.7;

/**
 * Watt voor het neutrale tempo op deze helling, begrensd onder de drempel. Een
 * neutralisatie kost daardoor nooit anaerobe reserve, maar het werk telt wel mee
 * voor de vermoeidheid later in de rit.
 */
export function neutralWatts(
  gradient: number,
  model: CpModel,
  equipmentKg = DEFAULT_EQUIPMENT_KG,
): number {
  const needed = wattsForSpeed(NEUTRAL_SPEED_KMH / 3.6, gradient, model.weightKg + equipmentKg);
  return Math.min(needed, model.cpWatts * NEUTRAL_MAX_CP_FRACTION);
}

export type PlanEvaluation = {
  /** De onderliggende doorrekening, zodat doorkomsttijden per km te vragen zijn. */
  estimate: RideEstimate;
  /** Watt per routesegment, zoals doorgerekend. */
  watts: number[];
  totalSeconds: number;
  avgSpeedKmh: number;
  /** Gemiddeld vermogen gewogen naar tijd, niet naar afstand. */
  avgWatts: number;
  avgWkg: number;
  /** Verhouding tot CP — boven 1 is per definitie niet vol te houden. */
  intensityFactor: number;
  wPrime: WPrimeBalance;
  deepestDrawPct: number;
  /** Haalbaar zolang de reserve niet leeg raakt vóór de finish. */
  feasible: boolean;
  /** Doorkomst en inspanning per accent. */
  accents: Array<{
    accentIndex: number;
    arrivalSeconds: number;
    durationS: number;
    watts: number;
  }>;
};

/** Ondergrens: onder dit deel van CP is het geen plan maar stilstand. */
const MIN_FRACTION_OF_CP = 0.3;

/**
 * Wat een renner maximaal `durationS` lang kan. Het CP/W′-model geeft dat per
 * definitie: P(t) = CP + W′/t. Waar de gemeten vermogenscurve een lagere waarde
 * kent, wint die — een model is een aanname, een gemeten waarde niet.
 */
export function ceilingWatts(
  durationS: number,
  model: CpModel,
  curve?: CurvePoint[] | null,
): number {
  const modelled = model.cpWatts + model.wPrimeJoules / Math.max(1, durationS);
  const measured = curve?.length
    ? wattsAtDuration(curve, Math.round(durationS))
    : null;
  return measured ? Math.min(modelled, measured) : modelled;
}

/**
 * W/kg per segment, gegeven de cumulatieve km aan het einde van elk segment.
 * Los van PacingRoute zodat het rit-weer op de eventpagina dezelfde vertaling
 * kan gebruiken op zijn eigen segmentraster.
 */
export function wkgBySegment(plan: PlanSegment[], endKms: number[]): number[] {
  const sorted = [...plan].sort((a, b) => a.startKm - b.startKm);
  // Een stuk dat het plan niet noemt krijgt het láágste doel uit het plan, niet
  // het gemiddelde. Niet genoemd worden betekent dat niemand dat stuk belangrijk
  // vond; daar dan de mediaan van de pieken op loslaten maakt van een gat in het
  // plan stilzwijgend een inspanning — en trekt de W′-balans leeg zonder dat er
  // ergens staat waarom.
  const fallbackWkg =
    sorted.length > 0 ? Math.min(...sorted.map((item) => item.targetWkg)) : 2.5;

  return endKms.map((endKm, index) => {
    const startKm = index === 0 ? 0 : endKms[index - 1];
    const midKm = (startKm + endKm) / 2;
    const match = sorted.find((item) => midKm >= item.startKm && midKm < item.endKm);
    return match?.targetWkg ?? fallbackWkg;
  });
}

/** Watt per routesegment, uit de doelen per planstuk. */
export function expandPlanToWatts(
  plan: PlanSegment[],
  route: PacingRoute,
  weightKg: number,
): number[] {
  return wkgBySegment(plan, segmentEndKms(route.segments)).map(
    (wkg) => wkg * weightKg,
  );
}

export type EvaluateOptions = {
  /** Laat CP meezakken met het verzette werk; zie durability.ts. */
  durability?: DurabilityModel | null;
  equipmentKg?: number;
};

/**
 * Rekent een plan door: snelheid en tijd per segment via het fysische model,
 * daarna de W′-balans over het geheel.
 */
export function evaluatePlan(
  plan: PlanSegment[],
  route: PacingRoute,
  model: CpModel,
  options: EvaluateOptions = {},
): PlanEvaluation {
  const equipmentKg = options.equipmentKg ?? DEFAULT_EQUIPMENT_KG;
  // In een neutralisatie beslist de wagen, niet het plan: ook een plan van vóór
  // de zones rekent daar met het neutrale tempo.
  const neutral = neutralSegmentMask(route);
  const watts = expandPlanToWatts(plan, route, model.weightKg).map((value, index) =>
    neutral[index] ? neutralWatts(route.segments[index].gradient, model, equipmentKg) : value,
  );
  const modelSegments: RouteSegment[] = route.segments.map((segment, index) => ({
    distanceM: segment.distanceM,
    gradient: segment.gradient,
    watts: watts[index],
  }));

  const estimate = estimateRide({
    segments: modelSegments,
    totalMassKg: model.weightKg + equipmentKg,
  });
  const endKms = segmentEndKms(route.segments);

  const balance = wPrimeBalance(
    estimate.segments.map((segment, index) => ({
      durationS: segment.durationS,
      watts: watts[index],
      endKm: endKms[index],
    })),
    model.cpWatts,
    model.wPrimeJoules,
    options.durability
      ? { cpAfterKj: (kj) => cpAfterKj(options.durability!, model.cpWatts, kj) }
      : {},
  );

  const totalSeconds = estimate.totalSeconds;
  const weightedWatts =
    totalSeconds > 0
      ? estimate.segments.reduce(
          (sum, segment, index) => sum + watts[index] * segment.durationS,
          0,
        ) / totalSeconds
      : 0;

  // Per accent: wanneer je er bent, hoe lang je erin zit, op welk vermogen.
  const accents = route.accents.map((_, accentIndex) => {
    let arrivalSeconds = 0;
    let durationS = 0;
    let wattSeconds = 0;
    let seen = false;
    for (let i = 0; i < route.segments.length; i++) {
      if (route.segments[i].accentIndex !== accentIndex) {
        if (!seen) arrivalSeconds = estimate.cumulativeSecondsAtSegmentEnd[i];
        continue;
      }
      seen = true;
      durationS += estimate.segments[i].durationS;
      wattSeconds += watts[i] * estimate.segments[i].durationS;
    }
    return {
      accentIndex,
      arrivalSeconds,
      durationS,
      watts: durationS > 0 ? Math.round(wattSeconds / durationS) : 0,
    };
  });

  return {
    estimate,
    watts,
    totalSeconds,
    avgSpeedKmh: totalSeconds > 0 ? route.totalKm / (totalSeconds / 3600) : 0,
    avgWatts: Math.round(weightedWatts),
    avgWkg: model.weightKg > 0 ? weightedWatts / model.weightKg : 0,
    intensityFactor: model.cpWatts > 0 ? weightedWatts / model.cpWatts : 0,
    wPrime: balance,
    deepestDrawPct: deepestDrawPct(balance, model.wPrimeJoules),
    feasible: balance.depletedAtKm === null,
    accents,
  };
}

export type ClampNote = {
  label: string;
  fromWkg: number;
  toWkg: number;
  reason: "te lang op dit vermogen" | "onder de ondergrens";
};

/**
 * Begrenst elk planstuk op wat de renner die duur lang kan. De duur volgt uit
 * een eerste doorrekening; die verandert door het begrenzen zelf, maar alleen
 * naar langer — en langer betekent een lager plafond, dus we herhalen tot het
 * stabiel is.
 */
export function clampPlan(
  plan: PlanSegment[],
  route: PacingRoute,
  model: CpModel,
  curve?: CurvePoint[] | null,
  options: EvaluateOptions = {},
): { plan: PlanSegment[]; notes: ClampNote[] } {
  const notes: ClampNote[] = [];
  let current = plan.map((segment) => ({ ...segment }));

  for (let pass = 0; pass < 3; pass++) {
    const evaluation = evaluatePlan(current, route, model, options);
    const endKms = segmentEndKms(route.segments);
    let changed = false;

    const next = current.map((segment) => {
      if (segment.kind === "neutral") return segment;
      const durationS = durationOfRange(
        evaluation,
        endKms,
        segment.startKm,
        segment.endKm,
      );
      if (durationS <= 0) return segment;

      const maxWatts = ceilingWatts(durationS, model, curve);
      const minWatts = model.cpWatts * MIN_FRACTION_OF_CP;
      const targetWatts = segment.targetWkg * model.weightKg;

      if (targetWatts > maxWatts) {
        changed = true;
        const toWkg = round2(maxWatts / model.weightKg);
        if (pass === 0) {
          notes.push({
            label: segment.label,
            fromWkg: segment.targetWkg,
            toWkg,
            reason: "te lang op dit vermogen",
          });
        }
        return { ...segment, targetWkg: toWkg };
      }
      if (targetWatts < minWatts) {
        changed = true;
        const toWkg = round2(minWatts / model.weightKg);
        if (pass === 0) {
          notes.push({
            label: segment.label,
            fromWkg: segment.targetWkg,
            toWkg,
            reason: "onder de ondergrens",
          });
        }
        return { ...segment, targetWkg: toWkg };
      }
      return segment;
    });

    current = next;
    if (!changed) break;
  }

  return { plan: current, notes };
}

export type RebalanceResult = {
  plan: PlanSegment[];
  evaluation: PlanEvaluation;
  clampNotes: ClampNote[];
  /** Leesbare meldingen over wat er is teruggeschaald en waarom. */
  adjustments: string[];
};

/** Hoeveel van het overschot boven CP er per ronde af gaat. */
const REDUCTION_STEP = 0.15;
const MAX_REBALANCE_PASSES = 8;

/**
 * Zorgt dat een plan uitvoerbaar is: begrenst elk stuk op wat die duur toelaat,
 * en schaalt daarna de stukken bóven CP terug tot de W′-balans de finish haalt.
 * Alleen die stukken, want daar zit het verbruik; het rustige deel omlaag halen
 * maakt de rit alleen langer.
 *
 * Dit is de laatste stap voor élk plan — of het nu van de AI komt, van
 * baseline.ts, of van het lid dat een schuifregelaar heeft opgezet. Het model
 * mag de accenten kiezen; de fysica houdt het laatste woord.
 */
export function rebalancePlan(
  plan: PlanSegment[],
  route: PacingRoute,
  model: CpModel,
  curve?: CurvePoint[] | null,
  options: EvaluateOptions = {},
): RebalanceResult {
  const clamped = clampPlan(plan, route, model, curve, options);
  let current = clamped.plan;
  let evaluation = evaluatePlan(current, route, model, options);
  const adjustments: string[] = [];

  for (let pass = 0; pass < MAX_REBALANCE_PASSES; pass++) {
    if (evaluation.feasible) break;

    const cpWkg = model.cpWatts / model.weightKg;
    const above = current.filter(
      (segment) => segment.kind !== "neutral" && segment.targetWkg > cpWkg,
    );
    // Niets boven CP en tóch leeg: dan zit het in de klim-gradiënten zelf en
    // valt er met terugschalen niets meer te winnen.
    if (above.length === 0) break;

    current = current.map((segment) => {
      if (segment.kind === "neutral" || segment.targetWkg <= cpWkg) return segment;
      const excess = segment.targetWkg - cpWkg;
      return {
        ...segment,
        targetWkg: round2(cpWkg + excess * (1 - REDUCTION_STEP)),
      };
    });
    evaluation = evaluatePlan(current, route, model, options);
  }

  if (!evaluation.feasible) {
    adjustments.push(
      `Ook na terugschalen raakt je reserve op rond km ${evaluation.wPrime.depletedAtKm?.toFixed(1)}.`,
    );
  } else if (current !== clamped.plan) {
    adjustments.push(
      "De pieken zijn teruggeschaald zodat je anaerobe reserve de finish haalt.",
    );
  }

  return { plan: current, evaluation, clampNotes: clamped.notes, adjustments };
}

/** Korter dan dit na het uitknippen van een neutralisatie is geen stuk meer. */
const MIN_PIECE_KM = 0.1;

/**
 * Knipt de neutralisaties van de route als vaste stukken in een plan. Een stuk
 * dat erin valt verdwijnt, een stuk dat erover heen loopt wordt ingekort of in
 * tweeën gedeeld (label met "(vervolg)"), en een snipper die overblijft gaat op
 * in zijn buurman. Dit geldt voor elk plan — basisvoorstel, AI-voorstel,
 * overgenomen plan — zodat nergens een doel op een neutralisatie staat.
 */
export function imposeNeutralPieces(
  plan: PlanSegment[],
  route: PacingRoute,
  model: CpModel,
): PlanSegment[] {
  const zones = route.neutralZones ?? [];
  const pieces = plan.filter((segment) => segment.kind !== "neutral");
  if (zones.length === 0) return pieces.length === plan.length ? plan : pieces;

  const flatWkg = round2(neutralWatts(0, model) / model.weightKg);
  let out: PlanSegment[] = [...pieces].sort((a, b) => a.startKm - b.startKm);

  for (const zone of zones) {
    const next: PlanSegment[] = [];
    for (const segment of out) {
      if (segment.endKm <= zone.startKm || segment.startKm >= zone.endKm) {
        next.push(segment);
        continue;
      }
      if (segment.startKm < zone.startKm) {
        next.push({ ...segment, endKm: zone.startKm });
      }
      if (segment.endKm > zone.endKm) {
        next.push({
          ...segment,
          startKm: zone.endKm,
          label: segment.startKm < zone.startKm ? `${segment.label} (vervolg)` : segment.label,
        });
      }
    }
    next.push({
      startKm: zone.startKm,
      endKm: zone.endKm,
      targetWkg: flatWkg,
      label: zone.label,
      effort: "rustig",
      rationale: `Achter de wagen, ongeveer ${NEUTRAL_SPEED_KMH} km/u.`,
      accentId: null,
      kind: "neutral",
    });
    out = next.sort((a, b) => a.startKm - b.startKm);
  }

  // Snippers gaan op in de vorige buurman als die geen neutralisatie is, anders
  // in de volgende. Zonder zo'n buurman blijven ze staan: de route moet gedekt zijn.
  const merged: PlanSegment[] = [];
  let carryStartKm: number | null = null;
  out.forEach((segment, index) => {
    const tiny = segment.kind !== "neutral" && segment.endKm - segment.startKm < MIN_PIECE_KM;
    const previous = merged.at(-1);
    const following = out[index + 1];
    if (tiny && previous && previous.kind !== "neutral") {
      merged[merged.length - 1] = { ...previous, endKm: segment.endKm };
      return;
    }
    if (tiny && following && following.kind !== "neutral") {
      carryStartKm = segment.startKm;
      return;
    }
    merged.push(carryStartKm == null ? segment : { ...segment, startKm: carryStartKm });
    carryStartKm = null;
  });
  return merged;
}

/** Hoe lang een renner over het stuk tussen twee kilometerpunten doet. */
function durationOfRange(
  evaluation: PlanEvaluation,
  endKms: number[],
  startKm: number,
  endKm: number,
): number {
  const start = arrivalSecondsAtKm(evaluation.estimate, endKms, startKm);
  const end = arrivalSecondsAtKm(evaluation.estimate, endKms, endKm);
  return Math.max(0, end - start);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
