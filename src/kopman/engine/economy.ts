import { cardById, pool } from "./cards";
import { buildCourse, courseKind, courseWeights, fitFor } from "./course";
import { BASE_BUDGET, FAME_JERSEY, FAME_SKIP, FAME_START, fameAfter, fameNextSeason, goalStep, goalTarget, salaryOf, sponsorOffers, type Sponsor } from "./sponsors";
import { ITEMS, itemById, teamBonus } from "./items";
import { KIND_ODDS, openPack, PACK_PRICE } from "./packs";
import type { Lineup, Placing } from "./race";
import type { Carry } from "./board";
import { bookStage, generalOf, jerseysOf, newTour, TOUR_RECOVERY, tourRivals, type GcRow, type Jerseys, type TourState } from "./tour";
import { clamp, hashSeed, rng } from "./rng";
import { baseOverall, FORM_CAMP, FORM_COST, FORM_REST, FORM_SKIP, lifeFor, liveCardOf, restLives, retireAge, seasonChange, type RiderLife } from "./riders";
import { DIVISIONS, PROMOTED, RELEGATED, TOP_DIVISION } from "./divisions";
import { rivalTeams } from "./teams";
import { PLAYER_TEAM, RIDER_TYPES, type PackType, type RaceDef, type Tier, type TourDef } from "./types";
import { raceById, tourById } from "./world";

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
/** A stage pays this share of the prize money and season points of a race. */
export const STAGE_SHARE = 0.5;
/** The final general classification counts this many times the points of a race. */
export const GC_FACTOR = 2;
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
  /** The stage race under way, or null. */
  tour: TourState | null;
  /** Since 2026-11-13: age, talent, form and growth of every rider you own (riders.ts). */
  riders: Record<string, RiderLife>;
  /** Riders who stopped, for the erelijst. */
  legends: Legend[];
  /** The race slot of the last altitude camp: one per race. */
  camp: string | null;
  /** What the last change of season did to your riders, until you close it. */
  report: SeasonReport | null;
  /** Since 2026-11-13 (sponsors.ts): popularity, the sponsor of this season, and last season's if you met his goal. */
  fame: number;
  sponsor: Sponsor | null;
  loyal: string | null;
};

export type Legend = { id: string; season: number; age: number; wins: number; titles: number };
export type SeasonReport = { season: number; retired: { id: string; age: number; coins: number }[]; grown: { id: string; delta: number }[]; neo: string[] };

/** An altitude camp costs this times the prize share of the level. */
export const CAMP_COINS = 1500;

/** Every rider you own has a life; one you just got starts his. */
export function withLives(save: Save): Save {
  const riders = save.riders ?? {};
  const missing = Object.keys(save.collection).filter((id) => !riders[id]);
  if (!missing.length && save.riders) return save;
  const next = { ...riders };
  for (const id of missing) next[id] = lifeFor(save.seed, id);
  return { ...save, riders: next, legends: save.legends ?? [], camp: save.camp ?? null, report: save.report ?? null, fame: save.fame ?? FAME_START, sponsor: save.sponsor ?? null, loyal: save.loyal ?? null };
}

/** What a rider of yours earns: by his overall without the form. */
export const salaryFor = (save: Save, id: string) => salaryOf(save.riders?.[id] ? baseOverall(id, save.riders[id]) : cardById(id).overall);
/** The salaries of the five that start. */
export const lineupSalary = (save: Save) => (save.tour?.riders.length ? save.tour.riders : save.lineup).reduce((sum, id) => sum + salaryFor(save, id), 0);
/**
 * What your five may earn together: the sponsor's budget, or the level's
 * without one; never less than your five cheapest riders, so a team can
 * always start.
 */
