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
  descentSegmentIndex,
  neutralSegmentMask,
  segmentEndKms,
  type PacingRoute,
} from "@/lib/pacing/route-profile";
import {
  POWERUP_EFFECTS,
  positionCdaFactor,
  segmentCrr,
  type PowerupId,
  type RidePhysics,
  type RidePosition,
} from "@/lib/pacing/zwift-setup";

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
   * "neutral": vast tempo achter de wagen, geen eigen doel; targetWkg is dan
   * alleen het vlakke equivalent, voor weergave elders.
   * "descent": een lange afdaling. Het doel geldt op de steile delen en mag 0 zijn
   * (uitrollen); op vlakkere stukjes erin wordt minstens DESCENT_FLAT_CP_FRACTION
   * getrapt.
   * "start" en "sprint": alleen in een Zwift-wedstrijd. De eerste minuut gaat
   * het veld vol weg en de finish is een sprint; beide kosten W′ en worden niet
   * teruggeschaald, zodat de rest van het plan er ruimte voor houdt.
   */
  kind?: "neutral" | "descent" | "start" | "sprint";
  /** Zwift-wedstrijd: in de groep (slipstream) of alleen. Ontbreekt: in de groep. */
  position?: RidePosition;
  /** Zwift: powerup die aan het begin van dit stuk wordt ingezet. */
  powerup?: PowerupId | null;
};

/** Stukken die de route of het format oplegt, niet het lid of de AI. */
export const isFixedPiece = (segment: Pick<PlanSegment, "kind">) => segment.kind != null;

/** Vaste stukken die niet worden teruggeschaald of op tijd gezet. */
const keepsOwnTarget = (segment: Pick<PlanSegment, "kind">) =>
  segment.kind === "neutral" || segment.kind === "start" || segment.kind === "sprint";

/**
 * Binnen een afdaling: steiler dan dit en je rolt vanzelf hard genoeg. Vlakker,
 * dan trap je toch door — anders zakt het model naar wandeltempo.
 */
export const DESCENT_COAST_GRADIENT = -0.03;
export const DESCENT_FLAT_CP_FRACTION = 0.4;

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
  physics: { cda?: number; crr?: number } = {},
): number {
  const needed = wattsForSpeed(
    NEUTRAL_SPEED_KMH / 3.6,
    gradient,
    model.weightKg + equipmentKg,
    physics,
  );
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
  /**
   * Haalbaar zolang de reserve niet leeg raakt vóór de finish — en in een
   * Zwift-wedstrijd met sprint ook niet onder RACE_RESERVE_FRACTION zakt vóór
   * de sprint begint.
   */
  feasible: boolean;
  /** Km waar de reserve vóór de sprint te diep zakte, of null. */
  reserveShortAtKm: number | null;
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
  // Afdalingen en neutralisaties tellen niet mee: een afdaling op 0 zou elk gat
  // stil laten staan.
  const ridden = sorted.filter((item) => !isFixedPiece(item));
  const fallbackWkg =
    ridden.length > 0 ? Math.min(...ridden.map((item) => item.targetWkg)) : 2.5;

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
  /**
   * Zwift: fiets, format, slipstream, wegdek en powerups. Zonder dit rekent het
   * plan met de buitenfysica van ride-estimate.ts, zoals een .gpx-route.
   */
  ride?: RidePhysics | null;
};

/**
 * In een Zwift-wedstrijd houdt het plan tot de sprint minstens dit deel van W′
 * achter de hand: voor een aanval die je niet ziet aankomen. Keuze bij de bouw,
 * 21 september 2026.
 */
