// Id-schema voor intervals-ritten in strava_activities. Los bestand zonder
// imports, zodat ook de Strava-modules (retentie, links) het kunnen gebruiken
// zonder kringverwijzing.
//
// Echte Strava-ritten hebben een positief id; CSV- en GPX-imports een 32-bits
// hash tussen −(2³²−1) en 0. intervals-ritten liggen daar ruim onder.

const INTERVALS_ID_OFFSET = 1_000_000_000_000;

/** Elk id op of onder deze grens is een intervals-rit; bruikbaar als databasefilter. */
export const INTERVALS_RIDE_ID_CEILING = -INTERVALS_ID_OFFSET;

/** Negatief, omkeerbaar id; null als het intervals-id niet numeriek is. */
export function intervalsRideId(intervalsId: string | number | null | undefined): number | null {
  const match = String(intervalsId ?? "").trim().match(/^i?(\d{1,12})$/);
  if (!match) return null;
  return -(INTERVALS_ID_OFFSET + Number(match[1]));
}

export function isIntervalsRideId(id: number | string | null | undefined): boolean {
  const n = Number(id);
  return Number.isFinite(n) && n <= INTERVALS_RIDE_ID_CEILING;
}

/** Een id waarvoor strava.com/activities/{id} bestaat: alleen echte Strava-ritten. */
export function isStravaActivityId(id: number | string | null | undefined): boolean {
  const n = Number(id);
  return Number.isFinite(n) && n > 0;
}
