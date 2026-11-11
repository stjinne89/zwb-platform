import { z } from "zod";
import { pool } from "./cards";
import { itemById } from "./items";
import { LINEUP_SIZE, SAVE_VERSION, type Save } from "./economy";
import { CALENDAR } from "./world";

/** The whole career lives on the device under one key. */
export const SAVE_KEY = "kopman:v1";

const pack = z.enum(["brons", "zilver", "goud"]);
const cardId = z.string().refine((id) => pool().byId.has(id));
const itemId = z.string().refine((id) => itemById.has(id));
const count = z.number().int().min(0).max(1e9);

const schema = z.object({
  v: z.literal(SAVE_VERSION),
  seed: z.number().int().min(0).max(2 ** 32 - 1),
  teamName: z.string().min(1).max(40),
  coins: count,
  collection: z.record(cardId, z.number().int().min(1).max(999)),
  // Saves from before equipment and staff have none yet.
  items: z.record(itemId, z.number().int().min(1).max(999)).default({}),
  lineup: z.array(cardId).max(LINEUP_SIZE),
  kopman: cardId.nullable(),
  packs: z.array(pack).max(500),
  packsOpened: count,
  pity: z.number().int().min(0).max(1000),
  season: z.number().int().min(1).max(10000),
  raceIndex: z.number().int().min(0).max(CALENDAR.length),
  seasonPoints: z.record(z.string().max(20), count),
  seasonResults: z.array(z.object({ race: z.string(), winner: z.string(), best: z.number().int().min(0), points: count, coins: count, pack: pack.nullable() })).max(CALENDAR.length),
  day: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), rewarded: z.number().int().min(0).max(100) }),
});

/** Reads a save; anything broken or tampered beyond repair gives null. */
export function parseSave(raw: string | null): Save | null {
  if (!raw) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const save = parsed.data as Save;
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
