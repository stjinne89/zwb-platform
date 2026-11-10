// Late herkansing op de readiness van vandaag; de cron zelf staat in
// src/app/api/training/adaptations/daily/route.ts. Hier de beslisregels, los
// toetsbaar.
//
// Whoop en Polar zetten de meting pas na het wakker worden door naar
// intervals.icu, vaak na acht uur. Het dagvoorstel gaat om negen uur in elk
// geval uit, en had die meting van 6 tot en met 9 november 2026 bij geen van de
// Whoop-leden. De prompt zegt dan terecht: niet voorzichtiger plannen op het
// getal van gisteren. Kwam de meting daarna binnen, dan deed niets er meer iets
// mee; een Whoop-score van 41 liet een intensieve duurrit gewoon staan.

import { READINESS_LOW } from "@/lib/training/engine/signals";
import type { WellnessSummary } from "@/lib/training/wellness";

/**
 * Tot dit uur kijkt de cron of de readiness van vandaag alsnog binnenkomt.
 * Later heeft een tweede voorstel weinig zin: het is pas een uur na het
 * uitzetten klaar, en de meeste leden hebben dan gereden.
 */
export const LATE_CHECK_LAST_HOUR = 17;

/** Reden op de late herkansing; ook de herkenning dat hij vandaag al liep. */
export const LATE_READINESS_REASON = "Bijstelling op je readiness van vandaag.";

/**
 * Had deze generatie de readiness van het apparaat van vandaag al in zijn
 * invoer? `promptSummary` is de JSON van de invoer, zoals
 * `startBackgroundAdaptation` hem opslaat.
 */
export function promptHadCurrentReadiness(promptSummary: unknown): boolean {
  if (typeof promptSummary !== "string") return false;
  try {
    const input = JSON.parse(promptSummary) as {
      wellness?: { readinessCurrent?: unknown; readinessSource?: unknown } | null;
    };
    return input.wellness?.readinessCurrent === true && input.wellness.readinessSource === "device";
  } catch {
    return false;
  }
}

/**
 * Vraagt deze herstelsamenvatting om een late bijstelling? Alleen een meting
 * van het apparaat, van vandaag, onder `READINESS_LOW`: dezelfde grens waarop de
 * regelmotor de belasting verlaagt. Een afgeleide readiness (Garmin) telt niet;
 * die is er 's ochtends al en komt uit dezelfde HRV als de rest.
 */
export function lowCurrentDeviceReadiness(
  wellness: Pick<WellnessSummary, "readiness" | "readinessSource" | "readinessCurrent"> | null,
): boolean {
  return (
    wellness?.readinessSource === "device" &&
    wellness.readinessCurrent === true &&
    wellness.readiness != null &&
    wellness.readiness < READINESS_LOW
  );
}

/**
 * Zonder migratie 0324 kent `training_ai_generations` de kolom
 * `late_readiness` niet en weigert PostgREST de insert. Dan is er nog geen late
 * herkansing; dat is geen fout om elk uur te loggen.
 */
export function lateColumnMissing(error: string | null | undefined): boolean {
  return Boolean(error && error.includes("late_readiness"));
}
