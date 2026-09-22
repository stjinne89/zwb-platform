// Een ZRL-teamrace wordt zonder route aangemaakt (zie de ZRL-import); de route
// hangt vaak aan de raceweek erboven. Voor het pacingplan en de routekaart neemt
// de teamrace dan de route van zijn raceweek over. Een eigen aantal rondes gaat
// voor, want divisies rijden soms een ander aantal.

export type RouteFields = {
  gpx_path: string | null;
  zwift_route_id: number | string | null;
  laps: number | string | null;
};

export function hasOwnRoute(event: Pick<RouteFields, "gpx_path" | "zwift_route_id">): boolean {
  return Boolean(event.gpx_path || event.zwift_route_id);
}

/** Het event met de route van zijn parent erin, als het zelf geen route heeft. */
export function withParentRoute<T extends RouteFields>(
  event: T,
  parent: RouteFields | null | undefined,
): T {
  if (hasOwnRoute(event) || !parent || !hasOwnRoute(parent)) return event;
  const ownLaps = event.laps != null && event.laps !== "" ? event.laps : null;
  return {
    ...event,
    gpx_path: parent.gpx_path,
    zwift_route_id: parent.zwift_route_id,
    laps: ownLaps ?? parent.laps,
  };
}