export const RACE_RESERVE_FRACTION = 0.15;

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
  const ride = options.ride ?? null;
  const equipmentKg = ride ? ride.bikeKg : (options.equipmentKg ?? DEFAULT_EQUIPMENT_KG);
  const endKms = segmentEndKms(route.segments);
  const physics = ride ? segmentPhysics(plan, route, model, ride, endKms) : null;
  // In een neutralisatie beslist de wagen, niet het plan: ook een plan van vóór
  // de zones rekent daar met het neutrale tempo.
  const neutral = neutralSegmentMask(route);
  const inDescent = descentSegmentIndex(route);
  const descentFloor = model.cpWatts * DESCENT_FLAT_CP_FRACTION;
  const watts = expandPlanToWatts(plan, route, model.weightKg).map((value, index) => {
    const gradient = route.segments[index].gradient;
    if (neutral[index]) {
      return neutralWatts(
        gradient,
        model,
        equipmentKg,
        physics ? { cda: physics[index].cda, crr: physics[index].crr } : {},
      );
    }
    // Uitrollen alleen waar het echt daalt; een vlak stukje in de afdaling trap je.
    if (inDescent[index] >= 0 && gradient > DESCENT_COAST_GRADIENT) {
      return Math.max(value, descentFloor);
    }
    return value;
  });
  const modelSegments: RouteSegment[] = route.segments.map((segment, index) => ({
    distanceM: segment.distanceM,
    gradient: segment.gradient,
    watts: watts[index],
    ...(physics ? physics[index] : {}),
  }));

  let estimate = estimateRide({
    segments: modelSegments,
    totalMassKg: model.weightKg + equipmentKg,
  });
  // Een powerup werkt een vast aantal seconden. Hoeveel meter dat is volgt pas
  // uit een eerste doorrekening; één tweede ronde volstaat, het verschil in
  // bereik is dan kleiner dan een segment.
  if (ride && physics && plan.some((piece) => piece.powerup)) {
    const boosted = applyPowerups(plan, route, model, ride, physics, estimate, endKms);
    estimate = estimateRide({
      segments: modelSegments.map((segment, index) => ({ ...segment, ...boosted[index] })),
      totalMassKg: model.weightKg + equipmentKg,
    });
  }

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

  // Tot de sprint minstens RACE_RESERVE_FRACTION van W′ over.
  let reserveShortAtKm: number | null = null;
  const sprint =
    ride?.format === "race" ? plan.find((piece) => piece.kind === "sprint") : undefined;
  if (sprint) {
    const floor = model.wPrimeJoules * RACE_RESERVE_FRACTION;
    const index = balance.balanceBySegment.findIndex(
      (value, i) => endKms[i] <= sprint.startKm + 1e-9 && value < floor,
    );
    if (index >= 0) reserveShortAtKm = endKms[index];
  }

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
    feasible: balance.depletedAtKm === null && reserveShortAtKm === null,
    reserveShortAtKm,
    accents,
  };
}

type SegmentPhysics = { cda: number; crr: number; massKg: number };

/** Het stuk waar elk segment in valt, op het midden van het segment; -1 = geen. */
function pieceIndexBySegment(plan: PlanSegment[], endKms: number[]): number[] {
  return endKms.map((endKm, index) => {
    const midKm = ((index === 0 ? 0 : endKms[index - 1]) + endKm) / 2;
    return plan.findIndex((piece) => midKm >= piece.startKm && midKm < piece.endKm);
  });
}

/** Zwift-fysica per segment: slipstream naar positie, rolweerstand naar wegdek. */
function segmentPhysics(
  plan: PlanSegment[],
  route: PacingRoute,
  model: CpModel,
  ride: RidePhysics,
  endKms: number[],
): SegmentPhysics[] {
  const pieces = pieceIndexBySegment(plan, endKms);
  return route.segments.map((segment, index) => {
    const piece = pieces[index] >= 0 ? plan[pieces[index]] : undefined;
    return {
      cda: ride.cda * positionCdaFactor(ride, piece?.position),
      crr: segmentCrr(ride, segment.surface),
      massKg: model.weightKg + ride.bikeKg,
    };
  });
}

/**
 * Legt het effect van elke powerup over de eerste seconden van zijn stuk. Een
 * segment dat maar deels binnen die seconden valt krijgt het effect naar rato:
 * een segment van 100 m duurt al snel tien seconden, en een aerohelm werkt er
 * vijftien. Een powerup die het event niet uitdeelt telt niet.
 */
