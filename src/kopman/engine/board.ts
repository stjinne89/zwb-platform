import { cardById } from "./cards";
import { courseWeights, fitFor } from "./course";
import { bestItems, type StaffRole } from "./items";
import { BIKE_LENGTH, createRace, groupsOf, homeLane, kopmanOf, LANES, laneOf, riding, SAME_LANE, STEP, stepRace, uphillFinish, type Lineup, type Override, type RaceState, type Rider } from "./race";
import { clamp, hashSeed, rng } from "./rng";
import { rivalsIn } from "./teams";
import { GRID, PLAYER_TEAM, type RiderType } from "./types";
import { raceById } from "./world";

/**
 * Kopman as a board game (docs/kopman-bordspel.md). The course is cut into ten
 * sectors; per sector you play up to two cards, the rival teams show what they
 * intend, the physics of race.ts rides the sector, and a hazard may hit a kopman
 * who rides without teammates around him.
 *
 * A time trial is a board of its own: everyone rides alone, the sectors are
 * headwind, tailwind and corners, and the cards are about pacing and aero.
 */
export const BOARD_SECTORS = 10;
export const HAND_SIZE = 4;
export const PLAYS_PER_TURN = 2;
export const KRACHT_KOPMAN = 10;
export const KRACHT_KNECHT = 6;

/** The last three only occur in a time trial. */
export type Terrain = "vlak" | "klim" | "kasseien" | "afdaling" | "kopwind" | "rugwind" | "bochten";
export type BoardSector = { index: number; start: number; end: number; terrain: Terrain; name: string | null; finale: boolean; odds: Partial<Record<Hazard, number>> };

export type CardKind = "aanval" | "tempo" | "bescherming" | "verstoring" | "reactie" | "steun" | "pacing" | "aero" | "techniek" | "ploeg" | "streek";
export type BoardCardId = "demarrage" | "bergop" | "klimtempo" | "sleuren" | "kasseien" | "waaier" | "lanceren" | "wiel" | "gat" | "uitwind" | "afdalen" | "rustig" | "positie" | "vlucht" | "herstel" | "vooruit" | "scherp" | "doseren" | "volgas" | "inwind" | "rugherstel" | "aero" | "bochtstrak" | "allesgeven"
  | "inwiel" | "bevoorrading" | "bidons" | "sprinttrein"
  | "punaises" | "epo" | "plakbidon" | "verkeerdepijl" | "valsebidon";

/** A road race in three acts: the opening, the middle part and the finale. Each has its own cards. */
export type RacePhase = "opening" | "midden" | "finale";
export const PHASE_LABELS: Record<RacePhase, string> = { opening: "Opening", midden: "Middenstuk", finale: "Finale" };
/** Sectors 1 to 3 are the opening, 4 to 7 the middle part, 8 to 10 the finale. */
export const phaseOf = (index: number): RacePhase => (index < 3 ? "opening" : index < 7 ? "midden" : "finale");

/**
 * `terrain`: only there. `finale`: only in the last sector. `early`: only in
 * the first sectors, when the break goes. `phase`: only in these phases.
 * `once`: gone after playing it, it does not come back. `who`: only the kopman
 * or only a knecht can play it.
 */
type CardDef = { title: string; kind: CardKind; cost: number; text: string; terrain?: Terrain[]; finale?: boolean; early?: boolean; phase?: RacePhase[]; once?: boolean; who?: "kopman" | "knecht" };

export const BOARD_CARDS: Record<BoardCardId, CardDef> = {
  demarrage: { title: "Demarrage", kind: "aanval", cost: 3, text: "Rijdt weg uit de groep" },
  bergop: { title: "Versnellen bergop", kind: "aanval", cost: 2, terrain: ["klim"], text: "Valt aan op de klim" },
  klimtempo: { title: "Tempo op de klim", kind: "tempo", cost: 2, terrain: ["klim"], who: "knecht", text: "Knecht maakt de klim hard" },
  sleuren: { title: "Op kop sleuren", kind: "tempo", cost: 1, who: "knecht", text: "Knecht trekt de groep op tempo" },
  kasseien: { title: "Kasseien hard nemen", kind: "verstoring", cost: 2, terrain: ["kasseien"], text: "Breekt de groep op de stenen" },
  waaier: { title: "Waaier trekken", kind: "verstoring", cost: 2, terrain: ["vlak"], text: "Zijwind: wie geen dekking heeft, verliest" },
  lanceren: { title: "Lanceren", kind: "aanval", cost: 2, finale: true, text: "Vroege, harde sprint" },
  wiel: { title: "In het wiel", kind: "reactie", cost: 1, text: "Volgt een aanval van een rivaal" },
  gat: { title: "Gat dichtrijden", kind: "reactie", cost: 2, text: "Rijdt een aanval terug" },
  uitwind: { title: "Uit de wind zetten", kind: "bescherming", cost: 1, text: "Kopman +1 kracht, veilig voor wind en val" },
  afdalen: { title: "Afdalen op de limiet", kind: "aanval", cost: 1, terrain: ["afdaling"], text: "Sneller naar beneden, op eigen tempo" },
  rustig: { title: "Rustig aan", kind: "steun", cost: 0, text: "Rijdt in het wiel, +1 kracht" },
  positie: { title: "Positie vooraan", kind: "bescherming", cost: 1, text: "Ploeg veilig voor val, minder last van wind" },
  vlucht: { title: "Mee in de vlucht", kind: "aanval", cost: 2, early: true, text: "Springt naar de kopgroep" },
  herstel: { title: "Herstel", kind: "steun", cost: 0, text: "Kopman +2 kracht" },
  vooruit: { title: "Vooruitkijken", kind: "steun", cost: 0, text: "Zie verder vooruit, trek een kaart" },
  scherp: { title: "Op scherp", kind: "steun", cost: 0, text: "Je volgende kaart kost 1 minder" },
  doseren: { title: "Gedoseerd starten", kind: "pacing", cost: 0, early: true, text: "Rustiger beginnen, +1 kracht voor later" },
  volgas: { title: "Vol gas", kind: "pacing", cost: 2, text: "Harder dan je tempo, deze sector" },
  inwind: { title: "Diep in de kopwind", kind: "pacing", cost: 2, terrain: ["kopwind"], text: "Waar de meeste tijd te winnen is" },
  rugherstel: { title: "Op adem in de rugwind", kind: "pacing", cost: 0, terrain: ["rugwind"], text: "Iets terug, +1 kracht" },
  aero: { title: "Plat op de fiets", kind: "aero", cost: 1, terrain: ["kopwind", "rugwind"], text: "Minder luchtweerstand, deze sector" },
  bochtstrak: { title: "Bochten strak", kind: "techniek", cost: 1, terrain: ["bochten"], text: "Nauwelijks tijdverlies, kans op een val" },
  allesgeven: { title: "Alles geven", kind: "pacing", cost: 3, finale: true, text: "Leeg over de streep" },
  // The team's own cards: any rider can play them, at no extra.
  inwiel: { title: "In het wiel blijven", kind: "ploeg", cost: 0, phase: ["opening"], who: "kopman", text: "Kopman spaart, +1 kracht" },
  bevoorrading: { title: "Bevoorrading", kind: "ploeg", cost: 0, phase: ["midden"], once: true, text: "+2 kracht, één keer per koers" },
  bidons: { title: "Bidons halen", kind: "ploeg", cost: 1, phase: ["midden"], who: "knecht", text: "Kopman +1 kracht" },
  sprinttrein: { title: "Sprinttrein", kind: "tempo", cost: 2, finale: true, text: "Sterker met twee ploeggenoten erbij" },
  // Streken: rare, free, once. Drawn instead of a card, STREEK_ODDS of the time.
  punaises: { title: "Punaises op de weg", kind: "streek", cost: 0, once: true, text: "Lekke banden voor rivalen in je groep" },
  epo: { title: "EPO-spuit op de kamer", kind: "streek", cost: 0, once: true, text: "De sterkste rivaal moet naar de controle" },
  plakbidon: { title: "Plakbidon", kind: "streek", cost: 0, once: true, text: "Kopman hangt aan de volgwagen, +3 kracht" },
  verkeerdepijl: { title: "Verkeerde pijl", kind: "streek", cost: 0, once: true, text: "De groep voor je rijdt om" },
  valsebidon: { title: "Valse bidon", kind: "streek", cost: 0, once: true, text: "Een rivaliserende kopman −2 kracht" },
};