export function budgetOf(save: Save) {
  const cheapest = Object.keys(save.collection).map((id) => salaryFor(save, id)).sort((a, b) => a - b).slice(0, LINEUP_SIZE).reduce((sum, n) => sum + n, 0);
  return Math.max(save.sponsor?.budget ?? BASE_BUDGET[save.division], cheapest);
}
/** A season starts with picking a sponsor. */
export const needsSponsor = (save: Save) => !save.sponsor && save.raceIndex === 0 && !save.tour && !seasonDone(save);
export const offersFor = (save: Save) => sponsorOffers(save.seed, save.season, save.division, save.fame, save.loyal);
export function chooseSponsor(save: Save, index: number): Save {
  const offer = needsSponsor(save) ? offersFor(save)[index] : undefined;
  return offer ? { ...save, sponsor: offer } : save;
}
/** Whether the next race can start: five riders, a kopman, a sponsor, and within the budget. */
export const canStart = (save: Save) => save.lineup.length === LINEUP_SIZE && !!save.kopman && !needsSponsor(save) && lineupSalary(save) <= budgetOf(save);

/** A rider as he rides today: his card with growth, and minus what he lacks in form. */
export const liveCard = (save: Save, id: string) => liveCardOf(id, save.riders?.[id]);
export const liveCards = (save: Save, ids: string[]) => Object.fromEntries(ids.map((id) => [id, liveCard(save, id)]));

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
  return withLives({
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
    tour: null,
    riders: {},
    legends: [],
    camp: null,
    report: null,
    fame: FAME_START,
    sponsor: null,
    loyal: null,
  });
}

/** The level a collection belongs in: the highest whose weakest team it beats, by its best five. */
export function divisionFor(collection: Record<string, number>) {
  const best = Object.keys(collection).map((id) => cardById(id).overall).sort((a, b) => b - a).slice(0, LINEUP_SIZE);
  const avg = best.length ? best.reduce((sum, n) => sum + n, 0) / best.length : 0;
  let division = 0;
  DIVISIONS.forEach((d, i) => { if (avg >= d.band[1] + 1) division = i; });
  return division;
}

/** `retired`: a rider who stopped in your team comes back as his sale value. */
export type Pull = { id: string; duplicate: boolean; retired?: number };

/** Opens the first unopened pack of this type. A duplicate stays as a spare copy, to trade in or sell. */
export function openPackOf(save: Save, type: PackType): { save: Save; type: PackType; pulls: Pull[]; guaranteed: boolean } | null {
  const index = save.packs.indexOf(type);
  if (index < 0) return null;
  const { cards, pity, guaranteed } = openPack(type, save.seed, save.packsOpened, save.pity);
  const collection = { ...save.collection };
  const items = { ...save.items };
  const gone = new Set((save.legends ?? []).map((l) => l.id));
  let coins = save.coins;
  const pulls = cards.map((id): Pull => {
    if (gone.has(id)) {
      const value = DUPLICATE_COINS[cardById(id).tier];
      coins += value;
      return { id, duplicate: false, retired: value };
    }
    const owned = itemById.has(id) ? items : collection;
    const duplicate = !!owned[id];
    owned[id] = (owned[id] ?? 0) + 1;
    return { id, duplicate };
  });
  const packs = save.packs.filter((_, i) => i !== index);
  return { save: withLives({ ...save, coins, collection, items, packs, packsOpened: save.packsOpened + 1, pity }), type, pulls, guaranteed };
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
  const gone = new Set((save.legends ?? []).map((l) => l.id));
  const options = kind === "renner" ? pool().pool.filter((c) => c.tier === up && !gone.has(c.id)).map((c) => c.id) : ITEMS.filter((x) => x.group === kind && x.tier === up).map((x) => x.id);
  const owned = kind === "renner" ? taken.collection : taken.items;
  const fresh = options.filter((id) => !owned[id]);
  const from = fresh.length ? fresh : options;
  const choice = from[Math.floor(random() * from.length)];
  const duplicate = !!owned[choice];
  owned[choice] = (owned[choice] ?? 0) + 1;
  return { save: withLives({ ...save, ...taken, trades: save.trades + 1 }), pull: { id: choice, duplicate } };
}

