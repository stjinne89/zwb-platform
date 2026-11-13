// De duur waarmee het eventplan rekent: de lange kant van wat je verwacht.
// Stap 5 van docs/eventvoeding-plan.md (§4a). Een plan dat op de verwachte duur
// precies uitkomt, is in de helft van de events te krap; wie langer rijdt dan
// gepland, mist dan juist aan het eind eten en drinken.
//
// Puur, zodat het te testen is; de server haalt de eigen ritten op.

import type { EventDurationSource } from "@/lib/training/events";

/** Met minder eigen events van dit type geldt de clubwaarde. */
export const OWN_RATIO_MIN_EVENTS = 5;

/** De marge blijft binnen deze grenzen: nooit korter dan verwacht, hoogstens anderhalf keer. */
const MIN_MARGIN = 1;
const MAX_MARGIN = 1.5;

/**
 * De p90 van gereden / gepland per eventtype over alle ZWB'ers, uit
 * docs/eventvoeding-plan.md §2 (productie, 2026-11-13, laatste 120 dagen). Die
 * planning kwam vaak uit de vaste duur per type, zonder route; met een route
 * rekent het racemodel nauwkeuriger (ROUTE_MARGIN). Toertocht ontbreekt: twee
 * events is te weinig.
 */
export const CLUB_DURATION_P90: Readonly<Record<string, number>> = {
  zrl: 1.37,
  ladder: 1.26,
  flamme_rouge: 1.18,
  src: 1.23,
};

/**
 * Met een route of afstand: de p90 van de afwijking van het racemodel met de
 * persoonlijke factor, 11,6% (src/lib/training/race-pace.ts, getoetst op 1858
 * Zwift-races), naar boven afgerond.
 */
export const ROUTE_MARGIN = 1.12;

/** Het 90e percentiel (de waarde waar 90% onder blijft), of null zonder waarden. */
export function percentile90(values: readonly number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.9) - 1)];
}

export type DurationMargin = {
  factor: number;
  /** Waar de marge vandaan komt: je eigen events, de club, de route, of geen marge. */
  from: "eigen" | "club" | "route" | "geen";
};

/**
 * De marge op de verwachte duur. Geen marge met een pacingplan (dat is al je
 * eigen schatting) of een ingestelde koersduur. Anders je eigen p90 bij genoeg
 * events van dit type, dan de route, dan de clubwaarde.
 */
export function durationMargin(input: {
  paced: boolean;
  source: EventDurationSource;
  eventType: string;
  ownRatios: readonly number[];
}): DurationMargin {
  if (input.paced || input.source === "vast") return { factor: 1, from: "geen" };
  const clamp = (value: number) => Math.round(Math.min(MAX_MARGIN, Math.max(MIN_MARGIN, value)) * 100) / 100;
  const own = input.ownRatios.length >= OWN_RATIO_MIN_EVENTS ? percentile90(input.ownRatios) : null;
  if (own != null) return { factor: clamp(own), from: "eigen" };
  if (input.source === "route" && input.eventType in CLUB_DURATION_P90) return { factor: ROUTE_MARGIN, from: "route" };
  const club = CLUB_DURATION_P90[input.eventType];
  return club ? { factor: clamp(club), from: "club" } : { factor: 1, from: "geen" };
}

/** De verwachte duur met marge, op 5 minuten naar boven. */
export function withMargin(minutes: number, margin: DurationMargin): number {
  return Math.ceil((minutes * margin.factor) / 5) * 5;
}

/**
 * Gereden / gepland per event: bij elke geplande eventrit de rit van die dag
 * die er in duur het dichtst bij ligt. Ritten van minder dan een kwartier en
 * verhoudingen buiten 0,5–3 tellen niet (een ander soort rit, of een fout).
 */
export function durationRatios(
  planned: readonly { day: string; minutes: number }[],
  rides: readonly { day: string; minutes: number }[],
): number[] {
  return planned.flatMap((event) => {
    if (!(event.minutes > 0)) return [];
    const sameDay = rides.filter((ride) => ride.day === event.day && ride.minutes >= 15);
    if (sameDay.length === 0) return [];
    const ride = sameDay.reduce((best, item) =>
      Math.abs(item.minutes - event.minutes) < Math.abs(best.minutes - event.minutes) ? item : best,
    );
    const ratio = ride.minutes / event.minutes;
    return ratio >= 0.5 && ratio <= 3 ? [ratio] : [];
  });
}
