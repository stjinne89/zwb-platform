import { cardById, pool } from "./cards";
import { buildCourse, courseWeights, fitFor } from "./course";
import { ITEMS, itemById, teamBonus } from "./items";
import { KIND_ODDS, openPack, PACK_PRICE } from "./packs";
import type { Placing } from "./race";
import { hashSeed, rng } from "./rng";
import { DIVISIONS, PROMOTED, RELEGATED, TOP_DIVISION } from "./divisions";
import { rivalTeams } from "./teams";
import { PLAYER_TEAM, RIDER_TYPES, type PackType, type RaceDef, type Tier } from "./types";
import { raceById } from "./world";

/** 2: the pyramid. A save of version 1 is placed in a level on loading (save.ts). */
export const SAVE_VERSION = 2;
export const LINEUP_SIZE = 5;
export const START_COINS = 1500;
/** Prize money per place at the top level of the first version, top 10; 11 to 20 get the last entry. Each level pays its own share. */
export const PRIZES = [1500, 1000, 700, 500, 400, 320, 260, 210, 170, 140];
export const PRIZE_TOP20 = 80;
export const START_FEE = 300;
/** Season points per place, top 15, by team. Monuments count half again. */
export const POINTS = [100, 80, 65, 55, 45, 35, 30, 26, 22, 19, 16, 13, 10, 7, 5];
export const MONUMENT_FACTOR = 1.5;
/** What a spare copy sells for. */
export const DUPLICATE_COINS: Record<Tier, number> = { brons: 150, zilver: 500, goud: 2000, diamant: 6000 };
/** Spare copies of one tier that trade in for one card of the tier above, of any kind. */
export const TRADE_COST = 5;
export const NEXT_TIER: Partial<Record<Tier, Tier>> = { brons: "zilver", zilver: "goud", goud: "diamant" };
/**
 * End of season, by team rank: coins (times the level's share), and for the
 * teams that go up (or the top two of the top level) the level's promotion pack.
 */
export const SEASON_COINS: { upTo: number; coins: number }[] = [
  { upTo: 1, coins: 8000 },
  { upTo: 3, coins: 5000 },
  { upTo: 6, coins: 3000 },
  { upTo: 12, coins: 1500 },
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
  /** The level in the pyramid, 0 (Kermis) to TOP_DIVISION. */
  division: number;
  raceIndex: number;
  seasonPoints: Record<string, number>;
  seasonResults: RaceRecord[];
};

