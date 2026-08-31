// De jaarplanning uit de database halen.
//
// Los van season.ts gehouden: daar staat alleen rekenwerk op datums, zodat het
// zonder Supabase te testen is. Hier staat het ophalen, in dezelfde vorm als
// availability.ts en events.ts dat doen.

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  seasonForAi,
  type SeasonForAi,
  type SeasonPeriod,
  type SeasonPeriodKind,
  type SeasonPriority,
  type SeasonTarget,
} from "@/lib/training/season";

type Admin = ReturnType<typeof createAdminClient>;

/** Hoe ver voorbij de planperiode we nog naar een volgend mikpunt kijken. */
const LOOKAHEAD_DAYS = 365;

function shift(dayKey: string, days: number): string {
  const date = new Date(`${dayKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function loadSeasonTargets(
  admin: Admin,
  profileId: string,
  from: string,
  to: string,
): Promise<SeasonTarget[]> {
  const { data } = await admin
    .from("training_season_targets")
    .select("id, title, target_date, priority, event_id, goal_id, note")
    .eq("profile_id", profileId)
    .gte("target_date", from)
    .lte("target_date", to)
    .order("target_date", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    targetDate: String(row.target_date).slice(0, 10),
    priority: row.priority as SeasonPriority,
    eventId: (row.event_id as string | null) ?? null,
    goalId: (row.goal_id as string | null) ?? null,
    note: (row.note as string | null) ?? null,
  }));
}

/**
 * De periodes die het venster raken — ook een vakantie die vóór `from` begon en
 * er nog doorheen loopt. Filteren op alleen start_date zou die missen.
 */
export async function loadSeasonPeriods(
  admin: Admin,
  profileId: string,
  from: string,
  to: string,
): Promise<SeasonPeriod[]> {
  const { data } = await admin
    .from("training_season_periods")
    .select("id, title, start_date, end_date, kind, note")
    .eq("profile_id", profileId)
    .lte("start_date", to)
    .gte("end_date", from)
    .order("start_date", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    startDate: String(row.start_date).slice(0, 10),
    endDate: String(row.end_date).slice(0, 10),
    kind: row.kind as SeasonPeriodKind,
    note: (row.note as string | null) ?? null,
  }));
}

/**
 * De jaarplanning in de vorm die de AI-input verwacht. Kijkt bewust een jaar
 * voorbij de planperiode: alleen zo weet de planner dat er kort ná de horizon
 * een piek ligt waar hij nu al naartoe hoort te werken.
 */
export async function seasonPlanForAi(
  admin: Admin,
  profileId: string,
  from: string,
  to: string,
): Promise<SeasonForAi | null> {
  const [targets, periods] = await Promise.all([
    loadSeasonTargets(admin, profileId, from, shift(to, LOOKAHEAD_DAYS)),
    loadSeasonPeriods(admin, profileId, from, to),
  ]);
  return seasonForAi({ targets, periods, from, to });
}
