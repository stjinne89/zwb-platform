"use server";

// Ritten via intervals.icu vanuit de app: zelf ophalen, de herinnering afvinken
// en overstappen van Strava. De uurlijkse cron doet hetzelfde ophalen voor
// iedereen; zie lib/intervals/ride-sync.ts.

import { revalidatePath } from "next/cache";
import {
  intervalsRideSourceFor,
  syncIntervalsRidesForProfile,
} from "@/lib/intervals/ride-sync";
import { rateLimitHit } from "@/lib/rate-limit";
import { revokeAndCleanupStravaConnection } from "@/lib/strava/sweep";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function revalidateRidePages() {
  for (const path of ["/dashboard", "/achievements", "/stats", "/leden", "/profiel", "/zwblokken"]) {
    revalidatePath(path);
  }
}

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function syncMyIntervalsRides() {
  const { userId } = await currentUserId();
  if (!userId) return { ok: false as const, error: "Niet ingelogd." };

  const budget = await rateLimitHit("intervals-rides", userId, 6, 3600);
  if (!budget.allowed) {
    return { ok: false as const, error: "Probeer het over een uur opnieuw." };
  }

  const admin = createAdminClient();
  const connection = await intervalsRideSourceFor(admin, userId);
  if (!connection) {
    return { ok: false as const, error: "Je ritten komen niet via intervals.icu binnen." };
  }
  const result = await syncIntervalsRidesForProfile(admin, connection);
  if (result.error) return { ok: false as const, error: result.error };
  revalidateRidePages();
  return { ok: true as const, stored: result.stored, removed: result.removed };
}

export async function confirmIntervalsVisit() {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false as const, error: "Niet ingelogd." };
  const { error } = await supabase
    .from("intervals_connections")
    .update({ visit_confirmed_at: new Date().toISOString() })
    .eq("profile_id", userId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/**
 * Strava los, ritten voortaan via intervals.icu. Maakt een plek vrij in de
 * Strava-cap. De Strava-ritten gaan weg (retentie, lib/strava/retention.ts); de
 * eerste intervals-sync haalt een jaar op.
 *
 * Lukt het intrekken bij Strava niet, dan blijft de koppeling gemarkeerd staan en
 * probeert de nachtelijke sweeper het opnieuw. Pas als die rij weg is, begint de
 * intervals-sync (rideSourceFor); zo komen er geen dubbele ritten.
 */
export async function switchStravaToIntervals() {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false as const, error: "Niet ingelogd." };

  const { data: connection } = await supabase
    .from("intervals_connections")
    .select("athlete_id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (!connection?.athlete_id) {
    return { ok: false as const, error: "Koppel eerst intervals.icu." };
  }

  const admin = createAdminClient();
  await admin
    .from("intervals_connections")
    .update({ rides_backfilled_at: null })
    .eq("profile_id", userId);
  const revoked = await revokeAndCleanupStravaConnection(
    admin,
    userId,
    "switched_to_intervals",
  );
  if (!revoked.purged) {
    revalidateRidePages();
    return {
      ok: false as const,
      error: "Strava ontkoppelen lukte nog niet. We proberen het vannacht opnieuw.",
    };
  }

  const source = await intervalsRideSourceFor(admin, userId);
  const result = source ? await syncIntervalsRidesForProfile(admin, source) : null;
  revalidateRidePages();
  return {
    ok: true as const,
    stored: result?.stored ?? 0,
    error: result?.error ?? null,
  };
}