/** The team's own cards, in every road race. */
export const TEAM_CARDS: BoardCardId[] = ["inwiel", "bevoorrading", "bidons", "sprinttrein"];
export const STREKEN: BoardCardId[] = ["punaises", "epo", "plakbidon", "verkeerdepijl", "valsebidon"];
/** The chance that a card you draw is a streek instead: about one per ten races. */
export const STREEK_ODDS = 1 / 150;
/** Extra kracht for an attack before the finale. */
export const EARLY_ATTACK = 1;
/** After the jump an attacker holds this much over his threshold to the end of the sector. */
export const ATTACK_HOLD = 1.06;
/** Cards that give kracht back: no extra cost for another type, and the rider who rests never pays for riding alone that sector. */
export const RECOVERY_CARDS: BoardCardId[] = ["rustig", "inwiel", "bevoorrading", "herstel", "rugherstel", "doseren"];
/** Power left with no kracht at all: a road race, a time trial. */
export const FATIGUE_FLOOR = 0.85;
const TT_FATIGUE_FLOOR = 0.92;

/**
 * Three cards per rider, by type: two that suit the type, one that works almost
 * anywhere. Any rider can play them; a rider of another type pays `OFF_TYPE`
 * kracht extra.
 */
export const TYPE_CARDS: Record<RiderType, [BoardCardId, BoardCardId, BoardCardId]> = {
  klimmer: ["bergop", "klimtempo", "afdalen"],
  sprinter: ["lanceren", "wiel", "rustig"],
  klassieker: ["kasseien", "waaier", "positie"],
  tijdrijder: ["sleuren", "gat", "vlucht"],
  allrounder: ["demarrage", "uitwind", "rustig"],
};

/** The same, in a time trial. */
export const TT_CARDS: Record<RiderType, [BoardCardId, BoardCardId, BoardCardId]> = {
  tijdrijder: ["volgas", "inwind", "aero"],
  allrounder: ["volgas", "doseren", "aero"],
  klimmer: ["doseren", "rugherstel", "volgas"],
  sprinter: ["allesgeven", "rugherstel", "bochtstrak"],
  klassieker: ["bochtstrak", "inwind", "doseren"],
};
/** Air drag in a time trial sector, against the base: wind is what makes pacing matter. */
export const TT_WIND: Partial<Record<Terrain, number>> = { kopwind: 1.25, rugwind: 0.8 };
/** Metres lost in a corner sector, for an average descender; a strak corner loses a quarter of that. */
const CORNER_LOSS = 150;
const CORNER_CRASH = 0.15;
/**
 * In a time trial everyone rides a touch below his limit unless a card says
 * otherwise: riding at threshold the whole way is what the cards buy.
 */
const TT_BASE = 0.96;
/** Time trial pacing lasts until the next sector clears it. */
const TT_UNTIL = Infinity;

/** Extra kracht for a card played by a rider of another type than the one that brought it. */
export const OFF_TYPE = 1;

/** One card per staff role. The mechanic gives a spare wheel instead, the bus driver a bigger hand. */
export const STAFF_CARDS: Partial<Record<StaffRole, BoardCardId>> = { fysio: "herstel", ploegleider: "vooruit", trainer: "scherp" };
/** Sectors in which the break of the day can still be joined. */
export const EARLY_SECTORS = 4;

export type Hazard = "lek" | "val" | "wind";
export const HAZARD_LABELS: Record<Hazard, string> = { lek: "Lekke band", val: "Valpartij", wind: "Zijwind" };
export const HAZARD_ODDS: Record<Terrain, Partial<Record<Hazard, number>>> = {
  vlak: { wind: 0.25, val: 0.1, lek: 0.1 },
  klim: { lek: 0.1, val: 0.05 },
  kasseien: { lek: 0.3, val: 0.2 },
  afdaling: { val: 0.25, lek: 0.1 },
  kopwind: { lek: 0.08 },
  rugwind: { lek: 0.08 },
  bochten: { lek: 0.08 },
};
/** Wind of the day: still, a breeze, a storm. Near the coast and in the polder it blows more often. */
export type Weather = { wind: 0 | 1 | 2; rain: boolean };
export const WIND_LABELS = ["Windstil", "Wind", "Storm"] as const;
const WIND_FACTOR = [0.2, 1, 2];
const WINDY = /kust|polder|vaart|dijk|westhoek|noord/;

export function weatherFor(raceId: string, random: () => number): Weather {
  const open = WINDY.test(raceId) || raceById.get(raceId)?.country === "NED";
  const r = random();
  const wind = (open ? (r < 0.15 ? 0 : r < 0.6 ? 1 : 2) : r < 0.35 ? 0 : r < 0.85 ? 1 : 2) as Weather["wind"];
  return { wind, rain: random() < 0.3 };
}

/**
 * The odds in one sector: the terrain gives the base, the weather and the
 * phase move it, and a little chance per sector keeps two flat stretches apart.
 * Rain makes crashes and punctures likelier; the run-in to the finale is nervous.
 */
export function oddsFor(sector: BoardSector, weather: Weather, random: () => number): Partial<Record<Hazard, number>> {
  const out: Partial<Record<Hazard, number>> = {};
  const phase = phaseOf(sector.index);
  for (const [hazard, p] of Object.entries(HAZARD_ODDS[sector.terrain]) as [Hazard, number][]) {
    let f = 0.7 + random() * 0.6;
    if (hazard === "wind") f *= WIND_FACTOR[weather.wind];
    if (hazard === "val") f *= (phase === "finale" ? 1.5 : phase === "opening" ? 0.6 : 1) * (weather.rain ? 1.5 : 1);
    if (hazard === "lek") f *= weather.rain ? 1.3 : 1;
    out[hazard] = Math.round(clamp(p * f, 0, 0.6) * 100) / 100;
  }
  return out;
}

export const TERRAIN_LABELS: Record<Terrain, string> = { vlak: "Vlak", klim: "Klim", kasseien: "Kasseien", afdaling: "Afdaling", kopwind: "Kopwind", rugwind: "Rugwind", bochten: "Bochten" };

/**
 * `type`: the rider type that brought the card to the team, "ploeg" for the
 * team's own cards, null for staff and streken.
 * `rider`: who plays it. In a road race you choose him when you play the card,
 * so in the hand it is null; in a time trial it is always the kopman.
 */
export type HandCard = { uid: string; card: BoardCardId; type: RiderType | "ploeg" | null; rider: string | null };
export type Intent = { team: string; kind: "aanval" | "tempo"; rider: string; real: boolean };
export type BoardEvent = { sector: number; text: string; team: string; good: boolean };
export type Phase = "plannen" | "rijden" | "klaar";

