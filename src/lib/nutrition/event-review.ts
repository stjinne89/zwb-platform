// Na het event: het plan naast wat je reed en at. Stap 8 van
// docs/eventvoeding-plan.md, besluit 10. Niets wordt bewaard: de pagina rekent
// het bij het tonen uit de rit (intervals.icu of Strava) en het eetdagboek.
//
// Puur, zodat het te testen is; de server haalt de rit en de maaltijden op.

import { carbBurnPerHour } from "./event-fuel";

/** Een rit van minder dan een kwartier is geen eventrit (zoals durationRatios). */
const MIN_RIDE_MINUTES = 15;

export type ReviewRide = {
  minutes: number;
  /** Werk op de trappers; null als de bron het niet geeft. */
  kj: number | null;
  /** Null zonder vermogen of FTP: dan rekent het verbruik met de IF van het plan. */
  intensityFactor: number | null;
};

export type EventFuelReview = {
  plan: { minutes: number; burnG: number | null; eatG: number; perHourG: number };
  ridden: ReviewRide & { burnG: number | null };
  /** Null zonder iets bij "Tijdens de rit" in het eetdagboek. */
  eaten: { carbsG: number; perHourG: number; incomplete: boolean } | null;
};

/** De rit van die dag die in duur het dichtst bij het plan ligt. */
export function pickRide(rides: readonly ReviewRide[], plannedMinutes: number): ReviewRide | null {
  const usable = rides.filter((ride) => ride.minutes >= MIN_RIDE_MINUTES);
  if (usable.length === 0) return null;
  return usable.reduce((best, ride) =>
    Math.abs(ride.minutes - plannedMinutes) < Math.abs(best.minutes - plannedMinutes) ? ride : best,
  );
}

/**
 * De IF van een rit uit intervals.icu: NP gedeeld door de FTP van die rit, anders
 * icu_intensity (soms als percentage). Null zonder bruikbare waarde.
 */
export function rideIntensity(row: {
  normalized_watts?: number | string | null;
  ftp_watts?: number | string | null;
  intensity?: number | string | null;
}): number | null {
  const np = Number(row.normalized_watts ?? 0);
  const ftp = Number(row.ftp_watts ?? 0);
  if (np > 0 && ftp > 0) return round2(np / ftp);
  const raw = Number(row.intensity ?? 0);
  if (!(raw > 0)) return null;
  const value = raw > 3 ? raw / 100 : raw;
  return value >= 0.3 && value <= 1.5 ? round2(value) : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Verbrande koolhydraten uit het werk: gemiddeld vermogen over de rijtijd, met hetzelfde model als het advies. */
export function burnFromWork(kj: number, minutes: number, intensityFactor: number): number | null {
  if (!(kj > 0) || !(minutes > 0)) return null;
  const watts = (kj * 1000) / (minutes * 60);
  return Math.round(carbBurnPerHour(watts, intensityFactor) * (minutes / 60));
}

export function eventFuelReview(input: {
  plan: { minutes: number; perHourG: number; burnG: number | null; intensityFactor: number };
  ride: ReviewRide;
  eaten: { carbsG: number; incomplete: boolean } | null;
}): EventFuelReview {
  const { plan, ride } = input;
  const perHour = (grams: number, minutes: number) => (minutes > 0 ? Math.round((grams * 60) / minutes) : 0);
  return {
    plan: {
      minutes: plan.minutes,
      burnG: plan.burnG,
      eatG: Math.round((plan.perHourG * plan.minutes) / 60),
      perHourG: plan.perHourG,
    },
    ridden: {
      ...ride,
      burnG: ride.kj != null ? burnFromWork(ride.kj, ride.minutes, ride.intensityFactor ?? plan.intensityFactor) : null,
    },
    eaten: input.eaten
      ? {
          carbsG: Math.round(input.eaten.carbsG),
          perHourG: perHour(input.eaten.carbsG, ride.minutes),
          incomplete: input.eaten.incomplete,
        }
      : null,
  };
}
