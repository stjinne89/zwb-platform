import type { Surface } from "@/lib/zwift/surfaces/crr";

export const GAME_VERSION = 7;
export const CONSENT_VERSION = "2026-09-17";
export type RiderKind = "sprinter" | "puncher" | "tter" | "climber" | "allrounder";
export type GameRider = {
  id: string;
  name: string;
  kind: RiderKind;
  // Dimensionless game coefficients; never raw power, weight or wellness.
  flat: number;
  climb: number;
  sprint: number;
  source: "basic" | "platform" | "manual" | "intervals";
  revision: string;
  garmin: boolean;
};
/** A named Zwift segment on the route. Only banners (named in Zwift) hand out powerups. */
export type GameAccent = { name: string; kind: "climb" | "sprint"; start: number; end: number; banner: boolean };
/** A stretch off the tarmac (dirt, gravel, cobbles…), in metres, with its Zwift surface. */
export type RoughSection = { start: number; end: number; surface: Surface };
/** A real Zwift route, rolled out over lead-in and laps, on a 100 m grid. */
export type GameRoute = {
  id: string;
  name: string;
  world: string;
  laps: number;
  /** Metres, lead-in included. */
  length: number;
  /** Gradient per 100 m, rise/run. */
  grades: number[];
  accents: GameAccent[];
  /** Where a lap ends before the finish, in metres. */
  lapLines: number[];
  /** Where the road is not tarmac; missing means tarmac all the way. */
  rough?: RoughSection[];
};
export type GameMode = "ladder" | "free" | "zrl" | "frr";
/** An FRR tour stage: a road stage, or an individual time trial (mass start, no drafting, as on Zwift). */
export type FrrStageKind = "road" | "itt";
/** WTRL ZRL formats; Race of Truth is a points race without drafting. */
export type ZrlFormat = "points" | "rot" | "scratch" | "ttt";
/** Your team always has this id. */
export const OWN_TEAM = "own";
/** A team in the race: your team first, with id "own". */
export type Squad = { id: string; riders: string[] };
/** A practice race: one short course, one tactic, one goal. */
export type DrillId = "selection" | "crest" | "slingshot" | "bridge" | "escape" | "points" | "ttt";
export type RaceConfig = {
  mode: GameMode;
  format?: ZrlFormat;
  routeId: string;
  seed: number;
  playerId: string;
  /** Ladder and ZRL: the teams, yours first. The ladder has one opponent. */
  squads?: Squad[];
  /** FRR: the tour field (the same riders every stage) and this stage. */
  field?: string[];
  stage?: { index: number; kind: FrrStageKind };
  /** A practice race; never saved or resumed. */
  drill?: DrillId;
};
/** A rider through a named segment: start and end in race seconds. */
export type SegmentPass = { r: number; a: number; s: number; e: number | null };
/** wheel: follow what is ahead; front: ride in the wind; attack: go clear or sprint. */
export type Tactic = "wheel" | "front" | "attack";
/** save and ride both follow the wheel; save never goes above threshold, ride follows the tempo but not an attack. */
export type Mode = "save" | "ride" | "front" | "attack";
export type PowerupId = "feather" | "aero" | "draft" | "burrito" | "ghost" | "anvil" | "steamroller";
/**
 * Team orders from the player to the teammates. In a road race: ride free, bring
 * me back, lead me out, hunt the points, make it hard, don't chase (sit on), go
 * with rival moves, and a one-two after your attack. In a team time trial: short
 * or long turns, or wait for the fourth rider.
 */
export type TeamOrder = "free" | "bring" | "leadout" | "points" | "hard" | "sit" | "cover" | "onetwo" | "short" | "long" | "four";
/** A teammate's job: tow you back, lead you out, hunt points, ride tempo, sit on, cover moves, or counter-attack. */
export type JobKind = "bring" | "leadout" | "points" | "tempo" | "block" | "cover" | "counter";
export type PlayerCommand =
  | { type: "mode"; value: Mode; targetId?: string }
  | { type: "powerup" }
  | { type: "order"; value: TeamOrder }
  /** Time trial pace in steps of 3 % around 97 % of threshold, −2 to +2. */
  | { type: "tempo"; value: number };
export type RiderState = {
  rider: GameRider;
  /** Team id: "own" for yours, otherwise the opponent's id. */
  team: string | null;
  distance: number;
  speed: number;
  lane: number;
  mode: Mode;
  targetId: string | null;
  /** Power as a share of the rider's threshold, the last step. */
  effort: number;
  /** W′ balance, joules. */
  wbal: number;
  wprime: number;
  /** Strain so far in joules: W′ drawn plus long work above endurance pace. Tires the rider. */
  spent: number;
  sheltered: boolean;
  tucked: boolean;
  powerup: PowerupId | null;
  active: { id: PowerupId; left: number } | null;
  finishTime: number | null;
  attacks: number;
  shelteredSeconds: number;
  /** Seconds this rider has been riding hard out of the draft: an attack others can see. */
  surge: number;
  /** Seeded day form, multiplies ability. */
  form: number;
  /** Set on a teammate working for someone: bring back, lead out, or hunt segment points. */
  job: { for: string; kind: JobKind } | null;
  /** Time trial pace step, −2 to +2 (only you set it). */
  tempo: number;
};
/** One kilometre of your race, for the debrief: race time at its end, seconds out of the draft, W′ at its end (share), your group (0 = the front) and its size, and your gap to the front in seconds. */
export type KmLog = { t: number; wind: number; wbal: number; group: number; size: number; gap: number };
/** What you did and what happened to you, by distance. */
export type RaceEvent = { d: number; kind: "attack" | "empty" | "powerup" | "dropped" | "back"; powerup?: PowerupId };
/** Your race as you rode it: only numbers and distances, for the debrief after the finish. */
export type RaceLog = { km: KmLog[]; events: RaceEvent[]; wind: number; group: number };
export type RaceState = {
  version: number;
  config: RaceConfig;
  route: GameRoute;
  tick: number;
  riders: RiderState[];
  order: TeamOrder;
  /** Named segments ridden, for ZRL points (FAL and FTS). */
  passes: SegmentPass[];
  log: RaceLog;
  finished: boolean;
};
export type RaceResult = {
  id: string;
  mode: GameMode;
  route: string;
  date: string;
  place: number;
  count: number;
  seconds: number;
  /** Ladder: own and rival team points. ZRL: your team's points and the winner's. */
  score?: [number, number];
  format?: ZrlFormat;
  /** ZRL: your team's place and the number of teams. */
  teamRank?: [number, number];
  /** FRR: stage number and number of stages. */
  stage?: [number, number];
};
/** ownProfile: an own measurement or Intervals game profile overrides the platform data. */
export type GamePreferences = { visible: boolean; ownProfile: boolean };
export type GameBootstrap = {
  playerId: string;
  roster: GameRider[];
  preferences: GamePreferences;
  available: boolean;
  routes: GameRoute[];
  /** Your ZWB Club Ladder team, when you ride in one. */
  team: { name: string; memberIds: string[] } | null;
  /** Your ZWB ZRL team, when you ride in one. */
  zrlTeam: { name: string; memberIds: string[] } | null;
  /** The next ZWB ZRL race in the club calendar with a route, to practise. */
  zrlRace: { route: GameRoute; title: string; date: string; format: ZrlFormat | null } | null;
};
