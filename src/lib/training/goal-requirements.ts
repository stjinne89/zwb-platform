// Wat een doeltijd van je ZWBriljant-steen vraagt: per onderdeel de klasse die
// nodig is, naast de klasse die je nu hebt. Leden kennen dit van de JOINscore,
// maar de totaalscore van de steen is er de verkeerde maat voor: daar tellen
// sprint, racen en consistentie in mee, en die beslissen geen toertocht.
//
// Twee onderdelen (eigenaar, 2026-10-26):
// - Drempel: je beste 20 minuten per kilo, maal de factor waarmee je hele
//   vermogensprofiel de doeltijd haalt (dezelfde factor als de benodigde CP).
// - Fitheid: de geschatte belasting van het event gedeeld door hoe ver leden
//   boven hun CTL lange ritten uitreden (EVENT_LOAD_PER_CTL).
// Durability bewust niet: het verval van de steen (P25 over 1 tot 20 minuten op
// de laagste kJ-stand) en het verval in de prognose (CP per kJ-stand) lopen bij
// onze leden te ver uiteen om het een in het ander uit te drukken. Zie
// docs/eisen-per-doel.md.
//
// Puur: goal-forecast.ts levert de waarden aan. Alleen niveaus gaan de opslag in.

import { CTL_ANCHORS, powerAnchors, type Sex } from "@/lib/briljant/norms";
import { levelAt } from "@/lib/briljant/score";
import type { PlanEvaluation } from "@/lib/pacing/plan";

/**
 * De belasting van een event mag zoveel keer je CTL zijn. ZWB-ijking op
 * 2026-10-26: ritten van drie uur of langer in intervals.icu, per lid de rit die
 * het verst boven de CTL van die dag lag. Bij 15 leden lag dat tussen 2,6 en 9,5
 * keer; de helft kwam tot 7 keer of verder. Een schatting, geen grens uit
 * onderzoek: wie een rit uitrijdt, zegt niets over wie hem niet uitreed.
 */
export const EVENT_LOAD_PER_CTL = 7;

/** Zo ver omlaag zoeken we naar wat een al haalbare doeltijd minimaal vraagt. */
export const MIN_CP_FACTOR = 0.5;

/** Een niveau zoals de steen het rekent (4,55 = Platina, 455 punten). */
export type Requirement = { required: number | null; current: number | null };

export type GoalRequirements = {
  drempel: Requirement;
  fitheid: Requirement;
  /** Geschatte belasting van het event in TSS. */
  eventLoad: number;
};

/** Wat de steen van dit lid nu weet, voor de "jij"-kant. */
export type SteenInputs = {
  sex: Sex | null;
  /** Beste 20 minuten in W/kg, zoals de steen hem leest. */
  wkg20: number | null;
  ctl: number | null;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Genormaliseerd vermogen over de segmenten van een doorrekening: de vierde
 * machtswortel van het tijdgewogen gemiddelde van watt⁴. Elk segment rijdt op
 * één vermogen, dus zonder het voortschrijdende gemiddelde van 30 seconden.
 */
export function normalizedWatts(evaluation: Pick<PlanEvaluation, "watts" | "estimate">): number {
  let seconds = 0;
  let sum = 0;
  evaluation.estimate.segments.forEach((segment, index) => {
    const watts = Math.max(0, evaluation.watts[index] ?? 0);
    seconds += segment.durationS;
    sum += watts ** 4 * segment.durationS;
  });
  return seconds > 0 ? (sum / seconds) ** 0.25 : 0;
}

/**
 * De belasting van het event in de doeltijd: uren × IF² × 100, met CP als FTP.
 * Het snelste plan schaalt met `cpFactor`; onder 1 rijdt het lid het met zijn
 * huidige CP rustiger, boven 1 met een sterkere CP even zwaar.
 */
export function eventLoad(
  evaluation: Pick<PlanEvaluation, "watts" | "estimate">,
  cpWatts: number,
  targetSeconds: number,
  cpFactor: number | null,
): number {
  if (cpWatts <= 0 || targetSeconds <= 0) return 0;
  const intensity = (normalizedWatts(evaluation) / cpWatts) * Math.min(1, cpFactor ?? 1);
  return Math.round((targetSeconds / 3600) * intensity ** 2 * 100);
}

/**
 * De eisen bij een doeltijd. `cpFactor` is null als de doeltijd ook met anderhalf
 * keer je CP niet te halen is; dan is er geen drempeleis.
 */
export function goalRequirements(input: {
  cpFactor: number | null;
  eventLoad: number;
  steen: SteenInputs;
}): GoalRequirements {
  const { cpFactor, steen } = input;
  const anchors = powerAnchors("m20", steen.sex);
  const wkg = steen.wkg20 != null && steen.wkg20 > 0 ? steen.wkg20 : null;
  return {
    drempel: {
      required: wkg != null && cpFactor != null ? round2(levelAt(anchors, wkg * cpFactor)) : null,
      current: wkg != null ? round2(levelAt(anchors, wkg)) : null,
    },
    fitheid: {
      required: input.eventLoad > 0 ? round2(levelAt(CTL_ANCHORS, input.eventLoad / EVENT_LOAD_PER_CTL)) : null,
      current: steen.ctl != null && steen.ctl >= 0 ? round2(levelAt(CTL_ANCHORS, steen.ctl)) : null,
    },
    eventLoad: input.eventLoad,
  };
}
