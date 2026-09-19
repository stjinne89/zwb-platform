export const GAME_VERSION = 3;
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
export type CourseId = "polder" | "ardennen" | "heuvelrug" | "alpen";
export type Course = {
  id: CourseId;
  name: string;
  subtitle: string;
  color: string;
  icon: "wind" | "hills" | "mountain";
  /** One letter per 250 m tile; see courses.ts. */
  tiles: string;
  segments: { end: number; grade: number; wind: number }[];
  length: number;
  feedAt: number;
};
export type RaceConfig = { courseId: CourseId; seed: number; playerId: string };
export type Tactic = "wheel" | "front" | "pull" | "attack";
export type CardId = "tailwind" | "legs" | "second" | "surprise";
export type PlayerCommand =
  | { type: "effort"; value: number }
  | { type: "tactic"; value: Tactic; targetId?: string }
  | { type: "eat" | "drink" }
  | { type: "card"; card: CardId };
export type RiderState = {
  rider: GameRider;
  distance: number;
  speed: number;
  lane: number;
  energy: number;
  maxEnergy: number;
  reserve: number;
  hydration: number;
  recovery: number;
  effort: number;
  tactic: Tactic;
  targetId: string | null;
  gels: number;
  bottles: number;
  fed: boolean;
  eating: number;
  drinking: number;
  digesting: number;
  sheltered: boolean;
  finishTime: number | null;
  attacks: number;
  shelteredSeconds: number;
  /** Seeded day form, multiplies ability. Hidden luck, not part of compensation. */
  form: number;
  cards: CardId[];
  boost: { card: CardId; left: number } | null;
  /** Set on a helper: the weaker rider this bot rides for. */
  captainId: string | null;
};
export type RaceState = {
  version: number;
  config: RaceConfig;
  tick: number;
  riders: RiderState[];
  finished: boolean;
};
export type RaceResult = {
  id: string;
  courseId: CourseId;
  date: string;
  place: number;
  count: number;
  seconds: number;
};
/** ownProfile: an own measurement or Intervals game profile overrides the platform data. */
export type GamePreferences = { visible: boolean; ownProfile: boolean };
export type GameBootstrap = {
  playerId: string;
  roster: GameRider[];
  preferences: GamePreferences;
  available: boolean;
};
