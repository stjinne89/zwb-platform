// Waar een live-renner op de eventroute zit.
//
// De plek volgt uit het dichtstbijzijnde GPX-punt. Bij een koers in rondjes
// zegt dat niet hoeveel rondes er al zijn gereden; daarvoor is de afstand van
// de fietscomputer (Garmin/Wahoo, live_positions.distance_m) nodig.

export type RoutePoint = { lat: number; lon: number };

export function haversineKm(a: RoutePoint, b: RoutePoint) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Totale afstand van de koers. Is de eventafstand duidelijk langer dan de GPX,
 * dan is de GPX één ronde van een rondjeskoers.
 */
export function raceTotalKm(routeKm: number, raceKm: number | null | undefined) {
  const lapRace = raceKm != null && raceKm > routeKm * 1.2;
  return { totalKm: lapRace ? raceKm : routeKm, lapRace };
}

/**
 * Index van het GPX-punt waar de renner zit, plus de afstand ernaartoe.
 * Komt de route binnen `nearKm` meer dan eens langs (rondes of heen en terug
 * in één GPX), dan kiest `rideKm` de juiste doorkomst; anders het dichtstbij.
 */
export function pickRoutePoint(
  rider: RoutePoint,
  points: RoutePoint[],
  cumulativeKm: number[],
  rideKm: number | null,
  nearKm: number,
) {
  let best = 0;
  let bestKm = Infinity;
  const near: { i: number; km: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    const km = haversineKm(rider, points[i]);
    if (km < bestKm) {
      bestKm = km;
      best = i;
    }
    if (km <= nearKm) near.push({ i, km });
  }
  if (rideKm === null || near.length === 0) return { index: best, offKm: bestKm };

  const along = near.map((n) => cumulativeKm[n.i]);
  if (Math.max(...along) - Math.min(...along) <= 2) return { index: best, offKm: bestKm };

  const anchor = near.reduce((a, n) =>
    Math.abs(cumulativeKm[n.i] - rideKm) < Math.abs(cumulativeKm[a.i] - rideKm) ? n : a,
  );
  const pass = near
    .filter((n) => Math.abs(cumulativeKm[n.i] - cumulativeKm[anchor.i]) <= 1)
    .reduce((a, n) => (n.km < a.km ? n : a));
  return { index: pass.i, offKm: pass.km };
}
