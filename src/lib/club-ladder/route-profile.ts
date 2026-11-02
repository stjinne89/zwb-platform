import "server-only";

import { routes as zwiftRoutes } from "zwift-data";
import { accentsForRoute } from "@/lib/events/zwift-route";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";
import { pacingRouteFromZwift, type PacingAccent, type PacingSegment } from "@/lib/pacing/route-profile";
import { ladderRouteBySlug } from "./routes";

type Client = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export type LadderRouteProfile = {
  laps: number;
  totalKm: number;
  segments: Pick<PacingSegment, "distanceM" | "gradient" | "accentIndex">[];
  accents: PacingAccent[];
};

/** Zelfde marge als de pacing- en gameloader: een profiel dat meer dan 10 % afwijkt, hoort bij een andere route. */
const PROFILE_TOLERANCE = 0.1;

/**
 * Hoogteprofiel van een ladderparcours over lead-in en het kleinste toegestane
 * rondental, uit de routebibliotheek (`zwift_routes`). Null zonder bruikbaar profiel.
 */
export async function loadLadderRouteProfile(client: Client, slug: string): Promise<LadderRouteProfile | null> {
  const option = ladderRouteBySlug(slug);
  const meta = zwiftRoutes.find((route) => route.slug === slug);
  if (!option || !meta) return null;
  const { data } = await client.from("zwift_routes").select("profile").eq("slug", slug).maybeSingle();
  const profile = (data as { profile: RouteProfile | null } | null)?.profile;
  if (!profile?.distanceM?.length) return null;
  const profileKm = profile.distanceM[profile.distanceM.length - 1] / 1000;
  if (Math.abs(profileKm - meta.distance) / meta.distance > PROFILE_TOLERANCE) return null;

  const laps = option.laps[0].laps;
  const route = pacingRouteFromZwift({
    profile,
    accents: accentsForRoute(slug),
    leadInKm: meta.leadInDistance ?? 0,
    leadInElevationM: meta.leadInElevation ?? 0,
    lapKm: meta.distance,
    laps,
  });
  return {
    laps,
    totalKm: route.totalKm,
    segments: route.segments.map(({ distanceM, gradient, accentIndex }) => ({ distanceM, gradient, accentIndex })),
    accents: route.accents,
  };
}
