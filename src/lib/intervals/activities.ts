import type { createAdminClient } from "@/lib/supabase/admin";
import { fetchIntervalsActivities, type IntervalsActivity } from "@/lib/intervals/client";

type Admin = ReturnType<typeof createAdminClient>;

/** Hoe oud de opgeslagen belasting mag zijn voordat we opnieuw ophalen. */
export const ACTIVITY_SYNC_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function positive(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Arbeid in kilojoules. intervals.icu levert dit niet onder één vaste naam, dus
 * we proberen de bekende varianten en vallen anders terug op vermogen x tijd.
 */
export function kilojoulesFromActivity(activity: IntervalsActivity) {
  const joules = positive(activity.icu_joules) ?? positive(activity.joules);
  if (joules) return Math.round(joules / 1000);
  const kilojoules = positive(activity.kilojoules);
  if (kilojoules) return Math.round(kilojoules);
  const watts = positive(activity.average_watts);
  const seconds = positive(activity.moving_time);
  if (watts && seconds) return Math.round((watts * seconds) / 1000);
  return null;
}

function toRow(profileId: string, activity: IntervalsActivity) {
  const startDate = String(activity.start_date_local ?? "").slice(0, 10);
  if (!activity.id || !startDate) return null;
  return {
    profile_id: profileId,
    intervals_id: String(activity.id),
    start_date_local: startDate,
    name: activity.name ?? null,
    type: activity.type ?? null,
    moving_time_seconds: positive(activity.moving_time),
    distance_m: positive(activity.distance),
    elevation_gain_m: positive(activity.total_elevation_gain),
    training_load: positive(activity.icu_training_load),
    intensity: positive(activity.icu_intensity),
    average_watts: positive(activity.average_watts),
    normalized_watts: positive(activity.weighted_average_watts),
    kilojoules: kilojoulesFromActivity(activity),
    ftp_watts: positive(activity.icu_ftp),
    raw: activity as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  };
}

/** Haalt de laatste N dagen activiteiten op en werkt de opgeslagen rijen bij. */
export async function syncIntervalsActivities(
  admin: Admin,
  connection: { profile_id: string; athlete_id: string; api_key: string },
  days = 120,
) {
  const activities = await fetchIntervalsActivities(
    connection.api_key,
    connection.athlete_id,
    days,
  );
  const rows = activities.flatMap((activity) => {
    const row = toRow(connection.profile_id, activity);
    return row ? [row] : [];
  });
  if (rows.length === 0) return { synced: 0 };

  const { error } = await admin
    .from("intervals_activities")
    .upsert(rows, { onConflict: "profile_id,intervals_id" });
  if (error) throw new Error(error.message);
  return { synced: rows.length };
}

export type ActivityLoadRow = {
  intervals_id: string;
  start_date_local: string;
  name: string | null;
  type: string | null;
  moving_time_seconds: number | null;
  training_load: number | null;
  intensity: number | null;
  normalized_watts: number | null;
  kilojoules: number | null;
};

export type WeeklyLoad = {
  /** Maandag van de week, als datumsleutel. */
  weekStart: string;
  load: number;
  hours: number;
  kilojoules: number;
};

function mondayOf(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

/** Telt belasting per week op, oudste week eerst. */
export function weeklyLoad(rows: ActivityLoadRow[], weeks = 12): WeeklyLoad[] {
  const byWeek = new Map<string, WeeklyLoad>();
  for (const row of rows) {
    const weekStart = mondayOf(row.start_date_local);
    const entry = byWeek.get(weekStart) ?? { weekStart, load: 0, hours: 0, kilojoules: 0 };
    entry.load += Number(row.training_load ?? 0);
    entry.hours += Number(row.moving_time_seconds ?? 0) / 3600;
    entry.kilojoules += Number(row.kilojoules ?? 0);
    byWeek.set(weekStart, entry);
  }
  return Array.from(byWeek.values())
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .slice(-weeks)
    .map((week) => ({
      ...week,
      load: Math.round(week.load),
      hours: Math.round(week.hours * 10) / 10,
      kilojoules: Math.round(week.kilojoules),
    }));
}
