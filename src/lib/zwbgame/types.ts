export const GAME_VERSION = 4;
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
};
export type GameMode = "ladder" | "free";
export type TeamSide = "own" | "rival";
export type RaceConfig = {
  mode: GameMode;
  routeId: string;
  seed: number;
  playerId: string;
  /** Ladder: the five riders per side and the team you challenged. */
  teams?: { own: string[]; rival: string[]; rivalTeamId: string };
};
/** wheel: follow what is ahead; front: ride in the wind; attack: go clear or sprint. */
export type Tactic = "wheel" | "front" | "attack";
/** save and ride both follow the wheel; save never goes above threshold, ride follows any surge. */
export type Mode = "save" | "ride" | "front" | "attack";
export type PowerupId = "feather" | "aero" | "draft";
/** Team orders from the player to the teammates. */
export type TeamOrder = "free" | "bring" | "leadout";
export type PlayerCommand =
  | { type: "mode"; value: Mode; targetId?: string }
  | { type: "powerup" }
  | { type: "order"; value: TeamOrder };
export type RiderState = {
  rider: GameRider;
  team: TeamSide | null;
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
  /** Seeded day form, multiplies ability. */
  form: number;
  /** Set on a teammate working for someone: bring back or lead out. */
  job: { for: string; kind: "bring" | "leadout" } | null;
};
export type RaceState = {
  version: number;
  config: RaceConfig;
  route: GameRoute;
  tick: number;
  riders: RiderState[];
  order: TeamOrder;
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
  /** Ladder: own and rival team points. */
  score?: [number, number];
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
};