/** What a pack costs at your level, or undefined when the shop there does not sell it. */
export const priceAt = (save: Save, type: PackType) => (DIVISIONS[save.division].shop.includes(type) ? PACK_PRICE[type] : undefined);

export function buyPack(save: Save, type: PackType, price: number | undefined): Save | null {
  if (price === undefined || save.coins < price) return null;
  return { ...save, coins: save.coins - price, packs: [...save.packs, type] };
}

/** Adds or removes a rider from the lineup; the kopman follows the lineup. */
export function toggleLineup(save: Save, id: string): Save {
  // In a stage race you ride with the five you started with.
  if (!save.collection[id] || save.tour) return save;
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
  if (save.tour) {
    const best = [...save.tour.riders].sort((a, b) => fitFor(liveCard(save, b), weights) - fitFor(liveCard(save, a), weights) || a.localeCompare(b))[0];
    return best ? { ...save, kopman: best } : save;
  }
  const ranked = Object.keys(save.collection).map((id) => ({ id, fit: fitFor(liveCard(save, id), weights), salary: salaryFor(save, id) })).sort((a, b) => b.fit - a.fit || a.id.localeCompare(b.id));
  // Best fit first, as long as the places left can still be filled within the budget.
  const budget = budgetOf(save);
  const lineup: string[] = [];
  let spent = 0;
  for (const x of ranked) {
    if (lineup.length >= LINEUP_SIZE) break;
    const left = LINEUP_SIZE - lineup.length - 1;
    const cheapest = ranked.filter((y) => y.id !== x.id && !lineup.includes(y.id)).map((y) => y.salary).sort((a, b) => a - b).slice(0, left).reduce((sum, n) => sum + n, 0);
    if (spent + x.salary + cheapest > budget) continue;
    lineup.push(x.id);
    spent += x.salary;
  }
  // Nothing fits: the cheapest five, so the lineup is never empty.
  if (lineup.length < Math.min(LINEUP_SIZE, ranked.length)) {
    const cheap = [...ranked].sort((a, b) => a.salary - b.salary || b.fit - a.fit).slice(0, LINEUP_SIZE).map((x) => x.id);
    return { ...save, lineup: cheap, kopman: [...cheap].sort((a, b) => ranked.findIndex((x) => x.id === a) - ranked.findIndex((x) => x.id === b))[0] ?? null };
  }
  return { ...save, lineup, kopman: lineup[0] ?? null };
}

/** The races and stage races of a level, in calendar order. */
export const calendarOf = (division: number): (RaceDef | TourDef)[] => DIVISIONS[division].races.map((id) => raceById.get(id) ?? tourById.get(id)!);
export const isTour = (slot: RaceDef | TourDef): slot is TourDef => "stages" in slot;
/** The stage race of this slot in the calendar, if it is one. */
export const currentTour = (save: Save) => tourById.get(DIVISIONS[save.division].races[save.raceIndex] ?? "") ?? null;
/** The race to ride next: in a stage race, the next stage. */
export function currentRace(save: Save): RaceDef | null {
  const tour = currentTour(save);
  if (tour) return raceById.get(tour.stages[save.tour?.stage ?? 0]) ?? null;
  const slot = calendarOf(save.division)[save.raceIndex];
  return slot && !isTour(slot) ? slot : null;
}
export const seasonDone = (save: Save) => save.raceIndex >= calendarOf(save.division).length;
export const raceSeed = (save: Save) => currentTour(save) ? hashSeed(save.seed, save.season, save.division, save.raceIndex, "etappe", save.tour?.stage ?? 0) : hashSeed(save.seed, save.season, save.division, save.raceIndex);

