import { z } from "zod";
import { maxRaceSeconds } from "./engine";
import type { FrrTour } from "./frr";
import { OWN_TEAM, type LadderStanding } from "./ladder";
import { basicRider } from "./roster";
import { GAME_VERSION, type GameRider, type GameRoute, type RaceResult, type RaceState } from "./types";

const finite = z.number().finite();
const id = z.string().max(100);
const powerup = z.enum(["feather", "aero", "draft"]);
const riderSchema = z.object({
  id, revision: z.string().max(100), team: id.nullable(),
  distance: finite.min(-100).max(100000), speed: finite.min(0).max(25), lane: finite.min(-5).max(5),
  mode: z.enum(["save", "ride", "front", "attack"]), targetId: id.nullable(), effort: finite.min(0).max(10),
  wbal: finite.min(0).max(60000), wprime: finite.min(1000).max(60000), spent: finite.min(0).max(1000000), sheltered: z.boolean(), tucked: z.boolean(),
  powerup: powerup.nullable(), active: z.object({ id: powerup, left: finite.min(0).max(60) }).nullable(),
  finishTime: finite.min(0).max(20000).nullable(), attacks: finite.min(0), shelteredSeconds: finite.min(0).max(20000),
  form: finite.min(0.9).max(1.1), job: z.object({ for: id, kind: z.enum(["bring", "leadout", "points"]) }).nullable(),
});
const savedSchema = z.object({
  version: z.literal(GAME_VERSION), savedAt: finite,
  config: z.object({
    mode: z.enum(["ladder", "free", "zrl", "frr"]), format: z.enum(["points", "rot", "scratch", "ttt"]).optional(), routeId: id, seed: z.number().int(), playerId: id,
    squads: z.array(z.object({ id, riders: z.array(id).min(1).max(5) })).min(2).max(8).optional(),
    field: z.array(id).min(1).max(24).optional(), stage: z.object({ index: z.number().int().min(0).max(9), kind: z.enum(["road", "itt"]) }).optional(),
  }),
  routeLength: finite, tick: z.number().int().min(0).max(200000), finished: z.boolean(), order: z.enum(["free", "bring", "leadout", "points"]),
  passes: z.array(z.object({ r: z.number().int().min(0).max(40), a: z.number().int().min(0).max(200), s: finite.min(0), e: finite.min(0).nullable() })).max(4000),
  riders: z.array(riderSchema).min(1).max(40),
});
export function serializeRace(state: RaceState) {
  // Names, power attributes and the route profile are not retained in browser storage.
  const { route, riders, ...rest } = state;
  return JSON.stringify({ ...rest, routeLength: route.length, savedAt: Date.now(), riders: riders.map(({ rider, ...r }) => ({ ...r, id: rider.id, revision: rider.revision })) });
}
export function restoreRace(json: string, roster: GameRider[], routes: GameRoute[], playerId: string, now = Date.now()): RaceState | null {
  try {
    const parsed = savedSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    const { savedAt, routeLength, ...saved } = parsed.data;
    const route = routes.find((r) => r.id === saved.config.routeId);
    if (!route || route.length !== routeLength || saved.tick * 0.2 > maxRaceSeconds(route)) return null;
    if (saved.config.playerId !== playerId || savedAt > now + 60000 || now - savedAt > 7 * 86400000 || saved.finished) return null;
    const ids = new Set(saved.riders.map((r) => r.id));
    if (ids.size !== saved.riders.length || !ids.has(playerId)) return null;
    if (saved.riders.some((r) => (r.job && !ids.has(r.job.for)) || (r.targetId && !ids.has(r.targetId)))) return null;
    const squads = saved.config.squads;
    const teamed = saved.config.mode === "ladder" || saved.config.mode === "zrl";
    if ((saved.config.mode === "frr") !== Boolean(saved.config.field && saved.config.stage)) return null;
    if (saved.config.field && (saved.config.field.length !== saved.riders.length || saved.riders.some((r) => !saved.config.field!.includes(r.id)))) return null;
    if (teamed !== Boolean(squads) || (teamed && saved.riders.some((r) => !squads!.some((s) => s.id === r.team && s.riders.includes(r.id))))) return null;
    if (!teamed && saved.riders.some((r) => r.team !== null)) return null;
    if (saved.passes.some((p) => p.r >= saved.riders.length || p.a >= route.accents.length)) return null;
    return {
      ...saved, route,
      riders: saved.riders.map(({ id, revision, ...state }, index) => {
        const current = roster.find((r) => r.id === id);
        const rider = current && current.revision === revision ? current : basicRider(id, current?.name ?? `Gast ${index + 1}`);
        return { ...state, rider };
      }),
    };
  } catch { return null; }
}
export const saveKey = (playerId: string) => `zwbgame:v${GAME_VERSION}:${playerId}:race`;
// Results kept their key across game versions; older entries still show.
export const resultsKey = (playerId: string) => `zwbgame:v1:${playerId}:results`;
export const ladderKey = (playerId: string) => `zwbgame:v${GAME_VERSION}:${playerId}:ladder`;
const LEGACY_COURSES = { polder: "Polderkoers", ardennen: "Ardennenjacht", heuvelrug: "Heuvelrug", alpen: "Alpenfinale" } as const;
const resultSchema = z.union([
  z.object({
    id: z.string(), mode: z.enum(["ladder", "free", "zrl", "frr"]), route: z.string().max(80), date: z.string(), place: z.number().int().min(1).max(40), count: z.number().int().min(1).max(40), seconds: finite.min(0).max(20000),
    score: z.tuple([finite, finite]).optional(), format: z.enum(["points", "rot", "scratch", "ttt"]).optional(), teamRank: z.tuple([z.number().int(), z.number().int()]).optional(),
    stage: z.tuple([z.number().int(), z.number().int()]).optional(),
  }),
  // Versions 1–3 raced on the Flamme Rouge-style courses.
  z.object({ id: z.string(), courseId: z.enum(["polder", "ardennen", "heuvelrug", "alpen"]), date: z.string(), place: z.number().int().min(1).max(24), count: z.number().int().min(1).max(24), seconds: finite.min(0).max(1800) })
    .transform(({ courseId, ...r }) => ({ ...r, mode: "free" as const, route: LEGACY_COURSES[courseId] })),
]);
export function readResults(json: string | null): RaceResult[] {
  try { return z.array(resultSchema).max(20).parse(JSON.parse(json ?? "[]")); } catch { return []; }
}
const ladderSchema = z.object({
  version: z.literal(1), order: z.array(id).min(1).max(12),
  history: z.array(z.object({ date: z.string(), rival: id, route: z.string().max(80), score: z.tuple([finite, finite]), won: z.boolean() })).max(20),
});
export function readLadder(json: string | null): LadderStanding | null {
  try {
    const parsed = ladderSchema.parse(JSON.parse(json ?? "null"));
    return parsed.order.includes(OWN_TEAM) ? parsed : null;
  } catch { return null; }
}
export const tourKey = (playerId: string) => `zwbgame:v${GAME_VERSION}:${playerId}:tour`;
const points = z.array(finite.min(0).max(100000)).max(24);
const tourSchema = z.object({
  version: z.literal(1), seed: z.number().int(), field: z.array(id).min(1).max(24),
  stages: z.array(z.object({ routeId: id, kind: z.enum(["road", "itt"]), ssr: z.number().int().min(1).max(5) })).min(1).max(9),
  results: z.array(z.object({ times: z.array(finite.min(0).nullable()).max(24), finish: points, sprint: points, climb: points, broom: z.array(z.boolean()).max(24) })).max(9),
});
/** The tour in progress: rider ids and numbers only, no names. */
export function readTour(json: string | null, playerId: string): FrrTour | null {
  try {
    const tour = tourSchema.parse(JSON.parse(json ?? "null"));
    const n = tour.field.length;
    if (!tour.field.includes(playerId) || new Set(tour.field).size !== n || tour.results.length > tour.stages.length) return null;
    if (tour.results.some((r) => [r.times, r.finish, r.sprint, r.climb, r.broom].some((list) => list.length !== n))) return null;
    return tour;
  } catch { return null; }
}
