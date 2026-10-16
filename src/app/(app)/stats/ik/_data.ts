import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchIntervalsPowerCurveRanges,
  fetchIntervalsWellness,
  type IntervalsWellness,
} from "@/lib/intervals/client";
import { compactCurve, type CompactPoint } from "@/lib/stats/curves";
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

export async function loadTileChoice(supabase: SupabaseClient, profileId: string): Promise<unknown> {
  // Zonder migratie 0241 (of bij een fout) gewoon de standaardtegels.
  const { data, error } = await supabase
    .from("profile_stats_tiles")
    .select("tiles")
    .eq("profile_id", profileId)
    .maybeSingle();
  return error ? null : (data?.tiles ?? null);
}

export type StatsConnection = { athlete_id: string; api_key: string };

export async function loadStatsConnection(
  supabase: SupabaseClient,
  profileId: string,
): Promise<StatsConnection | null> {
  const { data } = await supabase
    .from("intervals_connections")
    .select("athlete_id, api_key")
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