export type BoardState = {
  race: RaceState;
  sectors: BoardSector[];
  sector: number;
  phase: Phase;
  kracht: Record<string, number>;
  start: Record<string, number>;
  deck: HandCard[];
  hand: HandCard[];
  discard: HandCard[];
  played: HandCard[];
  /** Kracht paid per played card, to give back on undo. */
  paid: Record<string, number>;
  handSize: number;
  discount: number;
  /** Sectors you can see beyond the current one. */
  lookahead: number;
  intents: Intent[];
  events: BoardEvent[];
  attacksLeft: Record<string, number>;
  /** Overrides to start once the current one ends, per rider. */
  plans: Record<string, Override[]>;
  /** Riders whose override comes from a card or an intent: cleared at the next sector. */
  touched: string[];
  forcedWind: boolean;
  immune: string[];
  /** Teams riding up front this sector: safe from crashes, one teammate less needed in the wind. */
  upFront: string[];
  /** Spare wheels from the mechanic: each one saves a puncture. */
  spares: number;
  /** Time trial: riders with a cut-down cda this sector, and riders taking the corners strak. */
  aero: string[];
  strak: string[];
  tt: boolean;
  /** The weather of the day: sets the odds of wind, crashes and punctures per sector. */
  weather: Weather;
  /** Riders who rest this sector: riding alone costs them nothing. */
  rested: string[];
  random: () => number;
};

const base = new WeakMap<Rider, { cpFlat: number; cpClimb: number; sprintW: number; vmax: number; cda: number }>();

function sectorsOf(state: RaceState): BoardSector[] {
  const course = state.course;
  const cells = course.grades.length;
  return Array.from({ length: BOARD_SECTORS }, (_, index) => {
    const start = Math.round((course.length * index) / BOARD_SECTORS / GRID) * GRID;
    const end = index === BOARD_SECTORS - 1 ? course.length : Math.round((course.length * (index + 1)) / BOARD_SECTORS / GRID) * GRID;
    const from = Math.floor(start / GRID), to = Math.min(cells, Math.ceil(end / GRID));
    let up = 0, down = 0, cobbles = 0;
    for (let i = from; i < to; i++) {
      if (course.grades[i] >= 0.03) up++;
      if (course.grades[i] <= -0.03) down++;
      if (course.surfaces[i] !== "asfalt") cobbles++;
    }
    const n = Math.max(1, to - from);
    const terrain: Terrain = cobbles / n >= 0.2 ? "kasseien" : up / n >= 0.3 ? "klim" : down / n >= 0.35 ? "afdaling" : "vlak";
    const overlap = course.features.map((f) => ({ f, len: Math.min(end, f.end) - Math.max(start, f.start) })).filter((x) => x.len > 0).sort((a, b) => b.len - a.len)[0];
    return { index, start, end, terrain, name: overlap?.f.name ?? null, finale: index === BOARD_SECTORS - 1, odds: {} };
  });
}

/**
 * A time trial out and back through the polder: wind one way on the way out and
 * the other way back, corners at the turn and in a village or two.
 */
function ttSectorsOf(state: RaceState, random: () => number): BoardSector[] {
  const out: Terrain = random() < 0.5 ? "kopwind" : "rugwind";
  const back: Terrain = out === "kopwind" ? "rugwind" : "kopwind";
  const village = 2 + Math.floor(random() * 2);
  const second = random() < 0.5 ? 7 : -1;
  return Array.from({ length: BOARD_SECTORS }, (_, index) => {
    const start = Math.round((state.course.length * index) / BOARD_SECTORS / GRID) * GRID;
    const end = index === BOARD_SECTORS - 1 ? state.course.length : Math.round((state.course.length * (index + 1)) / BOARD_SECTORS / GRID) * GRID;
    const turn = index === BOARD_SECTORS / 2;
    const corners = turn || index === village || index === second;
    const terrain: Terrain = corners ? "bochten" : index < BOARD_SECTORS / 2 ? out : back;
    return { index, start, end, terrain, name: turn ? "Keerpunt" : corners ? "Dorpskern" : null, finale: index === BOARD_SECTORS - 1, odds: {} };
  });
}

const kracht0 = (r: Rider) => (r.kopman ? KRACHT_KOPMAN : KRACHT_KNECHT) + (r.card.tier === "goud" ? 1 : r.card.tier === "brons" ? -1 : 0);

/**
 * The stack: three cards per rider and one per staff role. In a road race the
 * cards belong to the team: you choose who plays one. In a time trial you
 * steer only the kopman (`ttKopman`); the others ride their own race, and their
 * cards are what the team brings to his ride.
 */
export function deckFor(lineup: string[], items: Record<string, number>, ttKopman?: string): HandCard[] {
  const cards: HandCard[] = lineup.flatMap((id) => {
    const type = cardById(id).type;
    return (ttKopman ? TT_CARDS : TYPE_CARDS)[type].map((card, i) => ({ uid: `${card}:${id}:${i}`, card, type, rider: ttKopman ?? null }));
  });
  if (!ttKopman) for (const card of TEAM_CARDS) cards.push({ uid: `${card}:ploeg`, card, type: "ploeg", rider: null });
  const best = bestItems(items);
  for (const [role, card] of Object.entries(STAFF_CARDS) as [StaffRole, BoardCardId][]) if (best[role]) cards.push({ uid: `${card}:${role}`, card, type: null, rider: null });
  return cards;
}

function shuffle<T>(list: T[], random: () => number) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A second copy of a card in the hand adds nothing: any rider can play the first. */
const sameCard = (a: HandCard, b: HandCard) => a.card === b.card;

/**
 * Takes the first card from the stack that can be played in this sector and is
 * not already in your hand (a second copy for the same rider adds nothing);
 * reshuffles the discards when needed.
 */
function drawUsable(board: BoardState) {
  if (!board.tt && board.random() < STREEK_ODDS) {
    const options = STREKEN.map((card) => ({ uid: `${card}:${board.sector}:${board.events.length}`, card, type: null, rider: null }) as HandCard).filter((c) => !board.hand.some((h) => sameCard(h, c)) && !cardProblem(board, c));
    if (options.length) { board.hand.push(options[Math.floor(board.random() * options.length)]); return true; }
  }
  for (let pass = 0; pass < 2; pass++) {
    const i = board.deck.findIndex((c) => !cardProblem(board, c) && !board.hand.some((h) => sameCard(h, c)));
    if (i >= 0) { board.hand.push(board.deck.splice(i, 1)[0]); return true; }
    if (!board.discard.length) return false;
    board.deck.push(...shuffle(board.discard, board.random));
    board.discard = [];
  }
  return false;
}

/**
 * Builds the hand for a new sector: cards that do not fit this sector go back
 * under the stack (they come back where they do fit), one card rotates out for
 * variety, and the hand fills up with cards you can play here.
 */
function refillHand(board: BoardState, rotate: boolean) {
  const keep = board.hand.filter((c, i) => !cardProblem(board, c) && board.hand.findIndex((h) => sameCard(h, c)) === i);
  board.deck.push(...board.hand.filter((c) => !keep.includes(c)));
  board.hand = keep;
  if (rotate && board.hand.length >= board.handSize) board.deck.push(board.hand.shift()!);
  while (board.hand.length < board.handSize && drawUsable(board)) { /* fill */ }
}

