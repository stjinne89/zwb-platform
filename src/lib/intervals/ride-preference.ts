// Leden die hun ritten via intervals.icu krijgen terwijl Strava gekoppeld blijft
// (intervals_connections.rides_via_intervals, migratie 0299). Strava levert dan
// geen ritten meer, alleen nog wat een token nodig heeft: de samenvatting in de
// beschrijving, de Zwift-routes en de fietsen.
//
// Los bestand zonder imports, net als ride-id.ts: de Strava-sync en de webhook
// lezen dit, en rides.ts importeert zelf uit lib/strava/client.
//
// Elke fout telt als "nee". Zo werkt alles zoals voorheen zolang 0299 nog niet
// op de database staat.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export async function ridesComeViaIntervals(admin: Admin, profileId: string): Promise<boolean> {
  try {
    const { data, error } = await admin
      .from("intervals_connections")
      .select("athlete_id, rides_via_intervals")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (error) return false;
    const row = data as { athlete_id: string | null; rides_via_intervals: boolean | null } | null;
    return Boolean(row?.athlete_id && row.rides_via_intervals);
  } catch {
    return false;
  }
}

export async function loadRidesViaIntervalsProfiles(admin: Admin): Promise<Set<string>> {
  try {
    const { data, error } = await admin
      .from("intervals_connections")
      .select("profile_id")
      .eq("rides_via_intervals", true)
      .not("athlete_id", "is", null);
    if (error) return new Set();
    return new Set(((data ?? []) as { profile_id: string }[]).map((row) => row.profile_id));
  } catch {
    return new Set();
  }
}
