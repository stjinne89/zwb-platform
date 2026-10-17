import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchIntervalsActivitiesBetween,
  fetchIntervalsPowerCurveRanges,
  fetchIntervalsWellness,
  type IntervalsWellness,
} from "@/lib/intervals/client";
import { compactCurve, type CompactPoint } from "@/lib/stats/curves";
import {
  aggregateActivities,
  summarizeIntervalsActivity,
  type ActivityStats,
  type ActivitySummary,
} from "@/lib/stats/activity-stats";
import { addDays, bucketKey, bucketsBetween, type Granularity } from "@/lib/stats/personal";
import { CYCLING_SPORTS } from "@/lib/strava/sports";
import { PERSONAL_RIDE_COLUMNS, type PersonalRideRow } from "@/lib/stats/personal";

const PAGE = 1000;

/**
 * Alle eigen fietsritten, oudste eerst. Losse JSON-paden in plaats van `raw`:
 * de polyline en de rest van de Strava-payload hoeven niet over de lijn. Wie
 * vijf jaar Strava heeft gekoppeld zit zo op twee à drie vragen.
 */
export async function loadPersonalRideRows(
  supabase: SupabaseClient,
  profileId: string,
): Promise<PersonalRideRow[]> {
  const rows: PersonalRideRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("strava_activities")
      .select(PERSONAL_RIDE_COLUMNS)
      .eq("profile_id", profileId)
      .in("sport_type", CYCLING_SPORTS)
      .order("start_date", { ascending: true })
      .order("id")
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    rows.push(...(data as unknown as PersonalRideRow[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

export async function loadTileChoice(
  supabase: SupabaseClient,
  profileId: string,
  column: "tiles" | "club_tiles" = "tiles",
): Promise<unknown> {
  // Zonder migratie 0241 (of bij een fout) gewoon de standaardtegels.
  const { data, error } = await supabase
    .from("profile_stats_tiles")
    .select(column)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as Record<string, unknown>)[column] ?? null;
}

export type MyBadgeAward = {
  id: string;
  period_start: string;
  award_scope: "weekly" | "milestone";
  achievement_badges: { title: string; icon: string | null; color: string | null } | null;
};

/**
 * De eigen behaalde badges, nieuwste eerst, voor de Badges-tegel. Weekbadges en
 * mijlpalen samen; de badge-kast op het profiel blijft het volledige overzicht.
 */
export async function loadMyBadges(supabase: SupabaseClient, profileId: string): Promise<MyBadgeAward[]> {
  const { data, error } = await supabase
    .from("achievement_awards")
    .select("id, period_start, award_scope, achievement_badges(title, icon, color)")
    .eq("profile_id", profileId)
    .order("period_start", { ascending: false })
    .order("awarded_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as (Omit<MyBadgeAward, "achievement_badges"> & {
    achievement_badges: MyBadgeAward["achievement_badges"] | MyBadgeAward["achievement_badges"][];
  })[]).map((row) => ({
    ...row,
    achievement_badges: Array.isArray(row.achievement_badges)
      ? (row.achievement_badges[0] ?? null)
      : row.achievement_badges,
  }));
}

export type StatsConnection = { athlete_id: string; api_key: string; wellness_opt_in: boolean | null };

export async function loadStatsConnection(
  supabase: SupabaseClient,
  profileId: string,
): Promise<StatsConnection | null> {
  const { data } = await supabase
    .from("intervals_connections")
    .select("athlete_id, api_key, wellness_opt_in")
    .eq("profile_id", profileId)
    .maybeSingle();
  return data?.api_key && data.athlete_id ? (data as StatsConnection) : null;
}

/**
 * Wellness van intervals.icu, één keer per weergave: Fitheid en eFTP lezen
 * dezelfde reeks.
 */
export const loadStatsWellness = cache(
  async (apiKey: string, athleteId: string, days: number): Promise<IntervalsWellness[] | null> =>
    fetchIntervalsWellness(apiKey, athleteId, Math.min(3650, Math.max(1, days))).catch(() => null),
);

/**
 * Powercurves per periode, zes uur gedeeld tussen weergaven: een afgesloten maand
 * verandert niet meer, en elke weergave opnieuw tien vragen aan intervals.icu
 * maakt de pagina traag. De sleutel is het lid plus de bereiken; de API-key
 * zoekt de cache zelf op, zodat hij niet in de cachesleutel staat.
 */
export const loadPeriodCurves = unstable_cache(
  async (profileId: string, ranges: string[]): Promise<Record<string, CompactPoint[]>> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("intervals_connections")
      .select("athlete_id, api_key")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (!data?.api_key || !data.athlete_id) return {};
    const curves = await fetchIntervalsPowerCurveRanges(data.api_key, data.athlete_id, ranges);
    // Niets terug is eerder een storing dan geen ritten: niet zes uur onthouden.
    if (curves.size === 0 && ranges.length > 0) throw new Error("intervals.icu gaf geen curves.");
    return Object.fromEntries([...curves].map(([range, points]) => [range, compactCurve(points)]));
  },
  ["stats-ik-period-curves", "v1"],
  { revalidate: 6 * 60 * 60 },
);

/** Piekvermogen en CP/W′ vragen dezelfde bereiken: één keer per weergave. */
export const loadPeriodCurvesOnce = cache((profileId: string, rangesKey: string) =>
  loadPeriodCurves(profileId, rangesKey ? rangesKey.split(",") : []),
);

/** Een jaar per aanroep: tien jaar activiteiten in één antwoord is te groot. */
const ACTIVITY_CHUNK_DAYS = 366;

/**
 * Zonetijden, W′bal en duurvermogen per periode uit de intervals-activiteiten.
 * Per rit bewaren we niets: de activiteiten worden hier omgerekend naar totalen
 * per periode, en alleen die staan zes uur in de cache. Zo blijft de opslag bij
 * wat er al was (120 dagen in intervals_activities).
 */
export const loadActivityStats = unstable_cache(
  async (profileId: string, start: string, end: string, per: Granularity): Promise<ActivityStats> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("intervals_connections")
      .select("athlete_id, api_key")
      .eq("profile_id", profileId)
      .maybeSingle();
    const keys = bucketsBetween(start, end, per);
    if (!data?.api_key || !data.athlete_id) return aggregateActivities([], keys, (day) => bucketKey(day, per));
    const summaries: ActivitySummary[] = [];
    for (let from = start; from <= end; from = addDays(from, ACTIVITY_CHUNK_DAYS)) {
      const to = addDays(from, ACTIVITY_CHUNK_DAYS - 1);
      const rows = await fetchIntervalsActivitiesBetween(data.api_key, data.athlete_id, from, to > end ? end : to);
      for (const row of rows) {
        const summary = summarizeIntervalsActivity(row);
        if (summary) summaries.push(summary);
      }
    }
    return aggregateActivities(summaries, keys, (day) => bucketKey(day, per));
  },
  ["stats-ik-activity-stats", "v1"],
  { revalidate: 6 * 60 * 60 },
);

/** Zones, W′bal en duurvermogen lezen hetzelfde: één keer per weergave. */
export const loadActivityStatsOnce = cache((profileId: string, start: string, end: string, per: Granularity) =>
  loadActivityStats(profileId, start, end, per),
);