/** Everything a board needs for the next race: in a stage race the same rivals every stage, and yesterday's kracht. */
export function raceSetup(save: Save): { raceId: string; seed: number; lineup: Lineup; carry?: Carry } | null {
  const race = currentRace(save);
  if (!race || !save.kopman) return null;
  const tour = currentTour(save);
  const riders = save.tour?.riders.length ? save.tour.riders : save.lineup;
  const kopman = riders.includes(save.kopman) ? save.kopman : riders[0];
  const lineup: Lineup = { riders, kopman, bonus: teamBonus(save.items), rivals: tour ? tourRivals(tour, riders) : undefined, cards: liveCards(save, riders) };
  const carry = tour && save.tour?.stage ? { tired: save.tour.kracht, player: Math.min(1, TOUR_RECOVERY + teamBonus(save.items).recovery), rival: TOUR_RECOVERY } : undefined;
  return { raceId: race.id, seed: raceSeed(save), lineup, carry };
}

export function prizeFor(place: number) {
  if (place < 1) return 0;
  return place <= PRIZES.length ? PRIZES[place - 1] : place <= 20 ? PRIZE_TOP20 : 0;
}

export function pointsFor(place: number, monument: boolean) {
  if (place < 1 || place > POINTS.length) return 0;
  return Math.round(POINTS[place - 1] * (monument ? MONUMENT_FACTOR : 1));
}

/** `pay`: the sponsor's share of `coins`; `bonus`: his goal met, on top. */
export type RaceReward = { coins: number; points: number; pack: PackType | null; best: number; season: SeasonReward | null; tour?: TourReward; pay?: number; bonus?: number };
/** After a stage: where the tour stands, and at the end the packs for the classifications. */
export type TourReward = { id: string; stage: number; of: number; done: boolean; general: GcRow[]; jerseys: Jerseys; packs: PackType[] };
export type SeasonReward = { rank: number; coins: number; pack: PackType | null; move: number; bonus?: number };

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
export function finishRace(save: Save, placings: Placing[], kracht: Record<string, number> = {}): { save: Save; reward: RaceReward } {
  const tour = currentTour(save);
  if (tour) return finishStage(save, tour, placings, kracht);
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
  const pub = publicity(save, placings, best, race.id, 1);
  const earned = coins + pub.pay;
  const next: Save = {
    ...save,
    riders: afterRide(save, placings, FORM_COST.race),
    coins: save.coins + earned + pub.bonus,
    fame: pub.fame,
    sponsor: pub.sponsor,
    packs: pack ? [...save.packs, pack] : save.packs,
    seasonPoints,
    raceIndex: save.raceIndex + 1,
    seasonResults: [...save.seasonResults, { race: race.id, winner: placings[0]?.id ?? "", best, points, coins: earned, pack }],
  };
  const closed = closeSeason(next);
  return { save: closed.save, reward: { coins: earned, points, pack, best, season: closed.season, pay: pub.pay, bonus: pub.bonus } };
}

/** A race for the sponsor and the public: his pay, his goal, your popularity. */
function publicity(save: Save, placings: Placing[], best: number, raceId: string, share: number) {
  const fame = fameAfter(save.fame ?? FAME_START, best, share, teamBonus(save.items).fame);
  const sponsor = save.sponsor;
  if (!sponsor) return { fame, sponsor: null, pay: 0, bonus: 0 };
  const ages = placings.filter((p) => p.team === PLAYER_TEAM && p.place >= 1 && p.place <= 10).map((p) => save.riders?.[p.id]?.age ?? 99);
  const step = goalStep(sponsor.goal, { best, kind: courseKind(buildCourse(raceById.get(raceId)!)), young: ages.length ? Math.min(...ages) : null });
  return { fame, pay: Math.round(sponsor.pay * share), ...meet(sponsor, sponsor.progress + step) };
}

/** The goal at this progress; met for the first time pays the bonus. */
function meet(sponsor: Sponsor, progress: number) {
  const met = sponsor.met || progress >= goalTarget(sponsor.goal);
  return { sponsor: { ...sponsor, progress, met }, bonus: met && !sponsor.met ? sponsor.bonus : 0 };
}

