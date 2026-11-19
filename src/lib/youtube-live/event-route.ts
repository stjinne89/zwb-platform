import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { routes as zwiftRoutes } from "zwift-data";

// De route van een gestreamde race, voor thumbnail en overlay. Los van
// thumbnail.tsx, zodat de overlay next/og niet meeneemt.

export type ThumbnailEvent = {
  title: string;
  type: string;
  start_at: string;
  zwift_route_id: number | null;
  laps: number | null;
  parent_event_id: string | null;
};

/** De route van de race, of die van zijn raceweek (zoals bij klaarzetten). */
export async function thumbnailRoute(
  admin: SupabaseClient,
  event: ThumbnailEvent,
): Promise<{ routeName: string | null; laps: number | null }> {
  let routeId = event.zwift_route_id;
  let laps = event.laps;
  if (!routeId && event.parent_event_id) {
    const { data } = await admin
      .from("events")
      .select("zwift_route_id, laps")
      .eq("id", event.parent_event_id)
      .maybeSingle();
    const parent = data as { zwift_route_id: number | null; laps: number | null } | null;
    routeId = parent?.zwift_route_id ?? null;
    laps = laps ?? parent?.laps ?? null;
  }
  const routeName = routeId ? zwiftRoutes.find((r) => r.id === Number(routeId))?.name ?? null : null;
  return { routeName, laps };
}

