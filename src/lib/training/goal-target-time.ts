// Een doeltijd bij een trainingsdoel: haalbaarheid, nadruk en prognose.
//
// Een lid vroeg of het platform een schema kan bouwen vanuit de tijd die hij in
// een gran fondo wil rijden. Een schema dat een eindtijd belooft is niet te
// onderbouwen: hoeveel iemand in een paar maanden vooruitgaat, verschilt te
// sterk per persoon. Wat wél kan, staat hier: met het pacingmodel uitrekenen
// wat de huidige vorm oplevert, hoeveel CP de doeltijd vraagt, en waar op dit
// parcours de tijd zit. Dat laatste gaat als nadruk naar de schema-AI; de
// periodisering blijft van de bestaande regels. Zie docs/doeltijd-trainingsdoel.md.
//
// Pure logica; goal-forecast.ts leest de rijen en bewaart de uitkomst.

import { buildBaselinePlan } from "@/lib/pacing/baseline";
import type { CpModel, CpSource, CurvePoint } from "@/lib/pacing/cp";
import type { DurabilityModel } from "@/lib/pacing/durability";
import {
  evaluatePlan,
  imposeFixedPieces,
  isFixedPiece,
  type PlanEvaluation,
  type PlanSegment,
} from "@/lib/pacing/plan";
import type { PacingRoute } from "@/lib/pacing/route-profile";
import { fitPlanToTime, parseTargetTime, TARGET_TOLERANCE_S } from "@/lib/pacing/target-time";
import type { RiderType } from "@/lib/teams/power-profile";
import type { RidePhysics } from "@/lib/pacing/zwift-setup";
import {
  eventLoad,
  goalRequirements,
  MIN_CP_FACTOR,
  type GoalRequirements,
  type SteenInputs,
} from "@/lib/training/goal-requirements";

export type GoalRiding = "alone" | "group";

export { TARGET_TIME_GOAL_TYPES } from "@/lib/training/goal-target-types";

/** Grenzen van de kolom training_goals.target_time_seconds. */
export const MIN_TARGET_SECONDS = 600;
export const MAX_TARGET_SECONDS = 86_400;

/** "6:15", "6u15" of minuten naar seconden binnen de grenzen; anders null. */
export function parseGoalTargetTime(value: string): number | null {
  const seconds = parseTargetTime(value);
  if (seconds === null) return null;
  return seconds >= MIN_TARGET_SECONDS && seconds <= MAX_TARGET_SECONDS ? seconds : null;
}

/**
 * In een groep: 25 % minder luchtweerstand over de hele rit. AANNAME. Achter
 * één renner scheelt het 27–49 % (Blocken 2013; Barry 2014), midden in een
 * peloton veel meer (Blocken 2018), maar in een gran fondo zit je ook op kop, in
 * een gat of alleen op een klim. Op een klim is het effect vanzelf klein: daar
 * is de snelheid laag.
 */
export const GROUP_CDA_FACTOR = 0.75;

/** Meer dan anderhalf keer je CP rekenen we niet door: dat is geen doel meer. */
export const MAX_CP_FACTOR = 1.5;

/**
 * Wat een renner in een aantal weken redelijkerwijs aan CP wint, in procent.
 * Een vuistregel en geen grens uit onderzoek: bij getrainde renners +3,5 tot
 * +9 % na drie tot zes weken (Mitchell 2019; Galán-Rioja 2022; Bennett 2021;
 * Neal 2013), en over zeven maanden maar 12 W (Inglis 2020). De groei vlakt
 * dus af. Per persoon verschilt het sterk (Odden 2026).
 */
export const GROWTH_FAST_WEEKS = 12;
export const GROWTH_FAST_PCT_PER_WEEK = 0.75;
export const GROWTH_SLOW_PCT_PER_WEEK = 0.25;
export const GROWTH_MAX_PCT = 12;

export function realisticCpGainPct(weeks: number): number {
  const w = Math.max(0, weeks);
  const gain =
    Math.min(w, GROWTH_FAST_WEEKS) * GROWTH_FAST_PCT_PER_WEEK +
    Math.max(0, w - GROWTH_FAST_WEEKS) * GROWTH_SLOW_PCT_PER_WEEK;
  return Math.min(GROWTH_MAX_PCT, Math.round(gain * 10) / 10);
}