/** After a race: who rode loses form, who rested gets some back, a winner of yours counts his win. */
function afterRide(save: Save, placings: Placing[], cost: number): Record<string, RiderLife> {
  const lives = withLives(save).riders;
  const rode = new Set(placings.filter((p) => p.team === PLAYER_TEAM).map((p) => p.id));
  const winner = placings.find((p) => p.place === 1 && p.team === PLAYER_TEAM)?.id;
  const out: Record<string, RiderLife> = {};
  for (const id of Object.keys(save.collection)) {
    const life = lives[id];
    out[id] = { ...life, form: clamp(life.form + (rode.has(id) ? -cost : FORM_REST), 0, 100), wins: life.wins + (id === winner ? 1 : 0) };
  }
  return out;
}

/** Whether the next race can be left out: not in the middle of a stage race. */
export const canSkip = (save: Save) => !seasonDone(save) && !save.tour;

/**
 * Leaves out the next race (or the whole stage race before its first stage):
 * your riders rest, you get nothing. The others ride: their points follow from
 * their strength, with a seeded spread.
 */
export function skipRace(save: Save): Save | null {
  if (!canSkip(save)) return null;
  const slot = calendarOf(save.division)[save.raceIndex];
  const factor = isTour(slot) ? slot.stages.length * STAGE_SHARE + GC_FACTOR : slot.kind === "monument" ? MONUMENT_FACTOR : 1;
  const random = rng(hashSeed(save.seed, save.season, save.division, save.raceIndex, "zonder"));
  const field = rivalTeams(save.division).flatMap((t) => t.riders.map((id) => ({ team: t.id, key: cardById(id).overall + random() * 8 }))).sort((a, b) => b.key - a.key);
  const seasonPoints = { ...save.seasonPoints };
  field.slice(0, POINTS.length).forEach((r, i) => { seasonPoints[r.team] = (seasonPoints[r.team] ?? 0) + Math.round(POINTS[i] * factor); });
  const rested = withLives(save);
  const next: Save = {
    ...rested,
    riders: restLives(rested.riders, Object.keys(save.collection), FORM_SKIP),
    fame: clamp(rested.fame + FAME_SKIP, 0, 100),
    seasonPoints,
    raceIndex: save.raceIndex + 1,
    seasonResults: [...save.seasonResults, { race: slot.id, winner: "", best: 0, points: 0, coins: 0, pack: null }],
  };
  return closeSeason(next).save;
}

const slotKey = (save: Save) => `${save.season}:${save.raceIndex}:${save.tour?.stage ?? 0}`;
export const campCost = (save: Save) => Math.round(CAMP_COINS * DIVISIONS[save.division].prize);
/** Whether there was an altitude camp before this race already. */
export const campDone = (save: Save) => save.camp === slotKey(save);

/** An altitude camp before the next race: form for the five that start it. */
export function altitudeCamp(save: Save): Save | null {
  const cost = campCost(save);
  if (seasonDone(save) || campDone(save) || save.coins < cost) return null;
  const five = save.tour?.riders.length ? save.tour.riders : save.lineup;
  const rested = withLives(save);
  return { ...rested, coins: save.coins - cost, camp: slotKey(save), riders: restLives(rested.riders, five, FORM_CAMP) };
}

/** At the end of the season: the coins and pack for the rank. */
function closeSeason(save: Save): { save: Save; season: SeasonReward | null } {
  if (!seasonDone(save)) return { save, season: null };
  const level = DIVISIONS[save.division];
  const standings = seasonStandings(save);
  const rank = standings.findIndex((t) => t.id === PLAYER_TEAM) + 1;
  const move = moveFor(rank, standings.length, save.division);
  const seasonCoins = Math.round(SEASON_COINS.find((x) => rank <= x.upTo)?.coins ?? 0) * level.prize;
  const seasonPack = rank <= PROMOTED ? level.promotion : null;
  const goal = save.sponsor?.goal.kind === "eindstand" ? meet(save.sponsor, rank <= save.sponsor.goal.n ? 1 : 0) : null;
  const bonus = goal?.bonus ?? 0;
  const season = { rank, coins: Math.round(seasonCoins), pack: seasonPack, move, bonus };
  return { save: { ...save, coins: save.coins + season.coins + bonus, sponsor: goal?.sponsor ?? save.sponsor, packs: seasonPack ? [...save.packs, seasonPack] : save.packs }, season };
}

