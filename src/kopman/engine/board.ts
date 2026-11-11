import { cardById } from "./cards";
import { courseWeights, fitFor } from "./course";
import { bestItems, type StaffRole } from "./items";
import { createRace, groupsOf, kopmanOf, riding, stepRace, type Lineup, type Override, type RaceState, type Rider } from "./race";
import { clamp, hashSeed, rng } from "./rng";
import { rivalTeams } from "./teams";
import { GRID, PLAYER_TEAM, type RiderType } from "./types";

/**
 * Kopman as a board game (docs/kopman-bordspel.md). The course is cut into ten
 * sectors; per sector you play up to two cards, the rival teams show what they
 * intend, the physics of race.ts rides the sector, and a hazard may hit a kopman
 * who rides without teammates around him.
 */
export const BOARD_SECTORS = 10;
export const HAND_SIZE = 4;
export const PLAYS_PER_TURN = 2;
export const KRACHT_KOPMAN = 10;
export const KRACHT_KNECHT = 6;

export type Terrain = "vlak" | "klim" | "kasseien" | "afdaling";
export type BoardSector = { index: number; start: number; end: number; terrain: Terrain; name: string | null; finale: boolean };

export type CardKind = "aanval" | "tempo" | "bescherming" | "verstoring" | "reactie" | "steun";
export type BoardCardId = "demarrage" | "bergop" | "klimtempo" | "sleuren" | "kasseien" | "waaier" | "lanceren" | "wiel" | "gat" | "uitwind" | "afdalen" | "rustig" | "positie" | "vlucht" | "herstel" | "vooruit" | "scherp";
/** `terrain`: only there. `early`: only in the first sectors, when the break goes. */
type CardDef = { title: string; kind: CardKind; cost: number; text: string; terrain?: Terrain[]; finale?: boolean; early?: boolean };

export const BOARD_CARDS: Record<BoardCardId, CardDef> = {
  demarrage: { title: "Demarrage", kind: "aanval", cost: 3, text: "Rijdt weg uit de groep" },
  bergop: { title: "Versnellen bergop", kind: "aanval", cost: 2, terrain: ["klim"], text: "Valt aan op de klim" },
  klimtempo: { title: "Tempo op de klim", kind: "tempo", cost: 2, terrain: ["klim"], text: "Hard tempo bergop" },
  sleuren: { title: "Op kop sleuren", kind: "tempo", cost: 1, text: "Trekt de groep op tempo" },
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
};

/** Three cards per rider, by type: two that suit the type, one that works almost anywhere. */
export const TYPE_CARDS: Record<RiderType, [BoardCardId, BoardCardId, BoardCardId]> = {
  klimmer: ["bergop", "klimtempo", "afdalen"],
  sprinter: ["lanceren", "wiel", "rustig"],
  klassieker: ["kasseien", "waaier", "positie"],
  tijdrijder: ["sleuren", "gat", "vlucht"],
  allrounder: ["demarrage", "uitwind", "rustig"],
};

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
};
export const TERRAIN_LABELS: Record<Terrain, string> = { vlak: "Vlak", klim: "Klim", kasseien: "Kasseien", afdaling: "Afdaling" };

export type HandCard = { uid: string; card: BoardCardId; rider: string | null };
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
  random: () => number;
};

const base = new WeakMap<Rider, { cpFlat: number; cpClimb: number; sprintW: number; vmax: number }>();

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
    return { index, start, end, terrain, name: overlap?.f.name ?? null, finale: index === BOARD_SECTORS - 1 };
  });
}

const kracht0 = (r: Rider) => (r.kopman ? KRACHT_KOPMAN : KRACHT_KNECHT) + (r.card.tier === "goud" ? 1 : r.card.tier === "brons" ? -1 : 0);