/** Vanaf dit deel van de rijtijd op klimmen beslist het klimvermogen. */
export const CLIMB_SHARE_THRESHOLD = 0.35;
/** Doeltijd vanaf wanneer de lengte van je langste rit telt. */
export const LONG_RIDE_MIN_SECONDS = 2.5 * 3600;
/** Je langste rit hoort minstens dit deel van de doeltijd te zijn. */
export const LONG_RIDE_FRACTION = 0.75;
/** Doeltijd vanaf wanneer verval laat in de rit telt. */
export const DURABILITY_MIN_SECONDS = 3 * 3600;
/** Verval in CP vanaf waar het nadruk krijgt. */
export const DURABILITY_FADE_PCT = 8;

export type GoalVerdict =
  /** Met de huidige vorm al binnen de doeltijd. */
  | "haalbaar"
  /** Benodigde groei binnen de vuistregel tot de doeldatum. */
  | "met_groei"
  /** Tot twee keer de vuistregel. */
  | "ambitieus"
  /** Meer dan twee keer de vuistregel. */
  | "niet_realistisch"
  /** Geen doeldatum: alleen de benodigde groei, geen oordeel over tempo. */
  | "groei_nodig"
  /** Ook met anderhalf keer je CP niet. */
  | "buiten_bereik";

export const VERDICT_LABELS: Record<GoalVerdict, string> = {
  haalbaar: "Haalbaar",
  met_groei: "Haalbaar met groei",
  ambitieus: "Ambitieus",
  niet_realistisch: "Niet realistisch voor deze datum",
  groei_nodig: "Groei nodig",
  buiten_bereik: "Buiten bereik",
};

export type EmphasisCode = "klimmen" | "drempel" | "lange_ritten" | "duurvermogen";

export type GoalEmphasis = {
  code: EmphasisCode;
  label: string;
  /** Waarom, met de getallen van dit lid; gaat naar de AI en de trainer. */
  reason: string;
};

export const EMPHASIS_LABELS: Record<EmphasisCode, string> = {
  klimmen: "Klimmen: drempel en VO2max in klimduur",
  drempel: "Drempel en sweetspot in lange blokken",
  lange_ritten: "Lange duurritten",
  duurvermogen: "Duurvermogen laat in de rit",
};

export type GoalForecast = {
  targetSeconds: number;
  /** De snelste haalbare tijd met de huidige vorm. */
  predictedSeconds: number;
  verdict: GoalVerdict;
  cpWatts: number;
  cpSource: CpSource;
  weightKg: number;
  /** CP die de doeltijd vraagt; null als die al haalbaar of buiten bereik is. */
  requiredCpWatts: number | null;
  requiredGainPct: number | null;
  /** Vuistregel voor de weken tot de doeldatum; null zonder doeldatum. */
  realisticGainPct: number | null;
  weeksToGoal: number | null;
  /** Tijdwinst van 1 % meer CP, in seconden. */
  secondsPerCpPct: number;
  /** Tijdwinst van 1 kg minder bij hetzelfde vermogen, in seconden. */
  secondsPerKg: number;
  /** Deel van de rijtijd op klimmen. */
  climbShare: number;
  /** Verval van CP op het diepst gemeten punt; null zonder vermoeidheidscurves. */
  durabilityFadePct: number | null;
  riding: GoalRiding;
  emphasis: GoalEmphasis[];
  /** Wat de doeltijd van je steen vraagt; null zonder steengegevens. */
  requirements: GoalRequirements | null;
};

export type ForecastRider = {
  model: CpModel;
  durability: DurabilityModel | null;
  curve: CurvePoint[] | null;
  riderType?: RiderType;
};

