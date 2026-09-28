import "server-only";
import { routes as zwiftRoutes } from "zwift-data";
import { accentsForRoute } from "@/lib/events/zwift-route";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";
import { pacingRouteFromZwift } from "@/lib/pacing/route-profile";
import { LADDER_ROUTES, gameRouteFrom } from "./routes";
import type { GameBootstrap, GameRoute } from "./types";

type Client = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};
type Row = { route_id?: number | string; slug: string; name: string; world: string | null; profile: RouteProfile | null };
/** Same margin as the pacing loader: a profile more than 10 % off belongs to another course. */
const PROFILE_TOLERANCE = 0.1;

/** One library row rolled out over lead-in and laps; null when the profile is missing or off. */
function routeFromRow(row: Row | undefined, laps: number, id: string): GameRoute | null {
  const meta = row && zwiftRoutes.find((r) => r.slug === row.slug);
  if (!row?.profile?.distanceM?.length || !meta) return null;
  const profileKm = row.profile.distanceM[row.profile.distanceM.length - 1] / 1000;
  if (Math.abs(profileKm - meta.distance) / meta.distance > PROFILE_TOLERANCE) return null;
  const pacing = pacingRouteFromZwift({
    profile: row.profile, accents: accentsForRoute(row.slug),
    leadInKm: meta.leadInDistance ?? 0, leadInElevationM: meta.leadInElevation ?? 0, lapKm: meta.distance, laps,
  });
  return { ...gameRouteFrom(pacing, { slug: row.slug, name: row.name, world: row.world ?? meta.world, laps, leadInKm: meta.leadInDistance ?? 0, lapKm: meta.distance }), id };
}

/** The ladder courses whose profile is in our route library. Missing or odd profiles are left out. */
export async function loadGameRoutes(client: Client): Promise<GameRoute[]> {
  const { data, error } = await client.from("zwift_routes").select("slug, name, world, profile").in("slug", LADDER_ROUTES.map((r) => r.slug));
  if (error) return [];
  const rows = new Map(((data ?? []) as Row[]).map((row) => [row.slug, row]));
  return LADDER_ROUTES.flatMap(({ slug, laps }) => routeFromRow(rows.get(slug), laps, slug) ?? []);
}

/**
 * The next ZWB ZRL race in the club calendar with a Zwift route, to practise: your
 * own team's race first, otherwise any ZRL race of that week. Optional: without a
 * route or profile the ZRL mode uses the ladder courses.
 */
export async function loadZrlRace(client: Client, teamId: string | null, now = Date.now()): Promise<GameBootstrap["zrlRace"]> {
  const from = new Date(now - 3 * 3600000).toISOString(), until = new Date(now + 14 * 86400000).toISOString();
  const events = await client.from("events").select("id, title, start_at, team_id, zwift_route_id, laps").eq("type", "zrl").gte("start_at", from).lte("start_at", until);
  if (events.error) return null;
  const rows = ((events.data ?? []) as { title: string; start_at: string; team_id: string | null; zwift_route_id: number | string | null; laps: number | string | null }[])
    .filter((e) => Number(e.zwift_route_id) > 0)
    .sort((a, b) => Number(b.team_id === teamId && teamId !== null) - Number(a.team_id === teamId && teamId !== null) || a.start_at.localeCompare(b.start_at));
  const event = rows[0];
  if (!event) return null;
  const route = await client.from("zwift_routes").select("route_id, slug, name, world, profile").eq("route_id", Number(event.zwift_route_id)).maybeSingle();
  if (route.error || !route.data) return null;
  const laps = Math.max(1, Math.min(20, Math.round(Number(event.laps) || 1)));
  const game = routeFromRow(route.data as Row, laps, `zrl:${(route.data as Row).slug}:${laps}`);
  if (!game) return null;
  return { route: game, title: event.title, date: event.start_at, format: /race of truth/i.test(event.title) ? "rot" : null };
}
