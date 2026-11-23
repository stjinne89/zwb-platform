// De powerprofielen die aan de beurt zijn verversen (zie power-refresh-due.ts).
// Draait mee in het uurlijkse /api/intervals/rides/sync, met wat daar aan tijd
// overblijft: een paar leden per run, één tegelijk, zodat intervals.icu geen 429
// geeft zoals bij de knop die alle leden achter elkaar ophaalt.

import { POWER_STALE_MS } from "@/lib/briljant/snapshot";
import { syncOnePowerProfile, type IntervalsConnectionRow } from "@/lib/teams/power-sync";
import { powerProfilesDue } from "@/lib/teams/power-refresh-due";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export const POWER_REFRESH_PER_RUN = 4;

export type PowerRefreshResult = { due: number; synced: number; failed: number };

/** Ververst wie aan de beurt is, tot `deadline` (ms sinds epoch). */
export async function refreshDuePowerProfiles(
  admin: Admin,
  deadline: number,
  limit = POWER_REFRESH_PER_RUN,
  now = Date.now(),
): Promise<PowerRefreshResult> {
  const { data: connectionData, error } = await admin
    .from("intervals_connections")
    .select("profile_id, athlete_id, api_key, profiles(ftp_watts, weight_kg, auto_sync_physique)")
    .not("athlete_id", "is", null);
  if (error) throw new Error(error.message);
  const connections = (connectionData ?? []) as IntervalsConnectionRow[];
  if (connections.length === 0) return { due: 0, synced: 0, failed: 0 };
  const ids = connections.map((row) => row.profile_id);

  const [{ data: profileData, error: profileError }, { data: rideData, error: rideError }] = await Promise.all([
    admin.from("rider_power_profiles").select("profile_id, synced_at, sync_status").in("profile_id", ids),
    admin
      .from("strava_activities")
      .select("profile_id, start_date, moving_time_seconds, sport_type")
      .in("profile_id", ids)
      .gte("start_date", new Date(now - POWER_STALE_MS).toISOString())
      .order("start_date", { ascending: false })
      .limit(1000),
  ]);
  if (profileError) throw new Error(profileError.message);
  if (rideError) throw new Error(rideError.message);

  const profileOf = new Map(
    ((profileData ?? []) as Array<{ profile_id: string; synced_at: string | null; sync_status: string | null }>).map((row) => [row.profile_id, row]),
  );
  const ridesOf = new Map<string, Array<{ startDate: string; movingSeconds: number | null; sportType: string | null }>>();
  for (const ride of (rideData ?? []) as Array<{ profile_id: string; start_date: string; moving_time_seconds: number | null; sport_type: string | null }>) {
    const list = ridesOf.get(ride.profile_id) ?? [];
    list.push({ startDate: ride.start_date, movingSeconds: ride.moving_time_seconds, sportType: ride.sport_type });
    ridesOf.set(ride.profile_id, list);
  }

  const due = powerProfilesDue(
    ids.map((profileId) => ({
      profileId,
      syncedAt: profileOf.get(profileId)?.synced_at ?? null,
      syncStatus: profileOf.get(profileId)?.sync_status ?? null,
      rides: ridesOf.get(profileId) ?? [],
    })),
    now,
  );

  const connectionOf = new Map(connections.map((row) => [row.profile_id, row]));
  const result: PowerRefreshResult = { due: due.length, synced: 0, failed: 0 };
  for (const profileId of due.slice(0, limit)) {
    if (Date.now() > deadline) break;
    const outcome = await syncOnePowerProfile(admin, connectionOf.get(profileId)!).catch(() => null);
    if (outcome?.ok) result.synced += 1;
    else result.failed += 1;
  }
  return result;
}
