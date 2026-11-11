import { cardById, pool } from "./cards";
import { buildCourse, courseWeights, fitFor } from "./course";
import { ITEMS, itemById, teamBonus } from "./items";
import { KIND_ODDS, openPack } from "./packs";
import type { Placing } from "./race";
import { hashSeed, rng } from "./rng";
import { rivalTeams } from "./teams";
import { PLAYER_TEAM, RIDER_TYPES, type PackType, type Tier } from "./types";
import { CALENDAR } from "./world";

export const SAVE_VERSION = 1;
export const LINEUP_SIZE = 5;
/** Races per day that pay out a pack. Coins and season points always count. */
export const DAILY_PACK_RACES = 3;
export const START_COINS = 1500;
/** Prize money per place, top 10; 11 to 20 get the last entry. */
export const PRIZES = [1500, 1000, 700, 500, 400, 320, 260, 210, 170, 140];
export const PRIZE_TOP20 = 80;
export const START_FEE = 300;
/** Season points per place, top 15, by team. Monuments count half again. */
export const POINTS = [100, 80, 65, 55, 45, 35, 30, 26, 22, 19, 16, 13, 10, 7, 5];
export const MONUMENT_FACTOR = 1.5;
/** What a spare copy sells for. */
export const DUPLICATE_COINS: Record<Tier, number> = { brons: 150, zilver: 500, goud: 2000 };
/** Spare copies of one tier that trade in for one card of the tier above, of any kind. */
export const TRADE_COST = 5;
export const NEXT_TIER: Partial<Record<Tier, Tier>> = { brons: "zilver", zilver: "goud" };
/** End of season, by team rank: coins and a pack. */
export const SEASON_REWARDS: { upTo: number; coins: number; pack: PackType }[] = [
  { upTo: 1, coins: 8000, pack: "goud" },
  { upTo: 3, coins: 5000, pack: "zilver" },
  { upTo: 6, coins: 3000, pack: "zilver" },
  { upTo: 12, coins: 1500, pack: "brons" },
];

export type RaceRecord = { race: string; winner: string; best: number; points: number; coins: number; pack: PackType | null };

export type Save = {
  v: typeof SAVE_VERSION;
  seed: number;
  teamName: string;
  coins: number;
  /** Card id → copies owned (at least 1). */
  collection: Record<string, number>;
  /** Equipment and staff card id → copies owned. Per slot the best one counts. */
  items: Record<string, number>;
  /** Trade-ins so far: seeds the next one, so a reload cannot reroll it. */
  trades: number;
  lineup: string[];
  kopman: string | null;
  packs: PackType[];
  packsOpened: number;
  pity: number;
  season: number;
  raceIndex: number;
  seasonPoints: Record<string, number>;
  seasonResults: RaceRecord[];
  day: { date: string; rewarded: number };
};

export const today = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/** A new career: five bronze riders, one of each type, some coins and a silver pack. */
export function newSave(seed: number, date: string): Save {
  const random = rng(hashSeed(seed, "start"));
  const rivals = new Set(rivalTeams().flatMap((t) => t.riders));
  const starters = RIDER_TYPES.map((type) => {
    const options = pool().pool.filter((c) => c.type === type && c.tier === "brons" && c.overall >= 55 && !rivals.has(c.id));
    return options[Math.floor(random() * options.length)].id;
  });
  return {
    v: SAVE_VERSION,
    seed,
    teamName: "Mijn ploeg",
    coins: START_COINS,
    collection: Object.fromEntries(starters.map((id) => [id, 1])),
    items: {},
    trades: 0,
    lineup: starters,
    kopman: starters[0],
    packs: ["zilver"],
    packsOpened: 0,
    pity: 0,
    season: 1,
    raceIndex: 0,
    seasonPoints: {},
    seasonResults: [],
    day: { date, rewarded: 0 },
  };
}

export type Pull = { id: string; duplicate: boolean };

/** Opens the first unopened pack of this type. A duplicate stays as a spare copy, to trade in or sell. */
export function openPackOf(save: Save, type: PackType): { save: Save; type: PackType; pulls: Pull[]; guaranteed: boolean } | null {
  const index = save.packs.indexOf(type);
  if (index < 0) return null;
  const { cards, pity, guaranteed } = openPack(type, save.seed, save.packsOpened, save.pity);
  const collection = { ...save.collection };
  const items = { ...save.items };
  const pulls = cards.map((id) => {
    const owned = itemById.has(id) ? items : collection;
    const duplicate = !!owned[id];
    owned[id] = (owned[id] ?? 0) + 1;
    return { id, duplicate };
  });
  const packs = save.packs.filter((_, i) => i !== index);
  return { save: { ...save, collection, items, packs, packsOpened: save.packsOpened + 1, pity }, type, pulls, guaranteed };
}

