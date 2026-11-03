// Krachttraining uit intervals.icu in het krachtspoor.
//
// De sync zet alle activiteiten in intervals_activities, ook krachttraining van
// een Garmin of met de hand ingevoerd. Hier telt zo'n sessie mee voor de rust
// tussen krachtsessies (recommendStrength) en, als het lid de spieren heeft
// aangetikt, voor "Deze week getraind". Niet voor de core-teller, en net als de
// rest van dit spoor nergens in TSS, CTL of naleving.
//
// WeightTraining telt altijd. "Workout" kan van alles zijn, van een bootcamp
// tot een wandeling (een Garmin-band schrijft alles zo weg), dus die telt pas
// als het lid er spieren bij aantikt: dan heeft hij zelf gezegd dat het kracht
// was.

import { MUSCLE_GROUPS, type MuscleGroup, type MuscleLoad } from "./muscles";
import { shiftDayKey } from "./mobility";

/** Telt altijd als krachttraining. */
export const INTERVALS_STRENGTH_TYPES = new Set(["WeightTraining"]);
/** Staat in de lijst; telt alleen met aangetikte spieren. */
export const INTERVALS_TAGGABLE_TYPES = new Set(["WeightTraining", "Workout"]);

export type IntervalsStrengthSession = {
  intervalsId: string;
  /** Type uit intervals.icu, een van INTERVALS_TAGGABLE_TYPES. */
  type: string;
  /** Dagsleutel uit start_date_local; intervals rekent al in de eigen tijdzone. */
  day: string;
  name: string | null;
  minutes: number | null;
  muscles: MuscleGroup[];
};

/** Hoe zwaar één aangetikte spiergroep van een intervals-sessie telt, in sets.
 * Een eigen keuze: intervals weet niet hoeveel sets je deed, en een sessie in
 * de sportschool is meestal zo'n drie sets per spiergroep. Met 1 zou een hele
 * gymsessie lichter kleuren dan een korte serie thuis. */
export const INTERVALS_SESSION_SETS = 3;

export function isIntervalsStrengthType(type: string | null | undefined): boolean {
  return Boolean(type && INTERVALS_STRENGTH_TYPES.has(type));
}

/** Mag het lid bij dit type spieren aantikken? */
export function isIntervalsTaggableType(type: string | null | undefined): boolean {
  return Boolean(type && INTERVALS_TAGGABLE_TYPES.has(type));
}

/** Telt deze sessie als krachttraining: altijd bij WeightTraining, bij een
 * Workout pas als er spieren zijn aangetikt. */
export function countsAsStrength(session: IntervalsStrengthSession): boolean {
  return isIntervalsStrengthType(session.type) || session.muscles.length > 0;
}

/** Alleen bekende groepen, elk één keer, in de vaste volgorde. */
export function normalizeMuscleSelection(values: Iterable<string>): MuscleGroup[] {
  const chosen = new Set(values);
  return MUSCLE_GROUPS.filter((group) => chosen.has(group));
}

export function intervalsStrengthDays(sessions: IntervalsStrengthSession[]): string[] {
  return sessions.filter(countsAsStrength).map((session) => session.day);
}

/** Belasting uit de aangetikte spieren in de afgelopen zeven dagen, vandaag
 * meegerekend. Zelfde venster en schaal als weekLoad. */
export function intervalsWeekLoad(
  sessions: IntervalsStrengthSession[],
  today: string,
): MuscleLoad {
  const from = shiftDayKey(today, -6);
  const total: MuscleLoad = {};
  for (const session of sessions) {
    if (session.day < from || session.day > today) continue;
    for (const group of session.muscles) {
      total[group] = (total[group] ?? 0) + INTERVALS_SESSION_SETS;
    }
  }
  return total;
}

/** Twee belastingen bij elkaar opgeteld, zonder de invoer te veranderen. */
export function mergeLoad(a: MuscleLoad, b: MuscleLoad): MuscleLoad {
  const total: MuscleLoad = {};
  for (const group of MUSCLE_GROUPS) {
    const value = (a[group] ?? 0) + (b[group] ?? 0);
    if (value > 0) total[group] = value;
  }
  return total;
}