function applyPowerups(
  plan: PlanSegment[],
  route: PacingRoute,
  model: CpModel,
  ride: RidePhysics,
  base: SegmentPhysics[],
  estimate: RideEstimate,
  endKms: number[],
): SegmentPhysics[] {
  const out = base.map((item) => ({ ...item }));
  const pieces = pieceIndexBySegment(plan, endKms);
  plan.forEach((piece, pieceIndex) => {
    const id = piece.powerup;
    if (!id || !ride.powerups.includes(id)) return;
    const effect = POWERUP_EFFECTS[id];
    const first = pieces.indexOf(pieceIndex);
    if (first < 0) return;

    let remaining = effect.durationS;
    for (let i = first; i < route.segments.length && remaining > 0; i++) {
      const durationS = estimate.segments[i].durationS;
      if (durationS <= 0) continue;
      const share = Math.min(1, remaining / durationS);
      remaining -= durationS;
      if (effect.maxGradient !== undefined && route.segments[i].gradient > effect.maxGradient) {
        continue;
      }
      const boosted = { ...out[i] };
      if (effect.riderMassFraction) boosted.massKg += model.weightKg * effect.riderMassFraction;
      if (effect.cdaFactor) boosted.cda *= effect.cdaFactor;
      if (effect.crr !== undefined) boosted.crr = Math.min(boosted.crr, effect.crr);
      if (effect.draftSavingFactor) {
        // Alleen wie in de slipstream zit heeft er iets aan.
        const factor = positionCdaFactor(ride, plan[pieces[i]]?.position);
        if (factor < 1) {
          const saving = Math.min(0.9, (1 - factor) * effect.draftSavingFactor);
          boosted.cda = (base[i].cda / factor) * (1 - saving);
        }
      }
      out[i] = {
        cda: out[i].cda + share * (boosted.cda - out[i].cda),
        crr: out[i].crr + share * (boosted.crr - out[i].crr),
        massKg: out[i].massKg + share * (boosted.massKg - out[i].massKg),
      };
    }
  });
  return out;
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
      // Op een afdaling is uitrollen juist de bedoeling.
      if (targetWatts < minWatts && segment.kind !== "descent") {
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
/** Een sprint die op de reserve wordt gezet, houdt een kleine marge voor afronding. */
const SPRINT_SPEND_SHARE = 0.9;
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
    // Start en sprint horen bij de wedstrijd; wat er te veel is, komt uit de
    // rest van het plan.
    const above = current.filter(
      (segment) => !keepsOwnTarget(segment) && segment.targetWkg > cpWkg,
    );
    // Niets boven CP en tóch leeg: dan zit het in de klim-gradiënten zelf en
    // valt er met terugschalen niets meer te winnen.
    if (above.length === 0) break;

    current = current.map((segment) => {
      if (keepsOwnTarget(segment) || segment.targetWkg <= cpWkg) return segment;
      const excess = segment.targetWkg - cpWkg;
      return {
        ...segment,
        targetWkg: round2(cpWkg + excess * (1 - REDUCTION_STEP)),
      };
    });
    evaluation = evaluatePlan(current, route, model, options);
  }

  // Raakt de reserve pas in de sprint op, dan is de sprint te zwaar voor wat er
  // nog over is: sprint met wat er over is. Leeg over de streep is precies goed.
  const sprint = current.find((segment) => segment.kind === "sprint");
  const depletedAt = evaluation.wPrime.depletedAtKm;
  if (
    !evaluation.feasible &&
    sprint &&
    evaluation.reserveShortAtKm === null &&
    depletedAt !== null &&
    depletedAt > sprint.startKm
  ) {
    const endKms = segmentEndKms(route.segments);
    const before = endKms.findLastIndex((endKm) => endKm <= sprint.startKm + 1e-9);
    const left = before >= 0 ? evaluation.wPrime.balanceBySegment[before] : model.wPrimeJoules;
    const durationS = durationOfRange(evaluation, endKms, sprint.startKm, sprint.endKm);
    if (durationS > 0) {
      const cp = evaluation.wPrime.finalCpWatts;
      const watts = cp + (SPRINT_SPEND_SHARE * left) / durationS;
      current = current.map((segment) =>
        segment === sprint
          ? { ...segment, targetWkg: Math.floor((watts / model.weightKg) * 100) / 100 }
          : segment,
      );
      evaluation = evaluatePlan(current, route, model, options);
      if (evaluation.feasible) {
        adjustments.push("De sprint is teruggezet naar wat je reserve op dat moment nog toelaat.");
      }
    }
  }

  if (!evaluation.feasible && evaluation.wPrime.depletedAtKm === null) {
    adjustments.push(
      `Ook na terugschalen zakt je reserve vóór de sprint onder ${Math.round(RACE_RESERVE_FRACTION * 100)} %, rond km ${evaluation.reserveShortAtKm?.toFixed(1)}.`,
    );
  } else if (!evaluation.feasible) {
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

/** Korter dan dit na het uitknippen van een vast stuk is geen stuk meer. */
const MIN_PIECE_KM = 0.1;
/** Zelfde grenzen binnen deze marge: hetzelfde stuk, dus het eigen doel blijft. */
const SAME_RANGE_KM = 0.05;

const isFixed = isFixedPiece;

/** De eerste minuut van een Zwift-wedstrijd, bij ongeveer 45 km/u. */
export const RACE_START_KM = 0.7;
/** De sprint naar de streep. */
export const RACE_SPRINT_KM = 0.3;
/** Korter dan dit heeft een apart start- en sprintstuk geen zin. */
const RACE_MIN_KM = 3;
/**
 * Standaarddoel als deel van W′ dat het stuk verbruikt: P = CP + aandeel·W′/t.
 * Niet "95 % van CP + W′/t": dat trekt per definitie de hele reserve leeg, en
 * op 20 s overschat het CP/W′-model een sprint ruim (bij CP 280 W en 20 kJ
 * komt dat op 17 w/kg). clampPlan legt er daarna de gemeten curve over.
 */
const RACE_START_SECONDS = 60;
const RACE_START_WPRIME_SHARE = 0.4;
const RACE_SPRINT_SECONDS = 20;
const RACE_SPRINT_WPRIME_SHARE = 0.5;

/**
 * Start en sprint van een Zwift-wedstrijd. Geen sprint als de finish op een
 * klim ligt: dan is die klim de finale, en daar ligt al een eigen stuk.
 */
export function raceFixedRanges(
  route: PacingRoute,
  ride: RidePhysics | null | undefined,
): Array<{ kind: "start" | "sprint"; startKm: number; endKm: number }> {
  if (ride?.format !== "race" || route.totalKm < RACE_MIN_KM) return [];
  const blocked = [...(route.neutralZones ?? []), ...(route.descents ?? [])];
  const free = (startKm: number, endKm: number) =>
    !blocked.some((range) => range.startKm < endKm && range.endKm > startKm);

  const out: Array<{ kind: "start" | "sprint"; startKm: number; endKm: number }> = [];
  const firstZone = (route.neutralZones ?? [])[0];
  const startKm = firstZone && firstZone.startKm <= 0.05 ? firstZone.endKm : 0;
  const startEnd = round3(startKm + RACE_START_KM);
  if (startEnd < route.totalKm - RACE_SPRINT_KM - 1 && free(startKm, startEnd)) {
    out.push({ kind: "start", startKm, endKm: startEnd });
  }
  // Op het raster van 100 m, zoals elke grens die de editor terugstuurt.
  const sprintStart = round3(Math.floor((route.totalKm - RACE_SPRINT_KM) * 10 + 1e-9) / 10);
  const finishOnClimb = route.accents.some(
    (accent) => accent.kind === "climb" && accent.endKm > sprintStart,
  );
  if (!finishOnClimb && free(sprintStart, route.totalKm)) {
    out.push({ kind: "sprint", startKm: sprintStart, endKm: route.totalKm });
  }
  return out;
}

/**
 * Knipt de neutralisaties en afdalingen van de route — en in een
 * Zwift-wedstrijd de start en de sprint — als eigen stukken in een plan. Een
 * stuk dat erin valt verdwijnt, een stuk dat erover heen loopt wordt ingekort
 * of in tweeën gedeeld (label met "(vervolg)"), en een snipper die overblijft
 * gaat op in zijn buurman. Dit geldt voor elk plan — basisvoorstel,
 * AI-voorstel, herberekening, overgenomen plan.
 *
 * Een neutralisatie heeft geen doel. Een afdaling wel: standaard 0 (uitrollen),
 * maar wie er zelf een doel op zette, houdt dat zolang de afdaling dezelfde is.
 * Start en sprint idem, met een standaarddoel dat een vast deel van W′ kost.
 */
export function imposeFixedPieces(
  plan: PlanSegment[],
  route: PacingRoute,
  model: CpModel,
  ride?: RidePhysics | null,
): PlanSegment[] {
  const zones = route.neutralZones ?? [];
  const descents = route.descents ?? [];
  const race = raceFixedRanges(route, ride);
  if (zones.length === 0 && descents.length === 0 && race.length === 0 && !plan.some(isFixed)) {
    return plan;
  }

  // Vaste stukken uit het plan eerst terug naar gewone stukken. Valt zo'n stuk
  // weer samen met een vast stuk van de route, dan knipt de lus hieronder het weg;
  // hoort het niet meer bij de route (verdwenen afdaling), dan blijft de route
  // gedekt in plaats van dat er een gat valt. Een start of sprint die niet meer
  // geldt (ander format) gaat op in zijn buurman: een los stuk van 300 m met
  // "Sprint" erboven zou nergens meer op slaan.
  const ridden = plan.filter((segment) => !isFixed(segment));
  const fallbackWkg =
    ridden.length > 0
      ? Math.min(...ridden.map((segment) => segment.targetWkg))
      : round2((model.cpWatts / model.weightKg) * 0.6);
  const racePieces = plan.filter(
    (segment) => segment.kind === "start" || segment.kind === "sprint",
  );
  const pieces: PlanSegment[] = absorbRanges(
    plan
      .filter((segment) => segment.kind !== "start" && segment.kind !== "sprint")
      .map((segment) => {
        if (!isFixed(segment)) return segment;
        const { kind, ...rest } = segment;
        return {
          ...rest,
          targetWkg: kind === "descent" ? Math.max(segment.targetWkg, fallbackWkg) : fallbackWkg,
          effort: "duur" as const,
        };
      }),
    racePieces,
  );

  const flatWkg = round2(neutralWatts(0, model) / model.weightKg);
  const previousDescent = (startKm: number, endKm: number) =>
    plan.find(
      (segment) =>
        segment.kind === "descent" &&
        Math.abs(segment.startKm - startKm) <= SAME_RANGE_KM &&
        Math.abs(segment.endKm - endKm) <= SAME_RANGE_KM,
    );

  const fixed: PlanSegment[] = [
    ...zones.map((zone) => ({
      startKm: zone.startKm,
      endKm: zone.endKm,
      targetWkg: flatWkg,
      label: zone.label,
      effort: "rustig" as const,
      rationale: `Achter de wagen, ongeveer ${NEUTRAL_SPEED_KMH} km/u.`,
      accentId: null,
      kind: "neutral" as const,
    })),
    ...descents.map((descent) => {
      const kept = previousDescent(descent.startKm, descent.endKm);
      return {
        startKm: descent.startKm,
        endKm: descent.endKm,
        targetWkg: kept?.targetWkg ?? 0,
        label: kept?.label ?? descent.name,
        effort: "rustig" as const,
        rationale:
          kept?.rationale ??
          `${(descent.endKm - descent.startKm).toFixed(1)} km à ${(descent.avgGradient * 100).toFixed(1)}%: uitrollen mag, trappen levert hier weinig tijd op.`,
        accentId: null,
        kind: "descent" as const,
      };
    }),
    ...race.map((range) => {
      const kept = plan.find(
        (segment) =>
          segment.kind === range.kind &&
          Math.abs(segment.startKm - range.startKm) <= SAME_RANGE_KM &&
          Math.abs(segment.endKm - range.endKm) <= SAME_RANGE_KM,
      );
      const seconds = range.kind === "start" ? RACE_START_SECONDS : RACE_SPRINT_SECONDS;
      const share = range.kind === "start" ? RACE_START_WPRIME_SHARE : RACE_SPRINT_WPRIME_SHARE;
      const defaultWkg = round2(
        (model.cpWatts + (share * model.wPrimeJoules) / seconds) / model.weightKg,
      );
      return {
        startKm: range.startKm,
        endKm: range.endKm,
        targetWkg: kept?.targetWkg ?? defaultWkg,
        label: kept?.label ?? (range.kind === "start" ? "Start" : "Sprint"),
        effort: "vol" as const,
        rationale:
          kept?.rationale ??
          (range.kind === "start"
            ? "Het veld gaat vol weg; wie hier niet meegaat, rijdt de rest alleen."
            : "De sprint naar de streep: hier mag de reserve op."),
        accentId: null,
        kind: range.kind,
        ...(kept?.position ? { position: kept.position } : {}),
        ...(kept?.powerup ? { powerup: kept.powerup } : {}),
      };
    }),
  ];

  let out: PlanSegment[] = [...pieces].sort((a, b) => a.startKm - b.startKm);
  for (const range of fixed) {
    const next: PlanSegment[] = [];
    for (const segment of out) {
      if (segment.endKm <= range.startKm || segment.startKm >= range.endKm) {
        next.push(segment);
        continue;
      }
      // Twee vaste stukken van de route overlappen niet: zones gaan vóór, en een
      // afdaling stopt bij een zone. Een eerder ingevoegd vast stuk blijft staan.
      if (isFixed(segment)) {
        next.push(segment);
        continue;
      }
      if (segment.startKm < range.startKm) {
        next.push({ ...segment, endKm: range.startKm });
      }
      if (segment.endKm > range.endKm) {
        next.push({
          ...segment,
          startKm: range.endKm,
          label:
            segment.startKm < range.startKm
              ? `${segment.label} (vervolg)`
              : range.kind === "start" && segment.label === "Start"
                ? "Na de start"
                : segment.label,
        });
      }
    }
    next.push(range);
    out = next.sort((a, b) => a.startKm - b.startKm);
  }

  // Snippers gaan op in de vorige buurman als die geen vast stuk is, anders in de
  // volgende. Zonder zo'n buurman blijven ze staan: de route moet gedekt zijn.
  const merged: PlanSegment[] = [];
  let carryStartKm: number | null = null;
  out.forEach((segment, index) => {
    const tiny = !isFixed(segment) && segment.endKm - segment.startKm < MIN_PIECE_KM;
    const previous = merged.at(-1);
    const following = out[index + 1];
    if (tiny && previous && !isFixed(previous)) {
      merged[merged.length - 1] = { ...previous, endKm: segment.endKm };
      return;
    }
    if (tiny && following && !isFixed(following)) {
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

/**
 * Laat de buurman een weggehaald stuk overnemen, zodat de route gedekt blijft:
 * de vorige als die er direct voor ligt, anders de volgende.
 */
function absorbRanges(
  pieces: PlanSegment[],
  removed: Array<{ startKm: number; endKm: number }>,
): PlanSegment[] {
  const out = [...pieces].sort((a, b) => a.startKm - b.startKm);
  for (const range of removed) {
    const before = out.findIndex((piece) => Math.abs(piece.endKm - range.startKm) <= 1e-6);
    if (before >= 0) {
      out[before] = { ...out[before], endKm: range.endKm };
      continue;
    }
    const after = out.findIndex((piece) => Math.abs(piece.startKm - range.endKm) <= 1e-6);
    if (after >= 0) out[after] = { ...out[after], startKm: range.startKm };
  }
  return out;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
