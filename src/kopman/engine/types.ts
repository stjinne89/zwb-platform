// Kopman: a cycling manager game. This folder is self-contained on purpose:
// nothing under src/kopman imports from the rest of the platform, so the game can
// leave ZWB as a standalone app later (tests/unit/kopman-isolation.test.ts).

export const STAT_KEYS = ["vlak", "klim", "sprint", "tijdrit", "kasseien", "afdalen"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export const RIDER_TYPES = ["sprinter", "klimmer", "klassieker", "tijdrijder", "allrounder"] as const;
export type RiderType = (typeof RIDER_TYPES)[number];

export const TIERS = ["brons", "zilver", "goud"] as const;
export type Tier = (typeof TIERS)[number];

/** A rider card. The pool is generated from a fixed seed, so only ids are ever stored. */
export type RiderCard = {
  id: string;
  first: string;
  last: string;
  country: string;
  type: RiderType;
  stats: Stats;
  overall: number;
  tier: Tier;
};

export type Surface = "asfalt" | "kasseien" | "grind";

export type Climb = {
  id: string;
  name: string;
  country: string;
  /** Length in km and average gradient in percent, rounded from common sources (docs/kopman.md). */
  km: number;
  pct: number;
  surface?: Surface;
};

export type Sector = { id: string; name: string; country: string; km: number; surface: Exclude<Surface, "asfalt"> };

export type CourseItem =
  | { kind: "vlak"; km: number }
  | { kind: "klim"; climb: string }
  | { kind: "daal"; km: number; pct: number }
  | { kind: "sector"; sector: string };

export type RaceKind = "kermis" | "klassieker" | "monument" | "rit" | "tijdrit";

export type RaceDef = {
  id: string;
  name: string;
  country: string;
  kind: RaceKind;
  items: CourseItem[];
};

/** A course on a 100 m grid. */
export type Course = {
  id: string;
  length: number;
  grades: number[];
  surfaces: Surface[];
  elevation: number[];
  /** Named features along the course, in metres. */
  features: { name: string; start: number; end: number; kind: "klim" | Exclude<Surface, "asfalt"> }[];
  tt: boolean;
};

export const GRID = 100;

export type TeamDef = { id: string; name: string; short: string; color: string; riders: string[] };

export const PLAYER_TEAM = "eigen";

export type PackType = "brons" | "zilver" | "goud";
