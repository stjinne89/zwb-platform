// De omvang van een event: hoe ver en hoe lang er echt gereden wordt.
//
// Bij een rondekoers is de GPX één ronde; `distance_km` en `elevation_m` zijn
// dan de maten van die ronde. Met `laps` gaat het totaal keer het aantal
// rondes, met `duration_minutes` (rijden tot de tijd op is) is het totaal
// onbekend. Bij een Zwift-event is `distance_km` al het totaal, inclusief
// lead-in en ronden (zie zwiftRaceTotals); daar verandert dit niets aan.

export type RouteSizeFields = {
  gpx_path?: string | null;
  zwift_route_id?: number | string | null;
  distance_km: number | string | null;
  elevation_m: number | string | null;
  laps?: number | string | null;
  duration_minutes?: number | string | null;
};

export type RouteSize = {
  /** Totale afstand, of null als die niet vast ligt. */
  distanceKm: number | null;
  elevationM: number | null;
  /** Maten van één ronde, alleen bij een rondekoers op een GPX. */
  lapKm: number | null;
  laps: number | null;
  durationMinutes: number | null;
};

function positive(value: number | string | null | undefined): number | null {
  const n = value == null || value === "" ? NaN : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Rondes op een GPX-route; bij een Zwift-route gaat `laps` over die route. */
export function gpxLaps(event: RouteSizeFields): number | null {
  if (!event.gpx_path || event.zwift_route_id) return null;
  const laps = positive(event.laps);
  return laps == null ? null : Math.round(laps);
}

export function eventRouteSize(event: RouteSizeFields): RouteSize {
  const km = positive(event.distance_km);
  const hm = positive(event.elevation_m);
  const durationMinutes = positive(event.duration_minutes);
  const laps = gpxLaps(event);

  if (laps != null) {
    return {
      distanceKm: km == null ? null : Math.round(km * laps * 10) / 10,
      elevationM: hm == null ? null : Math.round(hm * laps),
      lapKm: km,
      laps,
      durationMinutes,
    };
  }
  // Rondjes tot de tijd op is: de GPX is een ronde, het totaal staat niet vast.
  if (durationMinutes != null && event.gpx_path && !event.zwift_route_id) {
    return { distanceKm: null, elevationM: null, lapKm: km, laps: null, durationMinutes };
  }
  return { distanceKm: km, elevationM: hm, lapKm: null, laps: null, durationMinutes };
}

function formatKm(km: number): string {
  return km.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
}

/** "150 min · ronde 8,1 km" of "5 × 8,1 km = 40,7 km · 25 hm", voor een kopregel. */
export function eventRouteSizeLabel(event: RouteSizeFields): string | null {
  const size = eventRouteSize(event);
  const parts: string[] = [];
  if (size.durationMinutes != null) parts.push(`${size.durationMinutes} min`);
  if (size.laps != null && size.lapKm != null) {
    parts.push(`${size.laps} × ${formatKm(size.lapKm)} km = ${formatKm(size.distanceKm ?? 0)} km`);
  } else if (size.laps != null) {
    parts.push(`${size.laps} rondes`);
  } else if (size.lapKm != null) {
    parts.push(`ronde ${formatKm(size.lapKm)} km`);
  } else if (size.distanceKm != null) {
    parts.push(`${formatKm(size.distanceKm)} km`);
  }
  if (size.elevationM != null) parts.push(`${size.elevationM} hm`);
  return parts.length > 0 ? parts.join(" · ") : null;
}