export function createBoard(raceId: string, seed: number, lineup: Lineup, items: Record<string, number> = {}): BoardState {
  const race = createRace(raceId, seed, lineup);
  const tt = race.course.tt;
  race.scripted = true;
  const random = rng(hashSeed(seed, raceId, "bord"));
  const sectors = tt ? ttSectorsOf(race, rng(hashSeed(seed, raceId, "tijdrit"))) : sectorsOf(race);
  const sky = rng(hashSeed(seed, raceId, "weer"));
  const weather = weatherFor(raceId, sky);
  for (const sector of sectors) sector.odds = oddsFor(sector, weather, sky);
  const kracht: Record<string, number> = {};
  for (const r of race.riders) {
    kracht[r.id] = kracht0(r);
    base.set(r, { cpFlat: r.cpFlat, cpClimb: r.cpClimb, sprintW: r.sprintW, vmax: r.vmax, cda: r.cda });
  }
  const board: BoardState = {
    race,
    sectors,
    sector: 0,
    phase: "plannen",
    kracht,
    start: { ...kracht },
    deck: shuffle(deckFor(lineup.riders, items, tt ? lineup.kopman : undefined), random),
    hand: [],
    discard: [],
    played: [],
    paid: {},
    handSize: HAND_SIZE + (bestItems(items).chauffeur ? 1 : 0),
    discount: 0,
    lookahead: 1,
    intents: [],
    events: [],
    attacksLeft: Object.fromEntries(rivalsIn(raceId).map((t) => [t.id, 2])),
    plans: {},
    touched: [],
    forcedWind: false,
    immune: [],
    upFront: [],
    spares: bestItems(items).mechanieker ? 1 : 0,
    aero: [],
    strak: [],
    tt,
    weather,
    rested: [],
    random,
  };
  board.intents = intentsFor(board);
  refillHand(board, false);
  return board;
}

export const currentSector = (board: BoardState) => board.sectors[board.sector];
const byId = (board: BoardState, id: string) => board.race.riders.find((r) => r.id === id);

/** Where a rider is: front group, peloton or a numbered group, and seconds behind the front. In a time trial: his place. */
export function standing(state: RaceState, rider: Rider) {
  if (state.course.tt) {
    const order = [...state.riders].sort((a, b) => (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity) || b.distance - a.distance);
    const first = order[0];
    if (first.distance <= 0) return { label: "Start", gap: 0 };
    const gap = rider.finishTime !== null && first.finishTime !== null ? rider.finishTime - first.finishTime : (first.distance - rider.distance) / Math.max(5, rider.speed);
    return { label: `${order.indexOf(rider) + 1}e`, gap };
  }
  const groups = groupsOf(state);
  const biggest = groups.reduce((a, g, i) => (g.length > (groups[a]?.length ?? 0) ? i : a), 0);
  const i = groups.findIndex((g) => g.includes(rider));
  if (i < 0) return { label: "Binnen", gap: 0 };
  const label = i === 0 ? "Kop" : i === biggest && groups[i].length >= 10 ? "Peloton" : `Groep ${i + 1}`;
  return { label, gap: i === 0 ? 0 : (groups[0][0].distance - groups[i][0].distance) / Math.max(5, groups[i][0].speed) };
}

/** Teammates riding in the same group as this rider. */
export function matesOf(state: RaceState, rider: Rider) {
  const group = groupsOf(state).find((g) => g.includes(rider));
  return group ? group.filter((x) => x !== rider && x.team === rider.team) : [];
}

/** Whether you choose who plays this card: a team card in a road race. */
export const choosesRider = (board: BoardState, c: HandCard) => !board.tt && c.type !== null;

/**
 * What a card costs a rider: a gold rider pays 1 less, a rider of another type
 * than the one that brought it `OFF_TYPE` more. Without a rider: the cost for a
 * rider of its own type.
 */
export function costOf(board: BoardState, c: HandCard, rider: string | null = c.rider) {
  const card = rider ? cardById(rider) : null;
  // In a time trial the kopman plays every card the team brings, at no extra; nor does anyone a team card.
  // Resting is no skill: a recovery card costs every rider the same.
  const offType = card && choosesRider(board, c) && c.type !== "ploeg" && card.type !== c.type && !RECOVERY_CARDS.includes(c.card) ? OFF_TYPE : 0;
  // Attacking before the finale costs more: the peloton is still fresh and you ride alone longer.
  const early = !board.tt && (c.card === "demarrage" || c.card === "bergop") && phaseOf(board.sector) !== "finale" ? EARLY_ATTACK : 0;
  return Math.max(0, BOARD_CARDS[c.card].cost - (card?.tier === "goud" ? 1 : 0) + offType + early - board.discount);
}

/** Your riders who can play this card now, cheapest first, then the most kracht left. */
export function ridersFor(board: BoardState, c: HandCard): string[] {
  if (!choosesRider(board, c)) return [];
  return board.race.riders
    .filter((r) => r.team === PLAYER_TEAM && !generalProblem(board, c) && !riderProblem(board, c, r.id))
    .sort((a, b) => costOf(board, c, a.id) - costOf(board, c, b.id) || board.kracht[b.id] - board.kracht[a.id])
    .map((r) => r.id);
}

/** Why this card cannot be played now, or null. */
export function blockedReason(board: BoardState, c: HandCard): string | null {
  if (board.phase !== "plannen") return "Even wachten";
  if (!board.hand.includes(c)) return "Niet in je hand";
  if (board.played.length >= PLAYS_PER_TURN) return `Maximaal ${PLAYS_PER_TURN} per sector`;
  return cardProblem(board, c);
}

/**
 * Whether a card fits this sector at all, apart from how many you played. A
 * card you still have to give a rider fits when one of your riders can play it.
 */
function cardProblem(board: BoardState, c: HandCard): string | null {
  const general = generalProblem(board, c);
  if (general || !choosesRider(board, c)) return general ?? (c.rider ? riderProblem(board, c, c.rider) : null);
  const mine = board.race.riders.filter((r) => r.team === PLAYER_TEAM);
  const reasons = mine.map((r) => riderProblem(board, c, r.id));
  if (reasons.some((x) => x === null)) return null;
  // The reason for a rider of the card's own type says the most.
  const own = mine.findIndex((r) => r.card.type === c.type);
  return reasons[own >= 0 ? own : 0];
}

/** What keeps the card out of this sector, whoever plays it. */
function generalProblem(board: BoardState, c: HandCard): string | null {
  const def = BOARD_CARDS[c.card];
  const sector = currentSector(board);
  if (def.terrain && !def.terrain.includes(sector.terrain)) return `Alleen op ${def.terrain.map((t) => TERRAIN_LABELS[t].toLowerCase()).join(" of ")}`;
  if (def.finale && !sector.finale) return "Alleen in de finale";
  if (def.early && sector.index >= EARLY_SECTORS) return "Alleen vroeg in de koers";
  if (def.phase && !def.phase.includes(phaseOf(sector.index))) return `Alleen in ${def.phase.map((p) => PHASE_LABELS[p].toLowerCase()).join(" of ")}`;
  if (def.kind === "streek") return streekProblem(board, c.card);
  if (def.kind === "reactie" && !board.intents.some((i) => i.kind === "aanval")) return "Geen aanval aangekondigd";
  if (c.card === "herstel" || c.card === "uitwind" || c.card === "bidons" || c.card === "inwiel") {
    const kopman = kopmanOf(board.race, PLAYER_TEAM);
    if (!kopman || !riding(kopman)) return "Kopman is binnen";
    if ((c.card === "herstel" || c.card === "bidons") && board.kracht[kopman.id] >= board.start[kopman.id]) return "Kopman is nog fit";
  }
  return null;
}

/** Rival kopmen still in the race, best for this course first. */
function rivalKopmen(board: BoardState) {
  const weights = courseWeights(board.race.course);
  return board.race.riders.filter((r) => r.kopman && r.team !== PLAYER_TEAM && riding(r)).sort((a, b) => fitFor(b.card, weights) - fitFor(a.card, weights) || a.id.localeCompare(b.id));
}

/** The group right in front of your kopman, if there is one. */
function groupAhead(board: BoardState) {
  const kopman = kopmanOf(board.race, PLAYER_TEAM);
  const groups = groupsOf(board.race);
  const i = kopman ? groups.findIndex((g) => g.includes(kopman)) : -1;
  return i > 0 ? groups[i - 1] : null;
}

