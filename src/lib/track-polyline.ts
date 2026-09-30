// Het opgeslagen spoor van een rit zonder Strava-detail (intervals.icu of een
// GPX-upload), als Strava's summary_polyline in raw.map. Los bestand, want
// lib/intervals/rides.ts en lib/strava/import.ts gebruiken het allebei en
// importeren elkaar al.

import polyline from "@mapbox/polyline";

export type LatLng = [number, number];

/** Hoeveel punten het opgeslagen spoor hooguit heeft. */
export const TRACK_MAX_POINTS = 500;

/**
 * Uitgedund en gecodeerd, als Strava's summary_polyline. De col-detector meet de
 * afstand tot het lijnstuk tussen twee punten, dus uitdunnen mist geen top.
 */
export function encodeTrackPolyline(points: LatLng[], maxPoints = TRACK_MAX_POINTS): string | null {
  if (points.length < 2) return null;
  const stride = Math.max(1, Math.ceil(points.length / maxPoints));
  const kept = points.filter((_, i) => i % stride === 0);
  const last = points[points.length - 1];
  if (kept[kept.length - 1] !== last) kept.push(last);
  return polyline.encode(kept);
}