const tierOfId = (id: string) => itemById.get(id)?.tier ?? cardById(id).tier;

/** Spare copies per tier: every copy beyond the first, riders and equipment and staff together. */
export function sparesByTier(save: Save): Record<Tier, number> {
  const out: Record<Tier, number> = { brons: 0, zilver: 0, goud: 0 };
  for (const owned of [save.collection, save.items]) for (const [id, n] of Object.entries(owned)) out[tierOfId(id)] += n - 1;
  return out;
}

/** Takes `count` spare copies of this tier, the most-held cards first, and never a last copy. */
function takeSpares(save: Save, tier: Tier, count: number) {
  const collection = { ...save.collection };
  const items = { ...save.items };
  const held = [...Object.keys(collection).map((id) => ({ id, owned: collection })), ...Object.keys(items).map((id) => ({ id, owned: items }))]
    .filter(({ id }) => tierOfId(id) === tier);
  for (let left = count; left > 0; left--) {
    const next = held.filter(({ id, owned }) => owned[id] > 1).sort((a, b) => b.owned[b.id] - a.owned[a.id] || a.id.localeCompare(b.id))[0];
    if (!next) return null;
    next.owned[next.id]--;
  }
  return { collection, items };
}

/** Sells every spare copy of this tier. */
export function sellSpares(save: Save, tier: Tier): { save: Save; coins: number } | null {
  const n = sparesByTier(save)[tier];
  if (n <= 0) return null;
  const taken = takeSpares(save, tier, n)!;
  const coins = n * DUPLICATE_COINS[tier];
  return { save: { ...save, ...taken, coins: save.coins + coins }, coins };
}

/**
 * Trades TRADE_COST spare copies of one tier for one card of the tier above.
 * The kind follows the pack odds; a card you do not have yet comes first.
 */
export function tradeUp(save: Save, tier: Tier): { save: Save; pull: Pull } | null {
  const up = NEXT_TIER[tier];
  if (!up || sparesByTier(save)[tier] < TRADE_COST) return null;
  const taken = takeSpares(save, tier, TRADE_COST)!;
  const random = rng(hashSeed(save.seed, "ruil", save.trades));
  const r = random();
  const kind = r < KIND_ODDS.renner ? "renner" : r < KIND_ODDS.renner + KIND_ODDS.materiaal ? "materiaal" : "personeel";
  const options = kind === "renner" ? pool().pool.filter((c) => c.tier === up).map((c) => c.id) : ITEMS.filter((x) => x.group === kind && x.tier === up).map((x) => x.id);
  const owned = kind === "renner" ? taken.collection : taken.items;
  const fresh = options.filter((id) => !owned[id]);
  const from = fresh.length ? fresh : options;
  const choice = from[Math.floor(random() * from.length)];
  const duplicate = !!owned[choice];
  owned[choice] = (owned[choice] ?? 0) + 1;
  return { save: { ...save, ...taken, trades: save.trades + 1 }, pull: { id: choice, duplicate } };
}

export function buyPack(save: Save, type: PackType, price: number | undefined): Save | null {
  if (price === undefined || save.coins < price) return null;
  return { ...save, coins: save.coins - price, packs: [...save.packs, type] };
}

/** Adds or removes a rider from the lineup; the kopman follows the lineup. */
export function toggleLineup(save: Save, id: string): Save {
  if (!save.collection[id]) return save;
  if (save.lineup.includes(id)) {
    const lineup = save.lineup.filter((x) => x !== id);
    return { ...save, lineup, kopman: save.kopman === id ? lineup[0] ?? null : save.kopman };
  }
  if (save.lineup.length >= LINEUP_SIZE) return save;
  const lineup = [...save.lineup, id];
  return { ...save, lineup, kopman: save.kopman ?? id };
}

export function setKopman(save: Save, id: string): Save {
  return save.lineup.includes(id) ? { ...save, kopman: id } : save;
}

/** The best five from the collection for this race, best fit as kopman. */
export function bestLineup(save: Save, raceId: string): Save {
  const def = CALENDAR.find((r) => r.id === raceId);
  if (!def) return save;
  const weights = courseWeights(buildCourse(def));
  const ranked = Object.keys(save.collection).map((id) => ({ id, fit: fitFor(cardById(id), weights) })).sort((a, b) => b.fit - a.fit || a.id.localeCompare(b.id));
  const lineup = ranked.slice(0, LINEUP_SIZE).map((x) => x.id);
  return { ...save, lineup, kopman: lineup[0] ?? null };
}

