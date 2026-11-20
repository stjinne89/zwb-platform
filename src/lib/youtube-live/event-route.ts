import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { routes as zwiftRoutes } from "zwift-data";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";
import { streamRouteFacts, type StreamRoute } from "./route-facts";

// De route van een gestreamde race, voor thumbnail en overlay. Los van
// thumbnail.tsx, zodat de overlay next/og niet meeneemt.
//
// De route-id komt van de race, anders van zijn raceweek, anders uit de
// Zwift-eventcache (zwift_events, via het Zwift-event van de race). Naam,
// afstand en hoogte uit zwift-data, anders uit de routebibliotheek
// (zwift_routes); het hoogteprofiel alleen uit de routebibliotheek.

export type ThumbnailEvent = {
  title: string;
  type: string;
  start_at: string;
  zwift_route_id: number | null;
  laps: number | null;
  parent_event_id: string | null;
  zwift_event_id?: number | string | null;
  distance_km?: number | string | null;
  elevation_m?: number | string | null;
};

export type { StreamRoute };

type LibraryRow = {
  name: string | null;
  profile: RouteProfile | null;
  profile_distance_m: number | null;
  profile_elevation_m: number | null;
};

const numberOrNull = (value: unknown) => {
  const n = Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isFinite(n) && n > 0 ? n : null;
};

export async function streamRoute(admin: SupabaseClient, event: ThumbnailEvent): Promise<StreamRoute> {
  let routeId = numberOrNull(event.zwift_route_id);
  let laps = numberOrNull(event.laps);
  if (!routeId && event.parent_event_id) {
    const { data } = await admin
      .from("events")
      .select("zwift_route_id, laps")
      .eq("id", event.parent_event_id)
      .maybeSingle();
    const parent = data as { zwift_route_id: number | null; laps: number | null } | null;
    routeId = numberOrNull(parent?.zwift_route_id);
    laps = laps ?? numberOrNull(parent?.laps);
  }
  let eventDistanceM: number | null = null;
  const zwiftEventId = numberOrNull(event.zwift_event_id);
  if (!routeId && zwiftEventId) {
    const { data } = await admin
      .from("zwift_events")
      .select("route_id, laps, distance_m")
      .eq("event_id", zwiftEventId)
      .maybeSingle();
    const cached = data as { route_id: number | null; laps: number | null; distance_m: number | null } | null;
    routeId = numberOrNull(cached?.route_id);
    laps = laps ?? numberOrNull(cached?.laps);
    eventDistanceM = numberOrNull(cached?.distance_m);
  }

  const known = routeId ? zwiftRoutes.find((r) => r.id === routeId) ?? null : null;
  let library: LibraryRow | null = null;
  if (routeId) {
    const { data } = await admin
      .from("zwift_routes")
      .select("name, profile, profile_distance_m, profile_elevation_m")
      .eq("route_id", routeId)
      .maybeSingle();
    library = (data as LibraryRow | null) ?? null;
  }

  return streamRouteFacts({
    laps,
    eventDistanceKm: numberOrNull(event.distance_km),
    eventElevationM: numberOrNull(event.elevation_m),
    zwiftEventDistanceM: eventDistanceM,
    route: known
      ? {
          name: known.name,
          distanceKm: known.distance,
          elevationM: known.elevation,
          leadInKm: known.leadInDistance ?? 0,
          leadInElevationM: known.leadInElevation ?? 0,
        }
      : null,
    library: library
      ? {
          name: library.name,
          distanceM: numberOrNull(library.profile_distance_m),
          elevationM: numberOrNull(library.profile_elevation_m),
          profile: library.profile,
        }
      : null,
  });
}
