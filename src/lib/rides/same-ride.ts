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