/**
 * Books a stage: half the prize money and season points of a race, a silver
 * pack for a stage win. After the last stage the general classification
 * counts double for the season, its winner gets a gold pack and every other
 * jersey of yours a silver one.
 */
function finishStage(save: Save, tour: TourDef, placings: Placing[], kracht: Record<string, number>): { save: Save; reward: RaceReward } {
  const race = currentRace(save)!;
  const level = DIVISIONS[save.division];
  const stage = bookStage(save.tour ?? newTour(), race.id, placings, kracht);
  // The five keep the order of your lineup.
  const order = (id: string) => (save.lineup.includes(id) ? save.lineup.indexOf(id) : 99);
  const booked = { ...stage, riders: [...stage.riders].sort((a, b) => order(a) - order(b) || a.localeCompare(b)) };
  const mine = placings.filter((p) => p.team === PLAYER_TEAM && p.place > 0);
  const best = mine.length ? Math.min(...mine.map((p) => p.place)) : 0;
  const prize = mine.reduce((sum, p) => sum + prizeFor(p.place), 0);
  const coins = Math.round((START_FEE * (1 + teamBonus(save.items).startFee) + prize) * level.prize * STAGE_SHARE);
  const stagePoints = (place: number) => Math.round(pointsFor(place, false) * STAGE_SHARE);
  const seasonPoints = { ...save.seasonPoints };
  for (const p of placings) seasonPoints[p.team] = (seasonPoints[p.team] ?? 0) + stagePoints(p.place);
  let points = mine.reduce((sum, p) => sum + stagePoints(p.place), 0);
  const pack: PackType | null = best === 1 ? "zilver" : null;
  const state: TourState = { ...booked, coins: booked.coins + coins, seasonPoints: booked.seasonPoints + points };
  const kopman = save.kopman && state.riders.includes(save.kopman) ? save.kopman : state.riders[0] ?? null;
  const general = generalOf(state);
  const jerseys = jerseysOf(state);
  const pub = publicity(save, placings, best, race.id, STAGE_SHARE);
  let bonus = pub.bonus;
  let next: Save = { ...save, riders: afterRide(save, placings, FORM_COST.stage), coins: save.coins + coins + pub.pay + pub.bonus, fame: pub.fame, sponsor: pub.sponsor, packs: pack ? [...save.packs, pack] : save.packs, seasonPoints, lineup: state.riders, kopman, tour: state };
  const done = state.stage >= tour.stages.length;
  const packs: PackType[] = [];
  if (done) {
    general.forEach((row, i) => { seasonPoints[row.team] = (seasonPoints[row.team] ?? 0) + Math.round(pointsFor(i + 1, false) * GC_FACTOR); });
    const gcPoints = general.reduce((sum, row, i) => sum + (row.team === PLAYER_TEAM ? Math.round(pointsFor(i + 1, false) * GC_FACTOR) : 0), 0);
    points += gcPoints;
    const own = (id: string | null) => !!id && state.team[id] === PLAYER_TEAM;
    if (own(jerseys.geel)) packs.push("goud");
    if (own(jerseys.groen)) packs.push("zilver");
    if (own(jerseys.berg)) packs.push("zilver");
    const gcBest = general.findIndex((row) => row.team === PLAYER_TEAM) + 1;
    const worn = [jerseys.geel, jerseys.groen, jerseys.berg].filter(own).length;
    const trui = next.sponsor?.goal.kind === "trui" ? meet(next.sponsor, worn ? 1 : 0) : null;
    bonus += trui?.bonus ?? 0;
    next = {
      ...next,
      coins: next.coins + (trui?.bonus ?? 0),
      sponsor: trui?.sponsor ?? next.sponsor,
      fame: clamp(next.fame + worn * FAME_JERSEY, 0, 100),
      seasonPoints,
      packs: [...next.packs, ...packs],
      tour: null,
      raceIndex: save.raceIndex + 1,
      seasonResults: [...save.seasonResults, { race: tour.id, winner: jerseys.geel ?? "", best: gcBest, points: state.seasonPoints + gcPoints, coins: state.coins, pack: packs[0] ?? null }],
    };
  }
  const closed = closeSeason(next);
  return { save: closed.save, reward: { coins: coins + pub.pay, points, pack, best, season: closed.season, pay: pub.pay, bonus, tour: { id: tour.id, stage: state.stage, of: tour.stages.length, done, general, jerseys, packs } } };
}