function streekProblem(board: BoardState, card: BoardCardId): string | null {
  const kopman = kopmanOf(board.race, PLAYER_TEAM);
  if (!kopman || !riding(kopman)) return "Kopman is binnen";
  if (card === "punaises" && !groupsOf(board.race).find((g) => g.includes(kopman))?.some((r) => r.team !== PLAYER_TEAM)) return "Geen rivalen in je groep";
  if ((card === "epo" || card === "valsebidon") && !rivalKopmen(board).length) return "Geen rivaal meer";
  if (card === "plakbidon" && board.kracht[kopman.id] >= board.start[kopman.id]) return "Kopman is nog fit";
  if (card === "verkeerdepijl" && !groupAhead(board)) return "Niemand voor je";
  return null;
}

/** Why this rider cannot play this card, or null. */
function riderProblem(board: BoardState, c: HandCard, id: string): string | null {
  const def = BOARD_CARDS[c.card];
  const r = byId(board, id);
  if (!r || r.team !== PLAYER_TEAM) return "Niet in je ploeg";
  if (!riding(r)) return "Al binnen";
  if (def.who === "kopman" && !r.kopman) return "Alleen de kopman";
  if (def.who === "knecht" && r.kopman) return "Alleen een knecht";
  if (board.kracht[id] < costOf(board, c, id)) return "Te weinig kracht";
  if (c.card === "vlucht" && groupsOf(board.race)[0]?.includes(r)) return "Zit al vooraan";
  if (def.kind === "pacing" && board.played.some((p) => p.rider === id && BOARD_CARDS[p.card].kind === "pacing")) return "Al een tempo gekozen";
  if ((c.card === "rustig" || c.card === "rugherstel" || c.card === "inwiel" || c.card === "bevoorrading") && board.kracht[id] >= board.start[id]) return "Al uitgerust";
  if (c.card === "doseren" && board.kracht[id] >= board.start[id] + 2) return "Genoeg gespaard";
  if (c.card === "uitwind") {
    if (r.kopman) return "Alleen een knecht";
    const kopman = kopmanOf(board.race, PLAYER_TEAM);
    if (!kopman || !matesOf(board.race, kopman).includes(r)) return "Niet bij de kopman";
  }
  return null;
}

/**
 * Plays a card. A team card in a road race goes to `rider`; without one, to the
 * first of `ridersFor` (the cheapest).
 */
export function playCard(board: BoardState, uid: string, rider?: string): boolean {
  const c = board.hand.find((x) => x.uid === uid);
  if (!c || blockedReason(board, c)) return false;
  if (choosesRider(board, c)) {
    const who = rider ?? ridersFor(board, c)[0];
    if (!who || riderProblem(board, c, who)) return false;
    c.rider = who;
  }
  board.paid[c.uid] = c.rider ? costOf(board, c) : 0;
  if (c.rider) board.kracht[c.rider] -= board.paid[c.uid];
  board.discount = c.card === "scherp" ? 1 : 0;
  board.hand = board.hand.filter((x) => x !== c);
  board.played.push(c);
  const kopman = kopmanOf(board.race, PLAYER_TEAM)!;
  if (c.card === "herstel") board.kracht[kopman.id] = Math.min(board.start[kopman.id], board.kracht[kopman.id] + 2);
  if (c.card === "vooruit") { board.lookahead = 2; drawUsable(board); }
  return true;
}

/** Takes a rider card back before the sector starts. Support cards act at once and stay played. */
export function unplayCard(board: BoardState, uid: string): boolean {
  const c = board.played.find((x) => x.uid === uid);
  if (!c || board.phase !== "plannen" || !c.rider) return false;
  board.discount = 0;
  board.kracht[c.rider] += board.paid[c.uid] ?? 0;
  board.played = board.played.filter((x) => x !== c);
  if (choosesRider(board, c)) c.rider = null;
  board.hand.push(c);
  return true;
}

/** What the rival teams with a kopman for this course intend in the coming sector. */
function intentsFor(board: BoardState): Intent[] {
  if (board.tt) return [];
  const state = board.race;
  const sector = currentSector(board);
  const weights = courseWeights(state.course);
  const teams = rivalsIn(board.race.raceId)
    .map((t) => ({ t, k: kopmanOf(state, t.id) }))
    .filter((x): x is { t: (typeof x)["t"]; k: Rider } => !!x.k && riding(x.k))
    .sort((a, b) => fitFor(b.k.card, weights) - fitFor(a.k.card, weights) || a.t.id.localeCompare(b.t.id))
    .slice(0, 4);
  const late = sector.index >= BOARD_SECTORS / 2 - 1;
  const out: Intent[] = [];
  for (const { t, k } of teams) {
    const roll = board.random();
    const real = board.random() >= 0.2;
    const type = k.card.type;
    let kind: Intent["kind"] | null = null;
    if (sector.terrain === "klim" && late && (type === "klimmer" || type === "allrounder") && roll < 0.6) kind = "aanval";
    else if (sector.terrain === "kasseien" && sector.index >= 3 && (type === "klassieker" || type === "allrounder") && roll < 0.6) kind = "aanval";
    else if (sector.finale && sector.terrain !== "klim" && type === "sprinter" && roll < 0.8) kind = "tempo";
    else if (sector.terrain === "vlak" && sector.index >= 6 && type === "sprinter" && roll < 0.5) kind = "tempo";
    else if (sector.finale && type !== "sprinter" && roll < 0.35) kind = "aanval";
    if (!kind) continue;
    if (kind === "aanval") {
      if (board.attacksLeft[t.id] <= 0 || board.kracht[k.id] < 2) continue;
      out.push({ team: t.id, kind, rider: k.id, real });
    } else {
      const helper = matesOf(state, k).filter((x) => board.kracht[x.id] >= 1).sort((a, b) => board.kracht[b.id] - board.kracht[a.id] || b.card.overall - a.card.overall)[0];
      if (helper) out.push({ team: t.id, kind, rider: helper.id, real });
    }
    if (out.length >= 3) break;
  }
  return out;
}

function setOverride(board: BoardState, r: Rider, o: Override, then: Override[] = []) {
  r.override = o;
  board.plans[r.id] = then;
  if (!board.touched.includes(r.id)) board.touched.push(r.id);
}

/** `positive` is from the team's side; `good` in the event is from the player's. */
function log(board: BoardState, team: string, text: string, positive: boolean) {
  board.events.push({ sector: board.sector, text, team, good: team === PLAYER_TEAM ? positive : !positive });
}

/** Tired riders lose up to 8 % power: kracht is what is left for this race. */
function applyFatigue(board: BoardState) {
  for (const r of board.race.riders) {
    const b = base.get(r);
    if (!b) continue;
    const floor = board.tt ? TT_FATIGUE_FLOOR : FATIGUE_FLOOR;
    const f = floor + (1 - floor) * clamp(board.kracht[r.id] / Math.max(1, board.start[r.id]), 0, 1);
    r.cpFlat = b.cpFlat * f;
    r.cpClimb = b.cpClimb * f;
    r.sprintW = b.sprintW * f;
    r.vmax = b.vmax;
    if (board.tt) r.cda = b.cda * (TT_WIND[currentSector(board).terrain] ?? 1) * (board.aero.includes(r.id) ? 0.92 : 1);
  }
}