export const today = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/** A new career in the Kermis: five bronze riders, one of each type, some coins and a bronze pack. */
export function newSave(seed: number): Save {
  const random = rng(hashSeed(seed, "start"));
  const rivals = new Set(rivalTeams(0).flatMap((t) => t.riders));
  const starters = RIDER_TYPES.map((type) => {
    const low = pool().pool.filter((c) => c.type === type && c.overall >= 53 && c.overall <= 57);
    // Riders of the Kermis peloton only when there is no one else.
    const free = low.filter((c) => !rivals.has(c.id));
    const options = free.length ? free : low;
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
    packs: ["brons"],
    packsOpened: 0,
    pity: 0,
    season: 1,
    division: 0,
    raceIndex: 0,
    seasonPoints: {},
    seasonResults: [],
  };
}

/** The level a collection belongs in: the highest whose weakest team it beats, by its best five. */
export function divisionFor(collection: Record<string, number>) {
  const best = Object.keys(collection).map((id) => cardById(id).overall).sort((a, b) => b - a).slice(0, LINEUP_SIZE);
  const avg = best.length ? best.reduce((sum, n) => sum + n, 0) / best.length : 0;
  let division = 0;
  DIVISIONS.forEach((d, i) => { if (avg >= d.band[1] + 1) division = i; });
  return division;
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
  const out: Record<Tier, number> = { brons: 0, zilver: 0, goud: 0, diamant: 0 };
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
  return drawUp(save, takeSpares(save, tier, TRADE_COST)!, up);
}

/** How many copies of this card may go into a trade: all of them, except the last copy of a rider in the lineup. */
export const tradeable = (save: Save, id: string) => (itemById.has(id) ? save.items[id] ?? 0 : Math.max(0, (save.collection[id] ?? 0) - (save.lineup.includes(id) ? 1 : 0)));

/**
 * Trades cards you pick yourself, singles as well as spares: card id → copies,
 * TRADE_COST in total, all of one tier. A card whose last copy goes leaves the collection.
 */
export function tradeCards(save: Save, picks: Record<string, number>): { save: Save; pull: Pull } | null {
  const ids = Object.keys(picks).filter((id) => picks[id] > 0);
  if (!ids.length || ids.some((id) => !itemById.has(id) && !save.collection[id])) return null;
  const tier = tierOfId(ids[0]);
  const up = NEXT_TIER[tier];
  const total = ids.reduce((sum, id) => sum + picks[id], 0);
  if (!up || total !== TRADE_COST || ids.some((id) => tierOfId(id) !== tier || !Number.isInteger(picks[id]) || picks[id] > tradeable(save, id))) return null;
  const collection = { ...save.collection };
  const items = { ...save.items };
  for (const id of ids) {
    const owned = itemById.has(id) ? items : collection;
    owned[id] -= picks[id];
    if (owned[id] <= 0) delete owned[id];
  }
  return drawUp(save, { collection, items }, up);
}

/** One card of the tier above. The kind follows the pack odds; a card you do not have yet comes first. */
function drawUp(save: Save, taken: { collection: Record<string, number>; items: Record<string, number> }, up: Tier): { save: Save; pull: Pull } {
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

/** What a pack costs at your level, or undefined when the shop there does not sell it. */
export const priceAt = (save: Save, type: PackType) => (DIVISIONS[save.division].shop.includes(type) ? PACK_PRICE[type] : undefined);

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
  const def = raceById.get(raceId);
  if (!def) return save;
  const weights = courseWeights(buildCourse(def));
  const ranked = Object.keys(save.collection).map((id) => ({ id, fit: fitFor(cardById(id), weights) })).sort((a, b) => b.fit - a.fit || a.id.localeCompare(b.id));
  const lineup = ranked.slice(0, LINEUP_SIZE).map((x) => x.id);
  return { ...save, lineup, kopman: lineup[0] ?? null };
}

/** The races of a level, in calendar order. */
export const calendarOf = (division: number): RaceDef[] => DIVISIONS[division].races.map((id) => raceById.get(id)!);
export const currentRace = (save: Save) => calendarOf(save.division)[save.raceIndex] ?? null;
export const seasonDone = (save: Save) => save.raceIndex >= calendarOf(save.division).length;
export const raceSeed = (save: Save) => hashSeed(save.seed, save.season, save.division, save.raceIndex);

export function prizeFor(place: number) {
  if (place < 1) return 0;
  return place <= PRIZES.length ? PRIZES[place - 1] : place <= 20 ? PRIZE_TOP20 : 0;
}

export function pointsFor(place: number, monument: boolean) {
  if (place < 1 || place > POINTS.length) return 0;
  return Math.round(POINTS[place - 1] * (monument ? MONUMENT_FACTOR : 1));
}

export type RaceReward = { coins: number; points: number; pack: PackType | null; best: number; season: SeasonReward | null };
export type SeasonReward = { rank: number; coins: number; pack: PackType | null; move: number };

/**
 * The pack for a race, from the best own placing: what the level gives for a
 * win, for the podium and for the top 10. Outside the top 10 there is none.
 */
export function packFor(best: number, division: number): PackType | null {
  const packs = DIVISIONS[division].packs;
  if (best === 1) return packs.win;
  if (best >= 1 && best <= 3) return packs.podium;
  return best >= 1 && best <= 10 ? packs.top10 : null;
}

export function seasonStandings(save: Save) {
  const teams = [{ id: PLAYER_TEAM, name: save.teamName }, ...rivalTeams(save.division).map((t) => ({ id: t.id, name: t.name }))];
  return teams.map((t) => ({ ...t, points: save.seasonPoints[t.id] ?? 0 })).sort((a, b) => b.points - a.points || (a.id === PLAYER_TEAM ? -1 : b.id === PLAYER_TEAM ? 1 : a.id.localeCompare(b.id)));
}

/** Up (1), down (-1) or staying (0) for a team at this rank, in this level. */
export function moveFor(rank: number, teams: number, division: number) {
  if (rank >= 1 && rank <= PROMOTED && division < TOP_DIVISION) return 1;
  if (rank > teams - RELEGATED && division > 0) return -1;
  return 0;
}

/** Books a finished race: prize money, season points for every team, a pack, and the next race. */
export function finishRace(save: Save, placings: Placing[]): { save: Save; reward: RaceReward } {
  const race = currentRace(save);
  if (!race) throw new Error("Het seizoen is al klaar");
  const level = DIVISIONS[save.division];
  const monument = race.kind === "monument";
  const mine = placings.filter((p) => p.team === PLAYER_TEAM && p.place > 0);
  const best = mine.length ? Math.min(...mine.map((p) => p.place)) : 0;
  const prize = mine.reduce((sum, p) => sum + prizeFor(p.place), 0);
  const coins = Math.round((START_FEE * (1 + teamBonus(save.items).startFee) + prize) * level.prize * (monument ? MONUMENT_FACTOR : 1));
  const seasonPoints = { ...save.seasonPoints };
  for (const p of placings) seasonPoints[p.team] = (seasonPoints[p.team] ?? 0) + pointsFor(p.place, monument);
  const points = mine.reduce((sum, p) => sum + pointsFor(p.place, monument), 0);
  const pack = packFor(best, save.division);
  let next: Save = {
    ...save,
    coins: save.coins + coins,
    packs: pack ? [...save.packs, pack] : save.packs,
    seasonPoints,
    raceIndex: save.raceIndex + 1,
    seasonResults: [...save.seasonResults, { race: race.id, winner: placings[0]?.id ?? "", best, points, coins, pack }],
  };
  let season: SeasonReward | null = null;
  if (seasonDone(next)) {
    const standings = seasonStandings(next);
    const rank = standings.findIndex((t) => t.id === PLAYER_TEAM) + 1;
    const move = moveFor(rank, standings.length, save.division);
    const seasonCoins = Math.round(SEASON_COINS.find((x) => rank <= x.upTo)?.coins ?? 0) * level.prize;
    const seasonPack = rank <= PROMOTED ? level.promotion : null;
    season = { rank, coins: Math.round(seasonCoins), pack: seasonPack, move };
    next = { ...next, coins: next.coins + season.coins, packs: seasonPack ? [...next.packs, seasonPack] : next.packs };
  }
  return { save: next, reward: { coins, points, pack, best, season } };
}

/** Where the season just finished sends you: up, down or staying. */
export function seasonMove(save: Save) {
  const standings = seasonStandings(save);
  return moveFor(standings.findIndex((t) => t.id === PLAYER_TEAM) + 1, standings.length, save.division);
}

/** The next season, a level up or down after promotion or relegation. */
export function newSeason(save: Save): Save {
  const division = Math.min(TOP_DIVISION, Math.max(0, save.division + (seasonDone(save) ? seasonMove(save) : 0)));
  return { ...save, season: save.season + 1, division, raceIndex: 0, seasonPoints: {}, seasonResults: [] };
}