/** Where the season just finished sends you: up, down or staying. */
export function seasonMove(save: Save) {
  const standings = seasonStandings(save);
  return moveFor(standings.findIndex((t) => t.id === PLAYER_TEAM) + 1, standings.length, save.division);
}

/** The next season, a level up or down after promotion or relegation. Your riders turn a year older. */
export function newSeason(save: Save): Save {
  const division = Math.min(TOP_DIVISION, Math.max(0, save.division + (seasonDone(save) ? seasonMove(save) : 0)));
  return { ...ageRiders(save), season: save.season + 1, division, raceIndex: 0, seasonPoints: {}, seasonResults: [], tour: null, fame: fameNextSeason(save.fame ?? FAME_START), sponsor: null, loyal: save.sponsor?.met ? save.sponsor.name : null };
}

/** Riders a fresh team starts with after retirements, so there are always five. */
const NEO = { min: 52, max: 58 };

/**
 * A year on: the young grow towards their talent, the old decline, and those
 * at their age to stop leave with their sale value. Too few riders left, and
 * young bronze riders join.
 */
export function ageRiders(save: Save): Save {
  const s = withLives(save);
  const boost = teamBonus(s.items).growth;
  const collection = { ...s.collection };
  const riders: Record<string, RiderLife> = {};
  const legends = [...s.legends];
  const report: SeasonReport = { season: s.season + 1, retired: [], grown: [], neo: [] };
  let coins = s.coins;
  for (const id of Object.keys(collection).sort()) {
    const life = s.riders[id];
    const delta = seasonChange(life, baseOverall(id, life), boost);
    const age = life.age + 1;
    if (age >= retireAge(s.seed, id)) {
      const value = collection[id] * DUPLICATE_COINS[cardById(id).tier];
      coins += value;
      legends.push({ id, season: s.season, age, wins: life.wins, titles: life.titles });
      report.retired.push({ id, age, coins: value });
      delete collection[id];
      continue;
    }
    riders[id] = { ...life, age, growth: life.growth + delta, form: 100 };
    if (delta) report.grown.push({ id, delta });
  }
  const gone = new Set(legends.map((l) => l.id));
  const random = rng(hashSeed(s.seed, "neoprof", s.season));
  while (Object.keys(collection).length < LINEUP_SIZE) {
    const options = pool().pool.filter((c) => c.tier === "brons" && c.overall >= NEO.min && c.overall <= NEO.max && !collection[c.id] && !gone.has(c.id));
    const id = options[Math.floor(random() * options.length)].id;
    collection[id] = 1;
    riders[id] = lifeFor(s.seed, id, true);
    report.neo.push(id);
  }
  const lineup = s.lineup.filter((id) => collection[id]);
  // A place a rider left is filled by the best one not in the lineup.
  const rest = Object.keys(collection).filter((id) => !lineup.includes(id)).sort((a, b) => liveCardOf(b, riders[b]).overall - liveCardOf(a, riders[a]).overall || a.localeCompare(b));
  while (lineup.length < LINEUP_SIZE && rest.length) lineup.push(rest.shift()!);
  const kopman = s.kopman && lineup.includes(s.kopman) ? s.kopman : lineup[0] ?? null;
  const changed = report.retired.length || report.grown.length || report.neo.length;
  return { ...s, coins, collection, riders, legends, lineup, kopman, report: changed ? report : null };
}