/** Rival time triallists pace too: hard into the wind and in the finale, easier with the wind behind. */
function rivalPacing(board: BoardState) {
  const sector = currentSector(board);
  for (const r of board.race.riders) {
    if (r.team === PLAYER_TEAM || !riding(r)) continue;
    const k = board.kracht[r.id];
    if (sector.finale && k >= 2) { setOverride(board, r, { mode: "kop", pull: 1.08, untilDistance: TT_UNTIL }); board.kracht[r.id] -= 2; }
    else if (sector.terrain === "kopwind" && k >= board.start[r.id] / 2 && board.random() < 0.5) { setOverride(board, r, { mode: "kop", pull: 1.04, untilDistance: TT_UNTIL }); board.kracht[r.id] -= 2; }
    else if (sector.terrain === "rugwind" && k < board.start[r.id]) { setOverride(board, r, { mode: "kop", pull: 0.9, untilDistance: TT_UNTIL }); board.kracht[r.id] += 1; }
  }
}

/** Plays the cards and the intents into the physics and starts the sector. */
export function startSector(board: BoardState) {
  if (board.phase !== "plannen") return;
  const state = board.race;
  const sector = currentSector(board);
  for (const id of board.touched) { const r = byId(board, id); if (r) r.override = null; }
  board.touched = [];
  board.plans = {};
  board.forcedWind = false;
  board.immune = [];
  board.upFront = [];
  board.rested = [];
  board.aero = board.played.filter((c) => c.card === "aero" && c.rider).map((c) => c.rider!);
  board.strak = board.played.filter((c) => c.card === "bochtstrak" && c.rider).map((c) => c.rider!);
  applyFatigue(board);
  if (board.tt) rivalPacing(board);
  const t = state.time;
  const attackers: Rider[] = [];
  for (const intent of board.intents) {
    const r = byId(board, intent.rider);
    if (!r || !riding(r) || !intent.real) continue;
    if (intent.kind === "aanval") {
      setOverride(board, r, { mode: "aanval", untilTime: t + 40 }, [{ mode: "tempo", untilDistance: sector.end }]);
      board.kracht[r.id] = Math.max(0, board.kracht[r.id] - 2);
      board.attacksLeft[intent.team]--;
      attackers.push(r);
      log(board, intent.team, `${cardById(r.id).last} valt aan`, false);
    } else {
      setOverride(board, r, { mode: "kop", pull: 1.06, untilDistance: sector.end });
      board.kracht[r.id] = Math.max(0, board.kracht[r.id] - 1);
    }
  }
  const kopman = kopmanOf(state, PLAYER_TEAM)!;
  if (board.played.some((c) => c.card === "herstel")) board.rested.push(kopman.id);
  const back: HandCard[] = [];
  for (const c of board.played) {
    const r = c.rider ? byId(board, c.rider) : undefined;
    const name = r ? cardById(r.id).last : "";
    switch (c.card) {
      case "demarrage":
      case "bergop":
        if (!r) break;
        setOverride(board, r, { mode: "aanval", untilTime: t + (c.card === "bergop" ? 50 : 40) }, [{ mode: "kop", pull: ATTACK_HOLD, untilDistance: sector.end }]);
        log(board, PLAYER_TEAM, `${name} valt aan`, true);
        break;
      case "klimtempo":
      case "sleuren":
      case "kasseien":
      case "waaier":
        if (!r) break;
        setOverride(board, r, { mode: "kop", pull: c.card === "kasseien" ? 1.12 : c.card === "klimtempo" ? 1.08 : sector.finale ? 1.12 : 1.04, untilDistance: sector.end });
        if (c.card === "waaier") { board.forcedWind = true; board.immune.push(PLAYER_TEAM); }
        break;
      case "lanceren":
        if (!r) break;
        r.sprintAt = 500;
        r.sprintW *= 1.06;
        break;
      case "wiel":
      case "gat": {
        if (!r) break;
        const target = attackers.filter((a) => a.distance >= r.distance - 30 && a.distance - r.distance < 250).sort((a, b) => a.distance - b.distance)[0];
        if (!target) {
          board.kracht[r.id] += board.paid[c.uid] ?? 0;
          back.push(c);
          log(board, PLAYER_TEAM, `Geen aanval: ${BOARD_CARDS[c.card].title} terug in je hand`, true);
          break;
        }
        if (c.card === "wiel") setOverride(board, r, { mode: "volgen", target: target.id, untilTime: t + 70 });
        else setOverride(board, r, { mode: "kop", pull: 1.15, untilTime: t + 120 });
        log(board, PLAYER_TEAM, `${name} reageert op ${cardById(target.id).last}`, true);
        break;
      }
      case "afdalen":
        if (!r) break;
        r.vmax *= 1.12;
        setOverride(board, r, { mode: "tempo", untilDistance: sector.end });
        log(board, PLAYER_TEAM, `${name} daalt op de limiet`, true);
        break;
      case "rustig":
        if (!r) break;
        board.kracht[r.id] = Math.min(board.start[r.id], board.kracht[r.id] + 1);
        // In the wheel, not off the back: resting must not cost the group.
        setOverride(board, r, { mode: "mee", untilDistance: sector.end });
        board.rested.push(r.id);
        break;
      case "positie":
        board.upFront.push(PLAYER_TEAM);
        if (r) setOverride(board, r, { mode: "kop", pull: 0.95, untilDistance: sector.end });
        break;
      case "vlucht": {
        if (!r) break;
        const front = groupsOf(state)[0];
        const tail = front[front.length - 1];
        setOverride(board, r, { mode: "aanval", untilTime: t + 25 }, [{ mode: "volgen", target: tail.id, untilTime: t + 200 }]);
        log(board, PLAYER_TEAM, `${name} springt naar de kopgroep`, true);
        break;
      }
      case "doseren":
      case "rugherstel":
        if (!r) break;
        board.kracht[r.id] = Math.min(board.start[r.id] + (c.card === "doseren" ? 2 : 0), board.kracht[r.id] + 1);
        setOverride(board, r, { mode: "kop", pull: 0.9, untilDistance: TT_UNTIL });
        break;
      case "volgas":
      case "inwind":
      case "allesgeven":
        if (!r) break;
        setOverride(board, r, { mode: "kop", pull: c.card === "volgas" ? 1.04 : c.card === "inwind" ? 1.08 : 1.15, untilDistance: TT_UNTIL });
        if (c.card !== "volgas") log(board, PLAYER_TEAM, `${name} ${c.card === "inwind" ? "gaat diep in de kopwind" : "geeft alles"}`, true);
        break;
      case "aero":
        if (r) log(board, PLAYER_TEAM, `${name} zit plat op de fiets`, true);
        break;
      case "inwiel":
        if (!r) break;
        board.kracht[r.id] = Math.min(board.start[r.id], board.kracht[r.id] + 1);
        setOverride(board, r, { mode: "mee", untilDistance: sector.end });
        board.rested.push(r.id);
        log(board, PLAYER_TEAM, `${name} blijft in het wiel`, true);
        break;
      case "bevoorrading":
        if (!r) break;
        board.kracht[r.id] = Math.min(board.start[r.id], board.kracht[r.id] + 2);
        board.rested.push(r.id);
        log(board, PLAYER_TEAM, `Bevoorrading: ${name} +2 kracht`, true);
        break;
      case "bidons":
        if (!r) break;
        board.kracht[kopman.id] = Math.min(board.start[kopman.id], board.kracht[kopman.id] + 1);
        board.rested.push(kopman.id);
        log(board, PLAYER_TEAM, `${name} haalt bidons voor de kopman`, true);
        break;
      case "sprinttrein": {
        if (!r) break;
        const train = matesOf(state, r).length >= 2;
        r.sprintAt = 450;
        r.sprintW *= train ? 1.08 : 1.02;
        log(board, PLAYER_TEAM, train ? `Sprinttrein voor ${name}` : `${name} sprint zonder trein`, train);
        break;
      }
      case "punaises": {
        const group = groupsOf(state).find((g) => g.includes(kopman)) ?? [];
        const hit = group.filter((x) => x.team !== PLAYER_TEAM && board.random() < 0.35);
        for (const x of hit) x.distance -= 250;
        log(board, PLAYER_TEAM, hit.length ? `Punaises op de weg: ${hit.length} rivalen lek` : "Punaises op de weg: niemand lek", hit.length > 0);
        break;
      }
      case "epo": {
        const target = rivalKopmen(board)[0];
        if (!target) break;
        target.distance -= 60 * Math.max(5, target.speed);
        log(board, PLAYER_TEAM, `EPO op de kamer: ${cardById(target.id).last} moet naar de controle`, true);
        break;
      }
      case "plakbidon":
        board.kracht[kopman.id] = Math.min(board.start[kopman.id], board.kracht[kopman.id] + 3);
        log(board, PLAYER_TEAM, `Plakbidon: ${cardById(kopman.id).last} hangt even aan de volgwagen`, true);
        break;
      case "verkeerdepijl": {
        const ahead = groupAhead(board);
        if (!ahead) break;
        for (const x of ahead) x.distance -= 400;
        log(board, PLAYER_TEAM, `Verkeerde pijl: de groep voor ${cardById(kopman.id).last} rijdt om`, true);
        break;
      }
      case "valsebidon": {
        const group = groupsOf(state).find((g) => g.includes(kopman)) ?? [];
        const target = rivalKopmen(board).sort((a, b) => Number(group.includes(b)) - Number(group.includes(a)) || board.kracht[b.id] - board.kracht[a.id])[0];
        if (!target) break;
        board.kracht[target.id] = Math.max(0, board.kracht[target.id] - 2);
        log(board, PLAYER_TEAM, `Valse bidon: ${cardById(target.id).last} −2 kracht`, true);
        break;
      }
      case "uitwind":
        if (r) board.immune.push(PLAYER_TEAM);
        board.kracht[kopman.id] = Math.min(board.start[kopman.id], board.kracht[kopman.id] + 1);
        setOverride(board, kopman, { mode: "mee", untilDistance: sector.end });
        board.rested.push(kopman.id);
        log(board, PLAYER_TEAM, `${name} zet de kopman uit de wind`, true);
        break;
      default:
        break;
    }
  }
  if (board.tt) for (const r of state.riders) if (riding(r) && !r.override) setOverride(board, r, { mode: "kop", pull: TT_BASE, untilDistance: TT_UNTIL });
  for (const c of board.played) if (choosesRider(board, c)) c.rider = null;
  board.discard.push(...board.played.filter((c) => !back.includes(c) && !BOARD_CARDS[c.card].once));
  board.hand.push(...back);
  board.played = [];
  board.discount = 0;
  board.phase = "rijden";
}

