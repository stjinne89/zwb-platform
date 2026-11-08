// Is dit dezelfde rit uit een andere bron? Los van intervals/rides.ts, zodat de
// stats (die ook in de browser draaien) de Strava- en pushcode niet meeslepen.
//
// Puur.

/** Wat de vergelijking van een rit nodig heeft. */
export type RideFingerprint = {
  id: number | string;
  start_date: string;
  distance_m: number | string | null;
  raw?: unknown;
};

/** Twee starts binnen deze tijd kunnen dezelfde rit zijn. */
export const SAME_START_MS = 120_000;
const SAME_DISTANCE = 0.05;
const SHORT_RIDE_M = 1_000;

export function isSameRide(a: RideFingerprint, b: RideFingerprint): boolean {
  const startA = Date.parse(a.start_date);
  const startB = Date.parse(b.start_date);
  if (!Number.isFinite(startA) || !Number.isFinite(startB)) return false;
  if (Math.abs(startA - startB) > SAME_START_MS) return false;
  const distA = Number(a.distance_m) || 0;
  const distB = Number(b.distance_m) || 0;
  if (distA < SHORT_RIDE_M && distB < SHORT_RIDE_M) return true;
  return Math.abs(distA - distB) / Math.max(distA, distB) <= SAME_DISTANCE;
}

/** Een rit met zijn rijtijd, voor de overlap tussen twee opnames. */
export type RideSpan = RideFingerprint & {
  moving_time_seconds?: number | string | null;
};

/** Zoveel van de kortste rit moet samenvallen met de andere. */
export const DUPLICATE_OVERLAP = 0.5;

function span(ride: RideSpan): { start: number; end: number } | null {
  const start = Date.parse(ride.start_date);
  if (!Number.isFinite(start)) return null;
  const seconds = Math.max(0, Number(ride.moving_time_seconds) || 0);
  return { start, end: start + seconds * 1000 };
}

/**
 * Twee opnames van dezelfde rit, ook als ze er anders uitzien: Zwift met 45 km
 * naast een horloge met 0 km, of een opname die halverwege stopte. Dezelfde rit
 * volgens isSameRide, of de kortste valt voor minstens de helft binnen de
 * andere. Een warming-up vóór een race overlapt niet en telt dus niet.
 */
export function isDuplicateRecording(a: RideSpan, b: RideSpan): boolean {
  if (String(a.id) === String(b.id)) return false;
  if (isSameRide(a, b)) return true;
  const spanA = span(a);
  const spanB = span(b);
  if (!spanA || !spanB) return false;
  const shortest = Math.min(spanA.end - spanA.start, spanB.end - spanB.start);
  if (shortest <= 0) return false;
  const overlap = Math.min(spanA.end, spanB.end) - Math.max(spanA.start, spanB.start);
  return overlap >= shortest * DUPLICATE_OVERLAP;
}

/** De id's van ritten die een dubbele opname naast zich hebben. */
export function duplicateRideIds(rides: readonly RideSpan[]): Set<string> {
  const sorted = [...rides]
    .filter((ride) => Number.isFinite(Date.parse(ride.start_date)))
    .sort((a, b) => Date.parse(a.start_date) - Date.parse(b.start_date));
  const ids = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    const end = span(sorted[i])!.end;
    for (let j = i + 1; j < sorted.length; j++) {
      const start = Date.parse(sorted[j].start_date);
      // Gesorteerd op start: wat na het einde begint, overlapt niet meer (op de
      // starttolerantie van isSameRide na).
      if (start > Math.max(end, Date.parse(sorted[i].start_date) + SAME_START_MS)) break;
      if (isDuplicateRecording(sorted[i], sorted[j])) {
        ids.add(String(sorted[i].id));
        ids.add(String(sorted[j].id));
      }
    }
  }
  return ids;
}
