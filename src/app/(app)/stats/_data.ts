import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { CYCLING_SPORTS } from "@/lib/strava/sports";
import { mergeClubData, summarizeClubRides, type ClubData, type ClubRideRow } from "@/lib/stats/club";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

// Data van /stats (Club). Alles via de service-rol en gedeeld tussen leden:
// strava_activities en profiles zijn voor alle ingelogde leden leesbaar (RLS
// `using (true)`), dus de cache toont niemand iets wat hij niet zelf mag zien.
// Functies draaien in Ohio en de database staat in Ierland; elke vraag is een
// oversteek, en de database zit op het gratis plan. Daarom per jaar één
// samenvatting (src/lib/stats/club.ts) in plaats van ritten per weergave.

const PAGE = 1000;

/** Een kalenderjaar (UTC) aan ritten, samengevat. Elke rit valt in precies één jaar. */
async function fetchClubYear(year: string): Promise<ClubData> {
  const admin = createAdminClient();
  const rows: ClubRideRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("strava_activities")
      .select("profile_id, start_date, sport_type, distance_m, total_elevation_gain_m, moving_time_seconds")
      .gte("start_date", `${year}-01-01T00:00:00Z`)
      .lt("start_date", `${Number(year) + 1}-01-01T00:00:00Z`)
      .in("sport_type", CYCLING_SPORTS)
      .order("start_date", { ascending: true })
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as ClubRideRow[]));
    if (data.length < PAGE) break;
  }
  return summarizeClubRides(rows);
}

/** Een afgesloten jaar verandert nauwelijks: één keer per dag verversen. */
const loadClosedYear = unstable_cache(fetchClubYear, ["club-stats-closed-year", "v1"], { revalidate: 24 * 60 * 60 });

/** Het lopende jaar elke tien minuten, zoals de clubpagina altijd deed. */
const loadOpenYear = unstable_cache(fetchClubYear, ["club-stats-open-year", "v1"], { revalidate: 10 * 60 });

export async function loadClubData(years: string[]): Promise<ClubData> {
  const current = amsterdamDayKey().slice(0, 4);
  const parts = await Promise.all(
    years.map((year) => (year >= current ? loadOpenYear(year) : loadClosedYear(year))),
  );
  return mergeClubData(parts);
}

/** De dag van de eerste clubrit, voor het bereik "Alles". */
export const loadFirstClubDay = unstable_cache(
  async (): Promise<string | null> => {
    const { data } = await createAdminClient()
      .from("strava_activities")
      .select("start_date")
      .in("sport_type", CYCLING_SPORTS)
      .order("start_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data?.start_date ? amsterdamDayKey(new Date(data.start_date)) : null;
  },
  ["club-stats-first-day", "v1"],
  { revalidate: 24 * 60 * 60 },
);

export type ClubProfile = { id: string; name: string; region: string | null };

/** Namen en regio's voor de ranglijst en de regiotegel. */
export const loadClubProfiles = unstable_cache(
  async (): Promise<ClubProfile[]> => {
    const { data } = await createAdminClient().from("profiles").select("id, display_name, region");
    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: (row.display_name as string | null) ?? "Onbekend",
      region: (row.region as string | null) ?? null,
    }));
  },
  ["club-stats-profiles", "v1"],
  { revalidate: 10 * 60 },
);
