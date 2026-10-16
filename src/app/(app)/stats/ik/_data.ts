import type { SupabaseClient } from "@supabase/supabase-js";
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
