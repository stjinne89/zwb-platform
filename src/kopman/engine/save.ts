import { z } from "zod";
import { pool } from "./cards";
import { SEASON_RACES, TOP_DIVISION } from "./divisions";
import { divisionFor, LINEUP_SIZE, SAVE_VERSION, withLives, type Save } from "./economy";
import { itemById } from "./items";

/** The whole career lives on the device under one key. */
export const SAVE_KEY = "kopman:v1";

const pack = z.enum(["brons", "zilver", "goud", "diamant"]);
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
  // Since 2026-11-13: the stage race under way. Older saves have none.
  tour: z.object({
    stage: z.number().int().min(1).max(30),
    riders: z.array(cardId).max(LINEUP_SIZE),
    team: z.record(cardId, z.string().max(20)),
    time: z.record(cardId, z.number().min(0).max(1e7)),
    points: z.record(cardId, count),
    kom: z.record(cardId, count),
    kracht: z.record(cardId, z.number().min(0).max(100)),
    coins: count,
    seasonPoints: count,
  }).nullable().default(null),
  // Since 2026-11-13: riders live (riders.ts). Older saves get their lives on loading.
  riders: z.record(cardId, z.object({
    age: z.number().int().min(15).max(60),
    talent: z.number().int().min(30).max(99),
    form: z.number().min(0).max(100),
    wins: count,
    titles: count,
    growth: z.number().int().min(-60).max(60),
    extra: z.partialRecord(z.enum(["vlak", "klim", "sprint", "tijdrit", "kasseien", "afdalen"]), z.number().int().min(-20).max(20)),
  })).default({}),
  legends: z.array(z.object({ id: cardId, season: z.number().int().min(1), age: z.number().int(), wins: count, titles: count })).max(2000).default([]),
  camp: z.string().max(40).nullable().default(null),
  report: z.object({
    season: z.number().int().min(1),
    retired: z.array(z.object({ id: cardId, age: z.number().int(), coins: count })).max(500),
    grown: z.array(z.object({ id: cardId, delta: z.number().int() })).max(500),
    neo: z.array(cardId).max(50),
  }).nullable().default(null),
  fame: z.number().min(0).max(100).default(20),
  sponsor: z.object({
    name: z.string().max(60),
    pay: count,
    budget: count,
    goal: z.object({ kind: z.enum(["zeges", "soort", "top5", "eindstand", "jong", "trui", "titel"]), n: z.number().int().min(0).max(100), soort: z.string().max(20).optional() }),
    bonus: count,
    progress: count,
    met: z.boolean(),
  }).nullable().default(null),
  loyal: z.string().max(60).nullable().default(null),
  // Round C: the choice after a race, a challenge of the press, the tasks of the season, the season of the last championship.
  event: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("kopman"), rider: cardId }),
    z.object({ kind: z.literal("bod"), rider: cardId, team: z.string().max(20), coins: count }),
    z.object({ kind: z.literal("val"), rider: cardId }),
    z.object({ kind: z.literal("pers") }),
  ]).nullable().default(null),
  pledge: z.literal("pers").nullable().default(null),
  tasks: z.array(z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("soort"), type: z.enum(["sprinter", "klimmer", "klassieker", "tijdrijder", "allrounder"]), tier: z.enum(["brons", "zilver", "goud", "diamant"]), n: z.number().int().min(1).max(20), done: z.boolean() }),
    z.object({ kind: z.literal("land"), country: z.string().max(5), n: z.number().int().min(1).max(20), done: z.boolean() }),
    z.object({ kind: z.literal("groei"), rider: cardId, soort: z.string().max(20), n: z.number().int().min(1).max(20), progress: count, done: z.boolean() }),
  ])).max(10).nullable().default(null),
  champ: z.number().int().min(1).nullable().default(null),
});

/** Before the pyramid: one calendar of 16 races and a daily limit on packs. */
const v1 = z.object({ ...base, v: z.literal(1), raceIndex: z.number().int().min(0).max(16) });

/**
 * A save from before the pyramid goes to the level its best five belong in.
 * The season it was in starts again there, as the races are not the same; the
 * collection, coins and packs stay.
 */
function fromV1(old: z.infer<typeof v1>): Save {
  return { ...old, v: SAVE_VERSION, division: divisionFor(old.collection), raceIndex: 0, seasonPoints: {}, seasonResults: [], tour: null, riders: {}, legends: [], camp: null, report: null, fame: 20, sponsor: null, loyal: null, event: null, pledge: null, tasks: null, champ: null };
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
    return withLives(save);
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