export const currentRace = (save: Save) => CALENDAR[save.raceIndex] ?? null;
export const seasonDone = (save: Save) => save.raceIndex >= CALENDAR.length;
export const raceSeed = (save: Save) => hashSeed(save.seed, save.season, save.raceIndex);
export const packsLeftToday = (save: Save, date: string) => (save.day.date === date ? Math.max(0, DAILY_PACK_RACES - save.day.rewarded) : DAILY_PACK_RACES);

export function prizeFor(place: number) {
  if (place < 1) return 0;
  return place <= PRIZES.length ? PRIZES[place - 1] : place <= 20 ? PRIZE_TOP20 : 0;
}

export function pointsFor(place: number, monument: boolean) {
  if (place < 1 || place > POINTS.length) return 0;
  return Math.round(POINTS[place - 1] * (monument ? MONUMENT_FACTOR : 1));
}

export type RaceReward = { coins: number; points: number; pack: PackType | null; best: number; dailyUsed: boolean; season: SeasonReward | null };
export type SeasonReward = { rank: number; coins: number; pack: PackType };

/** The reward for a race: from the best own placing. Finishing earns bronze, the podium silver, a monument win gold. */
export function packFor(best: number, monument: boolean): PackType | null {
  if (best === 1) return monument ? "goud" : "zilver";
  if (best >= 1 && best <= 3) return "zilver";
  return best >= 1 ? "brons" : null;
}

export function seasonStandings(save: Save) {
  const teams = [{ id: PLAYER_TEAM, name: save.teamName }, ...rivalTeams().map((t) => ({ id: t.id, name: t.name }))];
  return teams.map((t) => ({ ...t, points: save.seasonPoints[t.id] ?? 0 })).sort((a, b) => b.points - a.points || (a.id === PLAYER_TEAM ? -1 : b.id === PLAYER_TEAM ? 1 : a.id.localeCompare(b.id)));
}

/** Books a finished race: prize money, season points for every team, a pack, and the next race. */
export function finishRace(save: Save, placings: Placing[], date: string): { save: Save; reward: RaceReward } {
  const race = currentRace(save);
  if (!race) throw new Error("Het seizoen is al klaar");
  const monument = race.kind === "monument";
  const mine = placings.filter((p) => p.team === PLAYER_TEAM && p.place > 0);
  const best = mine.length ? Math.min(...mine.map((p) => p.place)) : 0;
  const prize = mine.reduce((sum, p) => sum + prizeFor(p.place), 0);
  const coins = Math.round((START_FEE * (1 + teamBonus(save.items).startFee) + prize) * (monument ? MONUMENT_FACTOR : 1));
  const seasonPoints = { ...save.seasonPoints };
  for (const p of placings) seasonPoints[p.team] = (seasonPoints[p.team] ?? 0) + pointsFor(p.place, monument);
  const points = mine.reduce((sum, p) => sum + pointsFor(p.place, monument), 0);
  const day = save.day.date === date ? save.day : { date, rewarded: 0 };
  const dailyUsed = day.rewarded < DAILY_PACK_RACES;
  const pack = dailyUsed ? packFor(best, monument) : null;
  let next: Save = {
    ...save,
    coins: save.coins + coins,
    packs: pack ? [...save.packs, pack] : save.packs,
    seasonPoints,
    raceIndex: save.raceIndex + 1,
    seasonResults: [...save.seasonResults, { race: race.id, winner: placings[0]?.id ?? "", best, points, coins, pack }],
    day: { date, rewarded: day.rewarded + (dailyUsed ? 1 : 0) },
  };
  let season: SeasonReward | null = null;
  if (seasonDone(next)) {
    const rank = seasonStandings(next).findIndex((t) => t.id === PLAYER_TEAM) + 1;
    const tier = SEASON_REWARDS.find((x) => rank <= x.upTo)!;
    season = { rank, coins: tier.coins, pack: tier.pack };
    next = { ...next, coins: next.coins + tier.coins, packs: [...next.packs, tier.pack] };
  }
  return { save: next, reward: { coins, points, pack, best, dailyUsed, season } };
}

export function newSeason(save: Save): Save {
  return { ...save, season: save.season + 1, raceIndex: 0, seasonPoints: {}, seasonResults: [] };
}
