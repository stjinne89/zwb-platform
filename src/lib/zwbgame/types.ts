export const GAME_VERSION = 1;
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
  source: "basic" | "manual" | "intervals";
  revision: string;
  garmin: boolean;
};
export type CourseId = "polder" | "ardennen" | "alpen";
export type Course = {
  id: CourseId;
  name: string;
  subtitle: string;
  color: string;
  segments: { end: number; grade: number; wind: number }[];
  length: number;
};
export type RaceConfig = { courseId: CourseId; seed: number; playerId: string };
export type Tactic = "wheel" | "front" | "pull" | "attack";
export type PlayerCommand =
  | { type: "effort"; value: number }
  | { type: "tactic"; value: Tactic; targetId?: string }
  | { type: "eat" | "drink" };
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
export type GamePreferences = { visible: boolean; dataConsent: boolean };
export type GameBootstrap = {
  playerId: string;
  roster: GameRider[];
  preferences: GamePreferences;
  available: boolean;
};
