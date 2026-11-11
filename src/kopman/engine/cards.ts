import { drawName } from "./names";
import { clamp, rng } from "./rng";
import { RIDER_TYPES, STAT_KEYS, type RiderCard, type RiderType, type StatKey, type Stats, type Tier } from "./types";

/** How much each stat counts towards the overall rating, per rider type. */
export const TYPE_WEIGHTS: Record<RiderType, Stats> = {
  sprinter: { vlak: 0.3, klim: 0.05, sprint: 0.45, tijdrit: 0.05, kasseien: 0.1, afdalen: 0.05 },
  klimmer: { vlak: 0.1, klim: 0.5, sprint: 0.05, tijdrit: 0.15, kasseien: 0.05, afdalen: 0.15 },
  klassieker: { vlak: 0.3, klim: 0.15, sprint: 0.15, tijdrit: 0.05, kasseien: 0.3, afdalen: 0.05 },
  tijdrijder: { vlak: 0.3, klim: 0.1, sprint: 0.025, tijdrit: 0.5, kasseien: 0.025, afdalen: 0.05 },
  allrounder: { vlak: 0.2, klim: 0.25, sprint: 0.1, tijdrit: 0.25, kasseien: 0.05, afdalen: 0.15 },
};

/** A rider type's stat shape around its overall rating. */
const TYPE_SHAPE: Record<RiderType, Stats> = {
  sprinter: { vlak: 3, klim: -24, sprint: 12, tijdrit: -12, kasseien: -4, afdalen: -6 },
  klimmer: { vlak: -14, klim: 9, sprint: -20, tijdrit: -4, kasseien: -22, afdalen: 2 },
  klassieker: { vlak: 4, klim: -12, sprint: -5, tijdrit: -14, kasseien: 9, afdalen: -4 },
  tijdrijder: { vlak: 3, klim: -8, sprint: -18, tijdrit: 10, kasseien: -12, afdalen: -4 },
  allrounder: { vlak: -2, klim: 3, sprint: -12, tijdrit: 3, kasseien: -12, afdalen: 0 },
};

export const TIER_MIN: Record<Tier, number> = { brons: 0, zilver: 65, goud: 75 };

export function tierOf(overall: number): Tier {
  return overall >= TIER_MIN.goud ? "goud" : overall >= TIER_MIN.zilver ? "zilver" : "brons";
}

export function overallOf(type: RiderType, stats: Stats) {
  const weights = TYPE_WEIGHTS[type];
  return Math.round(STAT_KEYS.reduce((sum, key) => sum + stats[key] * weights[key], 0));
}

const STAT_MIN = 30;
const STAT_MAX = 99;

/** Stats for a type that land on (or as close as clamping allows to) the target overall. */
export function statsFor(type: RiderType, target: number, random: () => number): Stats {
  const shape = TYPE_SHAPE[type];
  const noise = Object.fromEntries(STAT_KEYS.map((k) => [k, Math.round((random() - 0.5) * 10)])) as Stats;
  let shift = 0;
  let stats = {} as Stats;
  for (let i = 0; i < 6; i++) {
    stats = Object.fromEntries(STAT_KEYS.map((k) => [k, clamp(Math.round(target + shape[k] + noise[k] + shift), STAT_MIN, STAT_MAX)])) as Stats;
    const diff = target - overallOf(type, stats);
    if (diff === 0) break;
    shift += diff;
  }
  return stats;
}

const TYPE_SHARE: [RiderType, number][] = [["sprinter", 0.2], ["klimmer", 0.24], ["klassieker", 0.22], ["tijdrijder", 0.14], ["allrounder", 0.2]];
const TIER_SHARE: [Tier, number][] = [["brons", 0.45], ["zilver", 0.38], ["goud", 0.17]];

function weighted<T>(random: () => number, table: [T, number][]) {
  let r = random();
  for (const [value, share] of table) {
    if ((r -= share) < 0) return value;
  }
  return table[table.length - 1][0];
}

function targetFor(tier: Tier, random: () => number) {
  if (tier === "goud") return 75 + Math.floor(random() ** 1.8 * 15);
  if (tier === "zilver") return 65 + Math.floor(random() * 10);
  return 52 + Math.floor(random() * 13);
}

export const POOL_SEED = 20261111;
export const POOL_SIZE = 320;

/** The fixed world of riders. The same for every player and every version of this seed. */
export function buildPool(seed = POOL_SEED, size = POOL_SIZE): RiderCard[] {
  const random = rng(seed);
  const taken = new Set<string>();
  const pool: RiderCard[] = [];
  for (let i = 0; i < size; i++) {
    const type = weighted(random, TYPE_SHARE);
    const wanted = weighted(random, TIER_SHARE);
    const stats = statsFor(type, targetFor(wanted, random), random);
    const overall = overallOf(type, stats);
    const name = drawName(random, taken);
    pool.push({ id: `r${String(i + 1).padStart(3, "0")}`, ...name, type, stats, overall, tier: tierOf(overall) });
  }
  return pool;
}

let cached: { pool: RiderCard[]; byId: Map<string, RiderCard> } | null = null;

export function pool() {
  if (!cached) {
    const list = buildPool();
    cached = { pool: list, byId: new Map(list.map((c) => [c.id, c])) };
  }
  return cached;
}

export function cardById(id: string) {
  const card = pool().byId.get(id);
  if (!card) throw new Error(`Onbekende renner: ${id}`);
  return card;
}

export const STAT_LABELS: Record<StatKey, string> = { vlak: "Vlak", klim: "Klim", sprint: "Sprint", tijdrit: "Tijdrit", kasseien: "Kasseien", afdalen: "Afdalen" };
export const STAT_SHORT: Record<StatKey, string> = { vlak: "VLA", klim: "KLI", sprint: "SPR", tijdrit: "TIJ", kasseien: "KAS", afdalen: "AFD" };
export const TYPE_LABELS: Record<RiderType, string> = { sprinter: "Sprinter", klimmer: "Klimmer", klassieker: "Klassiekerrenner", tijdrijder: "Tijdrijder", allrounder: "Allrounder" };
export const TIER_LABELS: Record<Tier, string> = { brons: "Brons", zilver: "Zilver", goud: "Goud" };

export { RIDER_TYPES };
