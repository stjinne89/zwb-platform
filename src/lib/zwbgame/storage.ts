import { z } from "zod";
import { basicRider } from "./roster";
import { GAME_VERSION, type GameRider, type RaceResult, type RaceState } from "./types";

const finite = z.number().finite();
const riderSchema = z.object({
  id: z.string().max(100), revision: z.string().max(100),
  distance: finite.min(-100).max(50000), speed: finite.min(0).max(25), lane: finite.min(-5).max(5),
  energy: finite.min(0).max(200), maxEnergy: finite.min(100).max(200), reserve: finite.min(0).max(100), hydration: finite.min(0).max(100), recovery: finite.min(1).max(2),
  effort: finite.min(0.4).max(1.25), tactic: z.enum(["wheel", "front", "pull", "attack"]), targetId: z.string().nullable(),
  gels: z.number().int().min(0).max(3), bottles: z.number().int().min(0).max(3), fed: z.boolean(), eating: finite.min(0).max(5), drinking: finite.min(0).max(4), digesting: finite.min(0).max(90), sheltered: z.boolean(), finishTime: finite.min(0).max(1800).nullable(), attacks: finite.min(0), shelteredSeconds: finite.min(0).max(1801),
});
const savedSchema = z.object({
  version: z.literal(GAME_VERSION), savedAt: finite,
  config: z.object({ courseId: z.enum(["polder", "ardennen", "alpen"]), seed: z.number().int(), playerId: z.string() }),
  tick: z.number().int().min(0).max(9001), finished: z.boolean(), riders: z.array(riderSchema).min(1).max(24),
});
export function serializeRace(state: RaceState) {
  // Names and power attributes are not retained in browser storage.
  return JSON.stringify({ ...state, savedAt: Date.now(), riders: state.riders.map(({ rider, ...rest }) => ({ ...rest, id: rider.id, revision: rider.revision })) });
}
export function restoreRace(json: string, roster: GameRider[], playerId: string, now = Date.now()): RaceState | null {
  try {
    const parsed = savedSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    const saved = parsed.data;
    if (saved.config.playerId !== playerId || saved.savedAt > now + 60000 || now - saved.savedAt > 7 * 86400000 || saved.finished) return null;
    if (new Set(saved.riders.map((r) => r.id)).size !== saved.riders.length || !saved.riders.some((r) => r.id === playerId)) return null;
    return {
      version: saved.version, config: saved.config, tick: saved.tick, finished: saved.finished,
      riders: saved.riders.map(({ id, revision, ...state }, index) => {
        const current = roster.find((r) => r.id === id);
        const rider = current && current.revision === revision ? current : basicRider(id, current?.name ?? `Gast ${index + 1}`);
        return { ...state, rider };
      }),
    };
  } catch { return null; }
}
export const saveKey = (id: string) => `zwbgame:v${GAME_VERSION}:${id}:race`;
export const resultsKey = (id: string) => `zwbgame:v${GAME_VERSION}:${id}:results`;
const resultSchema = z.object({ id: z.string(), courseId: z.enum(["polder", "ardennen", "alpen"]), date: z.string(), place: z.number().int().min(1).max(24), count: z.number().int().min(1).max(24), seconds: finite.min(0).max(1800) });
export function readResults(json: string | null): RaceResult[] {
  try { return z.array(resultSchema).max(20).parse(JSON.parse(json ?? "[]")); } catch { return []; }
}
