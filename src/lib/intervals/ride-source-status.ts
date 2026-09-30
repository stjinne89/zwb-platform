// Waar komen de ritten van dit lid vandaan, en wat moet de UI dan tonen?
// Gedeeld door het dashboard en het profiel.
//
// Leest met de admin-client: het aantal Strava-koppelingen (de cap) is niet
// zichtbaar onder de RLS van een lid, en de herinneringskolommen bestaan pas na
// migratie 0198. Zonder die migratie valt de herinnering stil weg in plaats van
// dat de pagina breekt.

import { rideSourceFor, type RideSource } from "@/lib/intervals/rides";
import { visitReminderDue } from "@/lib/intervals/visit-reminder";
import { stravaAthleteCap } from "@/lib/strava/sweep";
import { createAdminClient } from "@/lib/supabase/admin";

export type RideSourceStatus = {
  source: RideSource;
  /** Actieve Strava-koppeling (niet ingetrokken). */
  stravaActive: boolean;
  intervalsConnected: boolean;
  /** Alle Strava-plekken bezet; een nieuwe koppeling zou Strava weigeren. */
  stravaCapFull: boolean;
  /** Balk "open intervals.icu even" tonen. */
  visitReminderDue: boolean;
};

export async function loadRideSourceStatus(profileId: string): Promise<RideSourceStatus> {
  const admin = createAdminClient();
  const [intervals, strava, activeCount, visit] = await Promise.all([
    admin
      .from("intervals_connections")
      .select("athlete_id")
      .eq("profile_id", profileId)
      .maybeSingle(),
    admin
      .from("strava_connections")
      .select("revoked_at")
      .eq("profile_id", profileId)
      .maybeSingle(),
    admin
      .from("strava_connections")
      .select("profile_id", { count: "exact", head: true })
      .is("revoked_at", null),
    admin
      .from("intervals_connections")
      .select("created_at, visit_confirmed_at")
      .eq("profile_id", profileId)
      .maybeSingle(),
  ]);

  const intervalsConnected = Boolean(
    (intervals.data as { athlete_id?: string | null } | null)?.athlete_id,
  );
  const stravaRow = strava.data as { revoked_at: string | null } | null;
  const source = rideSourceFor({
    hasStravaConnection: Boolean(stravaRow),
    hasIntervals: intervalsConnected,
  });
  const visitRow = visit.error
    ? null
    : (visit.data as { created_at: string | null; visit_confirmed_at: string | null } | null);

  return {
    source,
    stravaActive: Boolean(stravaRow && !stravaRow.revoked_at),
    intervalsConnected,
    stravaCapFull: (activeCount.count ?? 0) >= stravaAthleteCap(),
    visitReminderDue:
      source === "intervals" && visitRow != null && visitReminderDue(visitRow),
  };
}