export type ForecastInput = {
  route: PacingRoute;
  rider: ForecastRider;
  targetSeconds: number;
  riding: GoalRiding;
  /** Weken tot de doeldatum; null zonder doeldatum. */
  weeksToGoal: number | null;
  /** Langste fietsrit van de laatste weken, in minuten; null als onbekend. */
  longestRideMinutes: number | null;
  /** Voor de eisen per onderdeel van de steen; zonder: geen eisen. */
  steen?: SteenInputs | null;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Zelfde plan, hele vermogensprofiel `factor` keer zo sterk. */
function scaleRider(rider: ForecastRider, factor: number): ForecastRider {
  return {
    ...rider,
    model: {
      ...rider.model,
      cpWatts: rider.model.cpWatts * factor,
      wPrimeJoules: rider.model.wPrimeJoules * factor,
    },
    // De durability is een factor op CP en schuift vanzelf mee.
    curve: rider.curve?.map((point) => ({ ...point, watts: point.watts * factor })) ?? null,
  };
}

function scalePlan(plan: PlanSegment[], factor: number): PlanSegment[] {
  return plan.map((segment) =>
    isFixedPiece(segment) ? segment : { ...segment, targetWkg: segment.targetWkg * factor },
  );
}

/**
 * De fysica waarmee gerekend wordt: buiten in een groep een lagere CdA, of in
 * Zwift de opzet van het event. Zonder beide: buiten, alleen.
 */
export type TargetPhysics = { cdaFactor?: number; ride?: RidePhysics | null };

function evaluateOptions(rider: ForecastRider, physics: TargetPhysics) {
  return {
    durability: rider.durability,
    cdaFactor: physics.cdaFactor,
    ride: physics.ride ?? null,
  };
}

/**
 * Het snelste plan dat deze renner de finish laat halen: het basisvoorstel, of
 * het eigen plan van het lid, dan zo hoog als de reserve toelaat. Dezelfde weg
 * als "Plan voor deze tijd" in het pacingplan, zodat beide dezelfde tijd noemen.
 */
export function fastestPlan(
  route: PacingRoute,
  rider: ForecastRider,
  physics: TargetPhysics = {},
  startPlan?: PlanSegment[],
): { plan: PlanSegment[]; evaluation: PlanEvaluation } {
  const options = {
    curve: rider.curve,
    durability: rider.durability,
    cdaFactor: physics.cdaFactor,
    ride: physics.ride ?? null,
  };
  const plan = startPlan
    ? imposeFixedPieces(startPlan, route, rider.model, options.ride)
    : buildBaselinePlan({ route, model: rider.model, riderType: rider.riderType, ...options }).plan;
  // Een doel van één seconde haalt niemand: fitPlanToTime geeft dan het
  // snelste haalbare plan terug.
  const fit = fitPlanToTime(plan, route, rider.model, 1, options);
  return { plan: fit.plan, evaluation: fit.evaluation };
}

/**
 * Hoeveel sterker het hele profiel moet zijn voor de doeltijd. Het snelste plan
 * zit al tegen de grens van wat de renner kan; schalen we plan en profiel samen,
 * dan blijft het net zo haalbaar en hoeft er alleen doorgerekend te worden — geen
 * nieuwe zoektocht met de ruis van een bisectie per stap.
 *
 * Gezocht tussen `from` en `to`: boven 1 als de doeltijd groei vraagt, onder 1 voor
 * hoeveel minder het mag zijn als hij al haalbaar is. Null als zelfs `to` te traag
 * is; `from` als die al snel genoeg is.
 */
export function cpFactorForTime(
  plan: PlanSegment[],
  route: PacingRoute,
  rider: ForecastRider,
  targetSeconds: number,
  physics: TargetPhysics,
  from = 1,
  to = MAX_CP_FACTOR,
): number | null {
  const timeAt = (factor: number) => {
    const scaled = scaleRider(rider, factor);
    return evaluatePlan(
      scalePlan(plan, factor),
      route,
      scaled.model,
      evaluateOptions(scaled, physics),
    ).totalSeconds;
  };
  if (timeAt(to) > targetSeconds + TARGET_TOLERANCE_S) return null;
  if (from < 1 && timeAt(from) <= targetSeconds) return from;
  let lo = from;
  let hi = to;
  for (let step = 0; step < 30 && hi - lo > 0.001; step++) {
    const mid = (lo + hi) / 2;
    if (timeAt(mid) > targetSeconds) lo = mid;
    else hi = mid;
  }
  return hi;
}

function verdictFor(
  requiredGainPct: number,
  realisticGainPct: number | null,
): GoalVerdict {
  if (realisticGainPct === null) return "groei_nodig";
  if (requiredGainPct <= realisticGainPct) return "met_groei";
  if (requiredGainPct <= realisticGainPct * 2) return "ambitieus";
  return "niet_realistisch";
}

export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

/** Klimmen in deze rit: aandeel van de tijd en gemiddelde duur per klim. */
function climbStats(route: PacingRoute, evaluation: PlanEvaluation) {
  const climbs = evaluation.accents.filter(
    (accent) => route.accents[accent.accentIndex]?.kind === "climb" && accent.durationS > 0,
  );
  const climbSeconds = climbs.reduce((sum, accent) => sum + accent.durationS, 0);
  return {
    share: evaluation.totalSeconds > 0 ? climbSeconds / evaluation.totalSeconds : 0,
    count: climbs.length,
    avgMinutes: climbs.length > 0 ? climbSeconds / climbs.length / 60 : 0,
  };
}

export function emphasisFor(input: {
  targetSeconds: number;
  climbShare: number;
  climbCount: number;
  avgClimbMinutes: number;
  durabilityFadePct: number | null;
  longestRideMinutes: number | null;
}): GoalEmphasis[] {
  const out: GoalEmphasis[] = [];
  const pct = Math.round(input.climbShare * 100);

  if (input.climbShare >= CLIMB_SHARE_THRESHOLD) {
    out.push({
      code: "klimmen",
      label: EMPHASIS_LABELS.klimmen,
      reason: `${pct}% van de rijtijd zit op ${input.climbCount} klim${input.climbCount === 1 ? "" : "men"} van gemiddeld ${Math.round(input.avgClimbMinutes)} minuten.`,
    });
  } else {
    out.push({
      code: "drempel",
      label: EMPHASIS_LABELS.drempel,
      reason: `Maar ${pct}% van de rijtijd zit op klimmen: duurzaam vermogen rond de drempel beslist de tijd.`,
    });
  }

  if (input.targetSeconds >= LONG_RIDE_MIN_SECONDS) {
    const needed = (input.targetSeconds / 60) * LONG_RIDE_FRACTION;
    if (input.longestRideMinutes === null || input.longestRideMinutes < needed) {
      out.push({
        code: "lange_ritten",
        label: EMPHASIS_LABELS.lange_ritten,
        reason:
          input.longestRideMinutes === null
            ? `De doeltijd is ${formatClock(input.targetSeconds)}; er is geen recente lange rit bekend.`
            : `De doeltijd is ${formatClock(input.targetSeconds)}; de langste rit van de laatste acht weken duurde ${formatClock(input.longestRideMinutes * 60)}.`,
      });
    }
  }

  if (input.targetSeconds >= DURABILITY_MIN_SECONDS) {
    if (input.durabilityFadePct === null) {
      out.push({
        code: "duurvermogen",
        label: EMPHASIS_LABELS.duurvermogen,
        reason:
          "Er zijn geen vermoeidheidscurves: de prognose rekent zonder verval en is daardoor aan de snelle kant.",
      });
    } else if (input.durabilityFadePct >= DURABILITY_FADE_PCT) {
      out.push({
        code: "duurvermogen",
        label: EMPHASIS_LABELS.duurvermogen,
        reason: `Na lange inspanning zakt de CP tot ${Math.round(input.durabilityFadePct)}%.`,
      });
    }
  }

  return out;
}

export type TargetAssessment = {
  targetSeconds: number;
  predictedSeconds: number;
  verdict: GoalVerdict;
  cpWatts: number;
  requiredCpWatts: number | null;
  requiredGainPct: number | null;
  realisticGainPct: number | null;
  weeksToGoal: number | null;
  secondsPerCpPct: number;
  secondsPerKg: number;
};

/**
 * Hoe ver een renner van een doeltijd af zit: prognose, oordeel, benodigde CP
 * en wat 1 % CP of 1 kg scheelt. Gedeeld door het trainingsdoel en de
 * pacingcalculator van een event.
 */
export function assessTargetTime(input: {
  route: PacingRoute;
  rider: ForecastRider;
  targetSeconds: number;
  weeksToGoal: number | null;
  physics?: TargetPhysics;
  /** Het eigen plan van het lid; zonder: het basisvoorstel. */
  startPlan?: PlanSegment[];
}): TargetAssessment & {
  fastest: { plan: PlanSegment[]; evaluation: PlanEvaluation };
  /** Hoeveel sterker het profiel moet zijn; null als het al haalbaar of buiten bereik is. */
  cpFactor: number | null;
} {
  const { route, rider, targetSeconds } = input;
  const physics = input.physics ?? {};
  const { model } = rider;

  const fastest = fastestPlan(route, rider, physics, input.startPlan);
  const predictedSeconds = Math.round(fastest.evaluation.totalSeconds);

  // Gevoeligheid op het snelste plan zelf: zelfde verdeling, iets meer CP of
  // een kilo minder bij dezelfde watt. Doorrekenen zonder zoeken, dus zonder ruis.
  const plusOne = scaleRider(rider, 1.01);
  const secondsPerCpPct = Math.max(
    0,
    predictedSeconds -
      evaluatePlan(
        scalePlan(fastest.plan, 1.01),
        route,
        plusOne.model,
        evaluateOptions(rider, physics),
      ).totalSeconds,
  );
  const lighterKg = model.weightKg - 1;
  const lighter = evaluatePlan(
    scalePlan(fastest.plan, model.weightKg / lighterKg),
    route,
    { ...model, weightKg: lighterKg },
    evaluateOptions(rider, physics),
  );
  const secondsPerKg = Math.max(0, predictedSeconds - lighter.totalSeconds);

  const weeksToGoal = input.weeksToGoal === null ? null : Math.max(0, input.weeksToGoal);
  const realisticGainPct = weeksToGoal === null ? null : realisticCpGainPct(weeksToGoal);

  let verdict: GoalVerdict;
  let requiredCpWatts: number | null = null;
  let requiredGainPct: number | null = null;
  let cpFactor: number | null = null;
  if (predictedSeconds <= targetSeconds + TARGET_TOLERANCE_S) {
    verdict = "haalbaar";
  } else {
    const factor = cpFactorForTime(fastest.plan, route, rider, targetSeconds, physics);
    cpFactor = factor;
    if (factor === null) {
      verdict = "buiten_bereik";
    } else {
      requiredCpWatts = Math.round(model.cpWatts * factor);
      requiredGainPct = round1((factor - 1) * 100);
      verdict = verdictFor(requiredGainPct, realisticGainPct);
    }
  }

  return {
    targetSeconds: Math.round(targetSeconds),
    predictedSeconds,
    verdict,
    cpWatts: Math.round(model.cpWatts),
    requiredCpWatts,
    requiredGainPct,
    realisticGainPct,
    weeksToGoal: weeksToGoal === null ? null : round1(weeksToGoal),
    secondsPerCpPct: Math.round(secondsPerCpPct),
    secondsPerKg: Math.round(secondsPerKg),
    fastest,
    cpFactor,
  };
}

export function forecastGoal(input: ForecastInput): GoalForecast {
  const { route, rider, targetSeconds, riding } = input;
  const physics = { cdaFactor: riding === "group" ? GROUP_CDA_FACTOR : 1 };
  const { fastest, cpFactor, ...assessment } = assessTargetTime({
    route,
    rider,
    targetSeconds,
    weeksToGoal: input.weeksToGoal,
    physics,
  });

  const climbs = climbStats(route, fastest.evaluation);
  const durabilityFadePct = rider.durability ? round1(rider.durability.maxFadePct) : null;

  return {
    ...assessment,
    cpSource: rider.model.source,
    weightKg: round1(rider.model.weightKg),
    climbShare: Math.round(climbs.share * 1000) / 1000,
    durabilityFadePct,
    riding,
    emphasis: emphasisFor({
      targetSeconds,
      climbShare: climbs.share,
      climbCount: climbs.count,
      avgClimbMinutes: climbs.avgMinutes,
      durabilityFadePct,
      longestRideMinutes: input.longestRideMinutes,
    }),
    requirements: input.steen
      ? requirementsFor(input.steen, assessment.verdict, cpFactor, fastest, route, rider, targetSeconds, physics)
      : null,
  };
}

/**
 * Bij een al haalbare doeltijd: hoeveel zwakker het profiel mag zijn. Daarmee
 * zegt de drempeleis ook dan welke klasse de tijd vraagt, en niet alleen "haalbaar".
 */
function requirementsFor(
  steen: SteenInputs,
  verdict: GoalVerdict,
  cpFactor: number | null,
  fastest: { plan: PlanSegment[]; evaluation: PlanEvaluation },
  route: PacingRoute,
  rider: ForecastRider,
  targetSeconds: number,
  physics: TargetPhysics,
): GoalRequirements {
  const factor =
    verdict === "haalbaar"
      ? cpFactorForTime(fastest.plan, route, rider, targetSeconds, physics, MIN_CP_FACTOR, 1)
      : cpFactor;
  return goalRequirements({
    cpFactor: factor,
    eventLoad: eventLoad(fastest.evaluation, rider.model.cpWatts, targetSeconds, factor ?? MAX_CP_FACTOR),
    steen,
  });
}
