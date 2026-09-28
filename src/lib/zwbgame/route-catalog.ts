import "server-only";
import { routes as zwiftRoutes } from "zwift-data";
import { accentsForRoute } from "@/lib/events/zwift-route";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";
import { pacingRouteFromZwift } from "@/lib/pacing/route-profile";
import { LADDER_ROUTES, gameRouteFrom } from "./routes";
import type { GameRoute } from "./types";

type Client = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};
/** Same margin as the pacing loader: a profile more than 10 % off belongs to another course. */
const PROFILE_TOLERANCE = 0.1;

/** The ladder courses whose profile is in our route library. Missing or odd profiles are left out. */
export async function loadGameRoutes(client: Client): Promise<GameRoute[]> {
  const { data, error } = await client.from("zwift_routes").select("slug, name, world, profile").in("slug", LADDER_ROUTES.map((r) => r.slug));
  if (error) return [];
  const rows = new Map(((data ?? []) as { slug: string; name: string; world: string | null; profile: RouteProfile | null }[]).map((row) => [row.slug, row]));
  return LADDER_ROUTES.flatMap(({ slug, laps }) => {
    const row = rows.get(slug);
    const meta = zwiftRoutes.find((r) => r.slug === slug);
    if (!row?.profile?.distanceM?.length || !meta) return [];
    const profileKm = row.profile.distanceM[row.profile.distanceM.length - 1] / 1000;
    if (Math.abs(profileKm - meta.distance) / meta.distance > PROFILE_TOLERANCE) return [];
    const pacing = pacingRouteFromZwift({
      profile: row.profile, accents: accentsForRoute(slug),
      leadInKm: meta.leadInDistance ?? 0, leadInElevationM: meta.leadInElevation ?? 0, lapKm: meta.distance, laps,
    });
    return [gameRouteFrom(pacing, { slug, name: row.name, world: row.world ?? meta.world, laps, leadInKm: meta.leadInDistance ?? 0, lapKm: meta.distance })];
  });
}
