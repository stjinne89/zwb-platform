import { pacingRouteFromZwift } from "../../../src/lib/pacing/route-profile";
import type { RouteAccent } from "../../../src/lib/events/zwift-route";
import { gameRouteFrom } from "../../../src/lib/zwbgame/routes";
import type { GameRoute } from "../../../src/lib/zwbgame/types";

/**
 * Three real ladder routes with approximated profiles: lengths, lead-ins and
 * named segments from zwift-data 1.50, gradients drawn by hand. Test data, not
 * the synced library.
 */
type Piece = [fromKm: number, toKm: number, grade: number];
function profile(lapKm: number, pieces: Piece[]) {
  const distanceM: number[] = [], altitudeM: number[] = [];
  let height = 0;
  for (let d = 0; d <= lapKm * 1000; d += 25) {
    distanceM.push(d); altitudeM.push(+height.toFixed(2));
    const piece = pieces.find(([from, to]) => d / 1000 >= from && d / 1000 < to);
    height += (piece?.[2] ?? 0) * 25;
  }
  return { distanceM, altitudeM };
}
const accent = (slug: string, name: string, kind: "climb" | "sprint", startKm: number, endKm: number): RouteAccent => ({ slug, name, kind, startKm, endKm, avgInclinePct: null });
function route(slug: string, name: string, lapKm: number, leadInKm: number, laps: number, pieces: Piece[], accents: RouteAccent[]): GameRoute {
  const pacing = pacingRouteFromZwift({ profile: profile(lapKm, pieces), accents, leadInKm, leadInElevationM: 0, lapKm, laps });
  return gameRouteFrom(pacing, { slug, name, world: "watopia", laps, leadInKm, lapKm });
}
export const fixtureRoutes: GameRoute[] = [
  route("flat-route", "Flat Route", 10.269, 0.457, 2,
    [[1.5, 2.3, 0.015], [2.3, 3.1, -0.015], [5.0, 5.6, 0.02], [5.6, 6.2, -0.02]],
    [accent("watopia-sprint", "Watopia Sprint", "sprint", 7.2, 7.6)]),
  route("hilly-route", "Hilly Route", 9.193, 0.502, 2,
    [[0.9, 1.8, 0.05], [1.8, 2.9, -0.04], [4.0, 4.6, 0.04], [4.6, 5.4, -0.03], [8.2, 8.7, 0.012], [8.7, 9.1, -0.015]],
    [accent("zwift-kom", "Zwift KOM", "climb", 0.9, 1.8), accent("watopia-sprint", "Watopia Sprint", "sprint", 6.1, 6.5)]),
  route("cobbled-climbs", "Cobbled Climbs", 9.179, 0.284, 2,
    [[1.2, 1.6, 0.03], [1.6, 2.4, -0.015], [4.9, 5.5, 0.064], [5.5, 6.5, -0.03], [6.5, 6.7, 0.1], [6.7, 8.0, -0.022]],
    [accent("richmond-kom", "Richmond KOM", "climb", 4.9, 5.5), accent("23rd-st", "23rd St.", "climb", 6.5, 6.7)]),
];
