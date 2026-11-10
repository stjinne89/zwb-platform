// Virtuele ritten uit activities.csv waarvan de route nog in de Strava-export
// ligt. activities.csv heeft geen route, dus zulke ritten leveren geen
// ZWBlokken in Zwift en geen coltijden op. Het bestand uit de map `activities`
// van dezelfde export heeft die wel: de import koppelt het aan de CSV-rit
// (stats/rankings/_actions.ts, plan.attach).
//
// Op 2026-11-10 ging het om vijf leden met samen ~3.800 ritten. Een TCX kan de
// import niet lezen, dus die telt niet mee.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

/** Onder dit aantal geen melding: een handvol ritten is de moeite niet. */
export const MISSING_TRACKS_MIN = 25;

export type MissingZwiftTracks = { rides: number; km: number };

const PAGE = 1000;

/** Aantal ritten en kilometers, of null onder de drempel. Puur, voor de test. */
export function summarizeMissingTracks(
  rows: { distance_m: number | string | null }[],
  min = MISSING_TRACKS_MIN,
): MissingZwiftTracks | null {
  if (rows.length < min) return null;
  const meters = rows.reduce((sum, row) => sum + (Number(row.distance_m) || 0), 0);
  return { rides: rows.length, km: Math.round(meters / 1000) };
}

export async function loadMissingZwiftTracks(
  supabase: Client,
  profileId: string,
): Promise<MissingZwiftTracks | null> {
  const rows: { distance_m: number | string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("strava_activities")
      .select("distance_m")
      .eq("profile_id", profileId)
      .eq("sport_type", "VirtualRide")
      .eq("raw->>import_source", "strava_csv")
      .is("raw->map->>summary_polyline", null)
      .not("raw->>filename", "is", null)
      .neq("raw->>filename", "")
      .not("raw->>filename", "like", "%.tcx%")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return null;
    rows.push(...((data ?? []) as { distance_m: number | string | null }[]));
    if ((data ?? []).length < PAGE) break;
  }
  return summarizeMissingTracks(rows);
}
