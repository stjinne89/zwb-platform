import type { PacingRoute } from "@/lib/pacing/route-profile";
import type { GameAccent, GameRoute } from "./types";

/**
 * Club Ladder courses: 15–25 km over one or more laps, the race book's guidance
 * (read 28 September 2026). Profiles come from our own route library; a route
 * without a synced profile is left out.
 */
export const LADDER_ROUTES: { slug: string; laps: number }[] = [
  { slug: "flat-route", laps: 2 },
  { slug: "hilly-route", laps: 2 },
  { slug: "cobbled-climbs", laps: 2 },
  { slug: "greater-london-loop", laps: 1 },
  { slug: "tempus-fugit", laps: 1 },
  { slug: "innsbruckring", laps: 2 },
  { slug: "glasgow-crit-circuit", laps: 6 },
];
export const GRID_METERS = 100;

/** Compacts a pacing route into what the game needs; named Zwift segments get a banner. */
export function gameRouteFrom(route: PacingRoute, meta: { slug: string; name: string; world: string; laps: number; leadInKm: number; lapKm: number }): GameRoute {
  const grades: number[] = [];
  // The pacing grid is 100 m; the last segment may be shorter.
  for (const segment of route.segments) grades.push(+Math.max(-0.2, Math.min(0.2, segment.gradient)).toFixed(4));
  const length = Math.round(route.totalKm * 1000);
  const accents: GameAccent[] = route.accents
    .map((a) => ({ name: a.name, kind: a.kind, start: Math.round(a.startKm * 1000), end: Math.round(a.endKm * 1000), banner: !a.id.startsWith("klim-") }))
    .filter((a) => a.end > a.start && a.end <= length);
  const lapLines = Array.from({ length: Math.max(0, meta.laps - 1) }, (_, i) => Math.round((meta.leadInKm + (i + 1) * meta.lapKm) * 1000)).filter((d) => d > 0 && d < length);
  return { id: meta.slug, name: meta.name, world: meta.world, laps: meta.laps, length, grades, accents, lapLines };
}

export function gradeAt(route: GameRoute, distance: number) {
  const index = Math.floor(Math.max(0, distance) / GRID_METERS);
  return route.grades[Math.min(route.grades.length - 1, index)] ?? 0;
}
const heights = new WeakMap<GameRoute, number[]>();
/** Height above the start, from the gradients. */
export function elevationAt(route: GameRoute, distance: number) {
  let cumulative = heights.get(route);
  if (!cumulative) {
    cumulative = [0];
    for (const grade of route.grades) cumulative.push(cumulative[cumulative.length - 1] + grade * GRID_METERS);
    heights.set(route, cumulative);
  }
  const d = Math.max(0, Math.min(distance, route.grades.length * GRID_METERS));
  const index = Math.min(route.grades.length - 1, Math.floor(d / GRID_METERS));
  return cumulative[index] + (d - index * GRID_METERS) * (route.grades[index] ?? 0);
}
/** The segment you are in, or the next one ahead. */
export function accentAhead(route: GameRoute, distance: number) {
  return route.accents.find((a) => a.end > distance) ?? null;
}
export function climbingShare(route: GameRoute) {
  return route.grades.reduce((sum, g) => sum + Math.max(0, g), 0) * GRID_METERS / route.length;
}
