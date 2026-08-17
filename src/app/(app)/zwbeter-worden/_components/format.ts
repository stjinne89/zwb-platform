// Opmaak- en groepeerhelpers die de ZWBeter Worden-subpagina's delen.

import type { StravaActivityRow } from "./types";

/** Het gevoel dat het lid bij een training invulde. */
export const FEEL_LABELS: Record<string, string> = {
  goed: "Goed",
  neutraal: "Neutraal",
  zwaar: "Zwaar",
  slecht: "Slecht",
};

export const GOAL_LABELS: Record<string, string> = {
  zrl: "ZRL",
  ladder: "Ladder",
  outdoor_event: "Outdoor event",
  gran_fondo: "Gran fondo",
  ftp: "FTP",
  base_fitness: "Basisconditie",
  rebuild: "Herstel/opbouw",
};

export function toNum(v: number | string | null | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function formatKm(meters?: number) {
  if (!meters) return "-";
  return `${(meters / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km`;
}

export function formatHours(seconds?: number) {
  if (!seconds) return "-";
  return `${(seconds / 3600).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} u`;
}

export function formatMeters(m?: number) {
  if (!m) return "-";
  return `${Math.round(m).toLocaleString("nl-NL")} m`;
}

export function formatNumber(n?: number, digits = 0) {
  if (n === undefined || n === null) return "-";
  return n.toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** mm:ss voor segmenttijden. */
export function formatSegmentTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${`${rest}`.padStart(2, "0")}`;
}

export function formatWellnessDate(value: string | null) {
  if (!value) return "-";
  return new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Amsterdam",
  });
}

export function formatDayMonth(value: string, withWeekday = true) {
  return new Date(value).toLocaleDateString("nl-NL", {
    ...(withWeekday ? { weekday: "short" as const } : {}),
    day: "numeric",
    month: "short",
    timeZone: "Europe/Amsterdam",
  });
}

export function eFTPDeltaLabel(delta: number) {
  return `${delta > 0 ? "+" : ""}${delta.toFixed(0)}w`;
}

export function formAction(action: (formData: FormData) => Promise<unknown>) {
  return action as unknown as (formData: FormData) => Promise<void>;
}

export function paramString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function dateValue(value: string) {
  return parseDate(value)?.toISOString().slice(0, 10) ?? "";
}

export function timeValue(value: string) {
  return (parseDate(value) ?? new Date("2000-01-01T09:00:00+01:00")).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Amsterdam",
  });
}

export function byProfile<T extends { profile_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) map.set(row.profile_id, [...(map.get(row.profile_id) ?? []), row]);
  return map;
}

export function byPlan<T extends { plan_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) map.set(row.plan_id, [...(map.get(row.plan_id) ?? []), row]);
  return map;
}

/**
 * Groepeert workouts per schema in plaats van per plan: een aanpassing woont in
 * een afgeleid plan, maar hoort bij het schema waar hij op ingrijpt. Workouts
 * met een onbekend plan vallen terug op hun eigen plan_id.
 */
export function byRootPlan<T extends { plan_id: string; scheduled_at: string }>(
  rows: T[],
  planToRoot: Map<string, string>,
) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = planToRoot.get(row.plan_id) ?? row.plan_id;
    map.set(key, [...(map.get(key) ?? []), row]);
  }
  for (const [key, workouts] of map) {
    map.set(key, [...workouts].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));
  }
  return map;
}

export function byWorkout<T extends { workout_id: string }>(rows: T[]) {
  const map = new Map<string, T>();
  for (const row of rows) map.set(row.workout_id, row);
  return map;
}

export function loadSummary(rows: StravaActivityRow[]) {
  return rows.reduce(
    (acc, row) => ({
      activities: acc.activities + 1,
      distance: acc.distance + toNum(row.distance_m),
      elevation: acc.elevation + toNum(row.total_elevation_gain_m),
      time: acc.time + (row.moving_time_seconds ?? 0),
    }),
    { activities: 0, distance: 0, elevation: 0, time: 0 },
  );
}
