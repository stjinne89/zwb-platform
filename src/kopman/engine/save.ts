import { z } from "zod";
import { pool } from "./cards";
import { SEASON_RACES, TOP_DIVISION } from "./divisions";
import { divisionFor, LINEUP_SIZE, SAVE_VERSION, type Save } from "./economy";
import { itemById } from "./items";

/** The whole career lives on the device under one key. */
export const SAVE_KEY = "kopman:v1";

const pack = z.enum(["brons", "zilver", "goud"]);
const cardId = z.string().refine((id) => pool().byId.has(id));
const itemId = z.string().refine((id) => itemById.has(id));
const count = z.number().int().min(0).max(1e9);

const base = {
  seed: z.number().int().min(0).max(2 ** 32 - 1),
  teamName: z.string().min(1).max(40),
  coins: count,
  collection: z.record(cardId, z.number().int().min(1).max(999)),
  // Saves from before equipment and staff have none yet.
  items: z.record(itemId, z.number().int().min(1).max(999)).default({}),
  trades: count.default(0),
  lineup: z.array(cardId).max(LINEUP_SIZE),
  kopman: cardId.nullable(),
  packs: z.array(pack).max(500),
  packsOpened: count,
  pity: z.number().int().min(0).max(1000),
  season: z.number().int().min(1).max(10000),
  seasonPoints: z.record(z.string().max(20), count),
};

const schema = z.object({
  ...base,
  v: z.literal(SAVE_VERSION),
  division: z.number().int().min(0).max(TOP_DIVISION),
  raceIndex: z.number().int().min(0).max(SEASON_RACES),
  seasonResults: z.array(z.object({ race: z.string(), winner: z.string(), best: z.number().int().min(0), points: count, coins: count, pack: pack.nullable() })).max(SEASON_RACES),
});

/** Before the pyramid: one calendar of 16 races and a daily limit on packs. */
const v1 = z.object({ ...base, v: z.literal(1), raceIndex: z.number().int().min(0).max(16) });

/**
 * A save from before the pyramid goes to the level its best five belong in.
 * The season it was in starts again there, as the races are not the same; the
 * collection, coins and packs stay.
 */
function fromV1(old: z.infer<typeof v1>): Save {
  return { ...old, v: SAVE_VERSION, division: divisionFor(old.collection), raceIndex: 0, seasonPoints: {}, seasonResults: [] };
}

/** Reads a save; anything broken or tampered beyond repair gives null. */
export function parseSave(raw: string | null): Save | null {
  if (!raw) return null;
  try {
    const json = JSON.parse(raw);
    const parsed = schema.safeParse(json);
    const old = parsed.success ? null : v1.safeParse(json);
    const save = parsed.success ? (parsed.data as Save) : old?.success ? fromV1(old.data) : null;
    if (!save) return null;
    // A lineup can only hold riders you own, once each.
    if (new Set(save.lineup).size !== save.lineup.length || save.lineup.some((id) => !save.collection[id])) return null;
    if (save.kopman && !save.lineup.includes(save.kopman)) return null;
    return save;
  } catch {
    return null;
  }
}

type Store = Pick<Storage, "getItem" | "setItem">;

export function loadSave(store: Store | null): Save | null {
  try { return parseSave(store?.getItem(SAVE_KEY) ?? null); } catch { return null; }
}

export function storeSave(store: Store | null, save: Save) {
  try { store?.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; }
}