function advance(board: BoardState, dt: number) {
  stepRace(board.race, dt);
  for (const id of Object.keys(board.plans)) {
    const r = byId(board, id);
    if (r && !r.override && board.plans[id].length) r.override = board.plans[id].shift()!;
  }
}

/**
 * Rides up to `steps` seconds of the sector. True once the sector is done.
 * In the finale it stops once when the sprint opens; called again, it rides on
 * to the line without the player.
 */
export function rideSector(board: BoardState, steps: number): boolean {
  if (board.phase !== "rijden") return true;
  const state = board.race;
  const sector = currentSector(board);
  const kopman = kopmanOf(state, PLAYER_TEAM)!;
  for (let i = 0; i < steps; i++) {
    if (state.finished) break;
    if (!sector.finale && (!riding(kopman) || kopman.distance >= sector.end)) break;
    if (sprintFits(board)) { openSprint(board); return false; }
    advance(board, STEP);
  }
  const done = state.finished || (!sector.finale && (!riding(kopman) || kopman.distance >= sector.end));
  if (done) endSector(board);
  return done;
}

function drawHazard(board: BoardState): Hazard | null {
  if (board.forcedWind) return "wind";
  const odds = currentSector(board).odds;
  let r = board.random();
  for (const [kind, p] of Object.entries(odds) as [Hazard, number][]) {
    if (r < p) return kind;
    r -= p;
  }
  return null;
}

/** A kopman knocked back: the strongest teammates around him wait and tow him back. */
function knockBack(board: BoardState, k: Rider, metres: number, mates: Rider[], waiters: number) {
  k.distance -= metres;
  const help = [...mates].sort((a, b) => board.kracht[b.id] - board.kracht[a.id]).slice(0, waiters);
  for (const m of help) {
    m.override = { mode: "wachten", target: k.id, untilTime: board.race.time + 300 };
    board.touched = board.touched.filter((id) => id !== m.id);
    delete board.plans[m.id];
    board.kracht[m.id] = Math.max(0, board.kracht[m.id] - 1);
  }
  return help.length;
}

/** Time trial: corners cost time (less for good descenders, little when taken strak), and a puncture can hit any kopman. */
function ttHazards(board: BoardState) {
  const state = board.race;
  const sector = currentSector(board);
  if (sector.terrain === "bochten") {
    for (const r of state.riders) {
      if (!riding(r)) continue;
      const strak = board.strak.includes(r.id);
      const loss = CORNER_LOSS * clamp(1.3 - r.card.stats.afdalen / 100, 0.5, 1) * (strak ? 0.25 : 1);
      r.distance -= loss;
      if (strak && board.random() < CORNER_CRASH) {
        r.distance -= 200;
        board.kracht[r.id] = Math.max(0, board.kracht[r.id] - 2);
        log(board, PLAYER_TEAM, `${cardById(r.id).last} glijdt weg in een bocht, −2 kracht`, false);
      } else if (r.team === PLAYER_TEAM && (r.kopman || strak)) {
        log(board, PLAYER_TEAM, strak ? `${cardById(r.id).last} snijdt de bochten aan` : `${cardById(r.id).last} verliest ${Math.round(loss / Math.max(5, r.speed))} s in de bochten`, strak);
      }
    }
  }
  if (board.random() >= (sector.odds.lek ?? 0)) return;
  const teams = [PLAYER_TEAM, ...rivalsIn(board.race.raceId).map((t) => t.id)];
  const team = board.random() < 0.3 ? PLAYER_TEAM : teams[1 + Math.floor(board.random() * (teams.length - 1))];
  const k = kopmanOf(state, team);
  if (!k || !riding(k)) return;
  const name = cardById(k.id).last;
  if (team === PLAYER_TEAM && board.spares > 0) {
    board.spares--;
    log(board, team, `Lekke band voor ${name}: snelle wielwissel, geen tijd verloren`, true);
  } else {
    k.distance -= 25 * Math.max(5, k.speed);
    log(board, team, `Lekke band voor ${name}: 25 s verloren`, false);
  }
}

/**
 * Riding alone costs: a rider with no teammate in his group loses 1 kracht a
 * sector, and 1 more in a small group up front, in the wind. The break of the
 * day rides on its own budget.
 */
function soloCost(board: BoardState) {
  const state = board.race;
  const groups = groupsOf(state);
  for (const r of state.riders) {
    if (!riding(r) || r.breakaway || board.rested.includes(r.id) || matesOf(state, r).length) continue;
    const wind = groups[0]?.includes(r) && groups[0].length <= 3 ? 1 : 0;
    const before = board.kracht[r.id];
    board.kracht[r.id] = Math.max(0, before - 1 - wind);
    if (r.team === PLAYER_TEAM && r.kopman && before > board.kracht[r.id]) log(board, PLAYER_TEAM, `${cardById(r.id).last} rijdt alleen${wind ? " in de wind" : ""}, −${before - board.kracht[r.id]} kracht`, false);
  }
}