export function deckFor(lineup: string[], items: Record<string, number>): HandCard[] {
  const cards: HandCard[] = lineup.flatMap((id) => TYPE_CARDS[cardById(id).type].map((card, i) => ({ uid: `${card}:${id}:${i}`, card, rider: id })));
  const best = bestItems(items);
  for (const [role, card] of Object.entries(STAFF_CARDS) as [StaffRole, BoardCardId][]) if (best[role]) cards.push({ uid: `${card}:${role}`, card, rider: null });
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

/** Takes the first card from the stack that can be played in this sector; reshuffles the discards when needed. */
function drawUsable(board: BoardState) {
  for (let pass = 0; pass < 2; pass++) {
    const i = board.deck.findIndex((c) => !cardProblem(board, c));
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
  const keep = board.hand.filter((c) => !cardProblem(board, c));
  board.deck.push(...board.hand.filter((c) => !keep.includes(c)));
  board.hand = keep;
  if (rotate && board.hand.length >= board.handSize) board.deck.push(board.hand.shift()!);
  while (board.hand.length < board.handSize && drawUsable(board)) { /* fill */ }
}

export function createBoard(raceId: string, seed: number, lineup: Lineup, items: Record<string, number> = {}): BoardState {
  const race = createRace(raceId, seed, lineup);
  if (race.course.tt) throw new Error("Een tijdrit speel je niet als bordspel");
  race.scripted = true;
  const random = rng(hashSeed(seed, raceId, "bord"));
  const kracht: Record<string, number> = {};
  for (const r of race.riders) {
    kracht[r.id] = kracht0(r);
    base.set(r, { cpFlat: r.cpFlat, cpClimb: r.cpClimb, sprintW: r.sprintW, vmax: r.vmax });
  }
  const board: BoardState = {
    race,
    sectors: sectorsOf(race),
    sector: 0,
    phase: "plannen",
    kracht,
    start: { ...kracht },
    deck: shuffle(deckFor(lineup.riders, items), random),
    hand: [],
    discard: [],
    played: [],
    paid: {},
    handSize: HAND_SIZE + (bestItems(items).chauffeur ? 1 : 0),
    discount: 0,
    lookahead: 1,
    intents: [],
    events: [],
    attacksLeft: Object.fromEntries(rivalTeams().map((t) => [t.id, 2])),
    plans: {},
    touched: [],
    forcedWind: false,
    immune: [],
    upFront: [],
    spares: bestItems(items).mechanieker ? 1 : 0,
    random,
  };
  board.intents = intentsFor(board);
  refillHand(board, false);
  return board;
}

export const currentSector = (board: BoardState) => board.sectors[board.sector];
const byId = (board: BoardState, id: string) => board.race.riders.find((r) => r.id === id);

/** Where a rider is: front group, peloton or a numbered group, and seconds behind the front. */
export function standing(state: RaceState, rider: Rider) {
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

export const costOf = (board: BoardState, c: HandCard) => Math.max(0, BOARD_CARDS[c.card].cost - (c.rider && cardById(c.rider).tier === "goud" ? 1 : 0) - board.discount);

/** Why this card cannot be played now, or null. */
export function blockedReason(board: BoardState, c: HandCard): string | null {
  if (board.phase !== "plannen") return "Even wachten";
  if (!board.hand.includes(c)) return "Niet in je hand";
  if (board.played.length >= PLAYS_PER_TURN) return `Maximaal ${PLAYS_PER_TURN} per sector`;
  return cardProblem(board, c);
}

/** Whether a card fits this sector at all, apart from how many you played. */
function cardProblem(board: BoardState, c: HandCard): string | null {
  const def = BOARD_CARDS[c.card];
  const sector = currentSector(board);
  if (def.terrain && !def.terrain.includes(sector.terrain)) return `Alleen op ${def.terrain.map((t) => TERRAIN_LABELS[t].toLowerCase()).join(" of ")}`;
  if (def.finale && !sector.finale) return "Alleen in de finale";
  if (def.early && sector.index >= EARLY_SECTORS) return "Alleen vroeg in de koers";
  if (def.kind === "reactie" && !board.intents.some((i) => i.kind === "aanval")) return "Geen aanval aangekondigd";
  if (c.rider) {
    const r = byId(board, c.rider);
    if (!r || !riding(r)) return "Al binnen";
    if (board.kracht[c.rider] < costOf(board, c)) return "Te weinig kracht";
    if (c.card === "vlucht" && groupsOf(board.race)[0]?.includes(r)) return "Zit al vooraan";
    if (c.card === "rustig" && board.kracht[c.rider] >= board.start[c.rider]) return "Al uitgerust";
    if (c.card === "uitwind") {
      if (r.kopman) return "Alleen een knecht";
      const kopman = kopmanOf(board.race, PLAYER_TEAM);
      if (!kopman || !matesOf(board.race, kopman).includes(r)) return "Niet bij de kopman";
    }
  }
  if (c.card === "herstel" || c.card === "uitwind") {
    const kopman = kopmanOf(board.race, PLAYER_TEAM);
    if (!kopman || !riding(kopman)) return "Kopman is binnen";
    if (c.card === "herstel" && board.kracht[kopman.id] >= board.start[kopman.id]) return "Kopman is nog fit";
  }
  return null;
}

export function playCard(board: BoardState, uid: string): boolean {
  const c = board.hand.find((x) => x.uid === uid);
  if (!c || blockedReason(board, c)) return false;
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
  board.hand.push(c);
  return true;
}

/** What the rival teams with a kopman for this course intend in the coming sector. */
function intentsFor(board: BoardState): Intent[] {
  const state = board.race;
  const sector = currentSector(board);
  const weights = courseWeights(state.course);
  const teams = rivalTeams()
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
    const f = 0.92 + 0.08 * clamp(board.kracht[r.id] / Math.max(1, board.start[r.id]), 0, 1);
    r.cpFlat = b.cpFlat * f;
    r.cpClimb = b.cpClimb * f;
    r.sprintW = b.sprintW * f;
    r.vmax = b.vmax;
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
  applyFatigue(board);
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
  const back: HandCard[] = [];
  for (const c of board.played) {
    const r = c.rider ? byId(board, c.rider) : undefined;
    const name = r ? cardById(r.id).last : "";
    switch (c.card) {
      case "demarrage":
      case "bergop":
        if (!r) break;
        setOverride(board, r, { mode: "aanval", untilTime: t + (c.card === "bergop" ? 50 : 40) }, [{ mode: "tempo", untilDistance: sector.end }]);
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
        setOverride(board, r, { mode: "sparen", untilDistance: sector.end });
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
      case "uitwind":
        if (r) board.immune.push(PLAYER_TEAM);
        board.kracht[kopman.id] = Math.min(board.start[kopman.id], board.kracht[kopman.id] + 1);
        setOverride(board, kopman, { mode: "sparen", untilDistance: sector.end });
        log(board, PLAYER_TEAM, `${name} zet de kopman uit de wind`, true);
        break;
      default:
        break;
    }
  }
  board.discard.push(...board.played.filter((c) => !back.includes(c)));
  board.hand.push(...back);
  board.played = [];
  board.discount = 0;
  board.phase = "rijden";
}

/** Rides up to `steps` seconds of the sector. True once the sector is done. */
export function rideSector(board: BoardState, steps: number): boolean {
  if (board.phase !== "rijden") return true;
  const state = board.race;
  const sector = currentSector(board);
  const kopman = kopmanOf(state, PLAYER_TEAM)!;
  for (let i = 0; i < steps; i++) {
    if (state.finished) break;
    if (!sector.finale && (!riding(kopman) || kopman.distance >= sector.end)) break;
    stepRace(state);
    for (const id of Object.keys(board.plans)) {
      const r = byId(board, id);
      if (r && !r.override && board.plans[id].length) r.override = board.plans[id].shift()!;
    }
  }
  const done = state.finished || (!sector.finale && (!riding(kopman) || kopman.distance >= sector.end));
  if (done) endSector(board);
  return done;
}

function drawHazard(board: BoardState): Hazard | null {
  if (board.forcedWind) return "wind";
  const odds = HAZARD_ODDS[currentSector(board).terrain];
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

function endSector(board: BoardState) {
  const state = board.race;
  const sector = currentSector(board);
  if (!state.finished && !sector.finale) {
    const hazard = drawHazard(board);
    const before = board.events.length;
    if (hazard) {
      const teams = [PLAYER_TEAM, ...rivalTeams().map((t) => t.id)];
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
    log(board, PLAYER_TEAM, `${cardById(k.id).last} ${where.label === "Kop" ? "zit vooraan" : `zit in ${where.label === "Peloton" ? "het peloton" : where.label.toLowerCase()}`}${where.gap >= 5 ? `, ${Math.round(where.gap)} s achter de kop` : ""}`, where.gap < 20);
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

/** Plays a whole board with a simple policy: for tests and balance runs. */
export function autoplay(board: BoardState, policy: (board: BoardState) => string[] = () => []) {
  while (board.phase !== "klaar") {
    for (const uid of policy(board)) playCard(board, uid);
    startSector(board);
    while (!rideSector(board, 600)) { /* ride on */ }
  }
  return board;
}
