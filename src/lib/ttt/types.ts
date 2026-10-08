export type TttRoutePreset = "next" | "next_wtrl" | "next_zrl";
export type TttOptimizationStrategy = "variable" | "fixed";

export type TttSettings = {
  route: TttRoutePreset;
  targetSpeed: number | null;
  intensity: number;
  efficiency: number;
  allowZeroPulls: boolean;
  minPullDuration: number;
  maxPullDuration: number;
  durationInterval: 10 | 15;
  optimizationStrategy: TttOptimizationStrategy;
};

export type TttPlanRiderInput = {
  id?: string | null;
  profileId: string | null;
  isManual: boolean;
  zwiftId: string;
  name: string;
  ftpWatts: number | null;
  weightKg: number | null;
  heightCm: number | null;
  power300Watts: number | null;
  pullWatts: number | null;
  pullDurationSeconds: number | null;
  displayOrder: number;
  role: string | null;
  notes: string | null;
};

export type TttPlanInput = {
  id?: string | null;
  name: string;
  eventId: string | null;
  parentTeamId: string;
  teamId: string | null;
  settings: TttSettings;
  riders: TttPlanRiderInput[];
};

export type TttActionResult =
  | {
      ok: true;
      planId: string;
      apiResponse?: unknown;
      riders?: TttPlanRiderInput[];
      message?: string;
    }
  | { ok: false; error: string; statusCode?: number };

// Een ZRL-TTT rijdt met hooguit 5 renners, andere TTT's met 8.
export function tttMaxRiders(eventType: string | null | undefined) {
  return eventType === "zrl" ? 5 : 8;
}

export const DEFAULT_TTT_SETTINGS: TttSettings = {
  route: "next_zrl",
  targetSpeed: null,
  intensity: 0,
  efficiency: 0,
  allowZeroPulls: false,
  minPullDuration: 30,
  maxPullDuration: 180,
  durationInterval: 15,
  optimizationStrategy: "variable",
};