function endSector(board: BoardState) {
  const state = board.race;
  const sector = currentSector(board);
  if (!board.tt && !state.finished && !sector.finale) soloCost(board);
  if (board.tt && !state.finished && !sector.finale) ttHazards(board);
  else if (!state.finished && !sector.finale) {
    const hazard = drawHazard(board);
    const before = board.events.length;
    if (hazard) {
      const teams = [PLAYER_TEAM, ...rivalsIn(board.race.raceId).map((t) => t.id)];
      const victims = hazard === "lek" ? [board.random() < 0.3 ? PLAYER_TEAM : teams[1 + Math.floor(board.random() * (teams.length - 1))]] : teams;
      const peloton = groupsOf(state).reduce((a, g) => (g.length > a.length ? g : a), [] as Rider[]);
      for (const team of victims) {
        const k = kopmanOf(state, team);
        if (!k || !riding(k)) continue;
        const mates = matesOf(state, k);
        const name = cardById(k.id).last;
        if (hazard === "lek") {
          if (team === PLAYER_TEAM && board.spares > 0) {
            board.spares--;
            log(board, team, `Lekke band voor ${name}: snelle wielwissel, geen tijd verloren`, true);
          } else {
            const waited = knockBack(board, k, 250, mates, 2);
            log(board, team, waited ? `Lekke band voor ${name}: ${waited} knecht${waited > 1 ? "en" : ""} wacht${waited > 1 ? "en" : ""}` : `Lekke band voor ${name}, zonder dekking`, waited > 0);
          }
        } else if (hazard === "val") {
          if (!peloton.includes(k) || board.immune.includes(team) || board.upFront.includes(team)) continue;
          if (mates.length >= 2) {
            board.kracht[mates[0].id] = Math.max(0, board.kracht[mates[0].id] - 1);
            if (team === PLAYER_TEAM) log(board, team, `Valpartij: de knechten houden ${name} overeind`, true);
          } else {
            board.kracht[k.id] = Math.max(0, board.kracht[k.id] - 2);
            knockBack(board, k, 120, mates, 1);
            log(board, team, `Valpartij: ${name} ligt, −2 kracht`, false);
          }
        } else {
          if (board.immune.includes(team)) continue;
          // In a crosswind someone pulled on purpose you need two teammates around you.
          if (mates.length >= (board.forcedWind ? 2 : 1) - (board.upFront.includes(team) ? 1 : 0)) {
            if (mates[0]) board.kracht[mates[0].id] = Math.max(0, board.kracht[mates[0].id] - 1);
            if (team === PLAYER_TEAM) log(board, team, mates[0] ? `Zijwind: een knecht houdt ${name} uit de wind` : `Zijwind: ${name} zit vooraan, geen schade`, true);
          } else {
            board.kracht[k.id] = Math.max(0, board.kracht[k.id] - 1);
            k.distance -= 200;
            log(board, team, `Zijwind: ${name} zit achter de waaier, −1 kracht`, false);
          }
        }
      }
      if (board.forcedWind) {
        const hit = board.events.slice(before).filter((e) => e.team !== PLAYER_TEAM).length;
        log(board, PLAYER_TEAM, hit ? `Waaier: ${hit} kopm${hit > 1 ? "annen" : "an"} achter de waaier` : "Waaier: iedereen blijft mee", hit > 0);
      }
    }
  }
  const k = kopmanOf(state, PLAYER_TEAM);
  if (k && riding(k) && !sector.finale) {
    const where = standing(state, k);
    if (board.tt) log(board, PLAYER_TEAM, `${cardById(k.id).last} staat ${where.label}${where.gap >= 1 ? `, ${Math.round(where.gap)} s achter` : ""}`, parseInt(where.label, 10) <= 10);
    else log(board, PLAYER_TEAM, `${cardById(k.id).last} ${where.label === "Kop" ? "zit vooraan" : `zit in ${where.label === "Peloton" ? "het peloton" : where.label.toLowerCase()}`}${where.gap >= 5 ? `, ${Math.round(where.gap)} s achter de kop` : ""}`, where.gap < 20);
  }
  if (state.finished || sector.finale) {
    if (!state.finished) while (!state.finished) stepRace(state);
    board.phase = "klaar";
    return;
  }
  board.sector++;
  board.lookahead = 1;
  board.intents = intentsFor(board);
  refillHand(board, true);
  board.phase = "plannen";
}

/** The last kilometre by hand: from here you steer the kopman across the road and choose when he goes. */
export const SPRINT_FROM = 1000;
/** Race seconds per step in the sprint. */
export const SPRINT_DT = 0.05;
/** Speed lost by moving one lane across, m/s. */
const LANE_COST = 0.3;

/** On a flat finish, with the kopman in a group of three or more. Not in a time trial. */
function sprintFits(board: BoardState) {
  const state = board.race;
  if (board.tt || state.sprint || !currentSector(board).finale || uphillFinish(state.course)) return false;
  const k = kopmanOf(state, PLAYER_TEAM);
  if (!k || !riding(k)) return false;
  const left = state.course.length - k.distance;
  if (left > SPRINT_FROM || left < 250) return false;
  return (groupsOf(state).find((g) => g.includes(k))?.length ?? 0) >= 3;
}

function openSprint(board: BoardState) {
  const k = kopmanOf(board.race, PLAYER_TEAM)!;
  const home = homeLane(k.id);
  board.race.sprint = { id: k.id, home, lane: LANES[home], target: home, active: false, launched: false, boxed: false };
}

/** The sprint is open and the kopman is still on his way to the line. */
export function sprinting(board: BoardState) {
  const k = kopmanOf(board.race, PLAYER_TEAM);
  return board.phase === "rijden" && !!board.race.sprint && !!k && riding(k);
}

/** Race seconds per real second: slow in the run-in, slower still in the last 400 m. */
export function sprintRate(board: BoardState) {
  const k = kopmanOf(board.race, PLAYER_TEAM)!;
  return board.race.course.length - k.distance > 400 ? 4 : 1.6;
}

/** One lane left (−1) or right (+1). False when there is no room: a rider right beside you. */
export function steer(board: BoardState, dir: -1 | 1): boolean {
  const state = board.race;
  const s = state.sprint;
  const k = kopmanOf(state, PLAYER_TEAM);
  if (!s || !k || !sprinting(board)) return false;
  const next = s.target + dir;
  if (next < 0 || next >= LANES.length) return false;
  const beside = state.riders.some((r) => r !== k && riding(r) && Math.abs(laneOf(state, r) - LANES[next]) < SAME_LANE && Math.abs(r.distance - k.distance) < BIKE_LENGTH * 0.8);
  if (beside) return false;
  s.active = true;
  s.target = next;
  k.speed = Math.max(1, k.speed - LANE_COST);
  return true;
}

/** The kopman goes now, whatever the distance. Once. Going counts as steering: from here a wheel in your line can shut you in. */
export function launch(board: BoardState): boolean {
  const s = board.race.sprint;
  const k = kopmanOf(board.race, PLAYER_TEAM);
  if (!s || !k || !sprinting(board) || s.launched || k.mode === "sprint") return false;
  s.launched = true;
  s.active = true;
  k.override = null;
  delete board.plans[k.id];
  k.mode = "sprint";
  k.modeUntil = 0;
  k.target = null;
  return true;
}

/** One small step of the sprint. True once the kopman is over the line or out of the race. */
export function rideSprint(board: BoardState, dt = SPRINT_DT): boolean {
  if (!sprinting(board)) return true;
  advance(board, dt);
  return !sprinting(board);
}

/** Plays a whole board with a simple policy: for tests and balance runs. */
export function autoplay(board: BoardState, policy: (board: BoardState) => string[] = () => []) {
  while (board.phase !== "klaar") {
    for (const uid of policy(board)) playCard(board, uid);
    startSector(board);
    while (!rideSector(board, 600)) { /* ride on */ }
  }
  return board;
}
