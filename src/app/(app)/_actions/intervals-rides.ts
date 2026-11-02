"use server";

// Ritten via intervals.icu vanuit de app: zelf ophalen, de herinnering afvinken,
// intervals.icu naast Strava als ritbron kiezen en overstappen van Strava. De uurlijkse cron doet hetzelfde ophalen voor
// iedereen; zie lib/intervals/ride-sync.ts.

import { revalidatePath } from "next/cache";
import {
  dropIntervalsRides,
  FIRST_SYNC_DAYS,
  intervalsRideSourceFor,
  SYNC_WINDOW_DAYS,
  syncIntervalsRidesForProfile,
} from "@/lib/intervals/ride-sync";
import { rateLimitHit } from "@/lib/rate-limit";
import { syncStravaActivitiesForUser } from "@/lib/strava/client";
import { revokeAndCleanupStravaConnection } from "@/lib/strava/sweep";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function revalidateRidePages() {
  for (const path of ["/dashboard", "/stats/rankings", "/stats", "/leden", "/profiel", "/zwblokken"]) {
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
 * Ritten via intervals.icu terwijl Strava gekoppeld blijft, of weer terug naar
 * Strava (ride-preference.ts, migratie 0299).
 *
 * Aan: de Strava-ritten blijven staan; intervals.icu vult aan vanaf de laatste
 * rit die er staat, en ontdubbelt tegen de rest (dedupeRides).
 * Uit: de intervals-ritten gaan weg en Strava haalt ze opnieuw op, net als bij
 * een nieuwe Strava-koppeling.
 */
export async function setRidesViaIntervals(on: boolean) {
  const { userId } = await currentUserId();
  if (!userId) return { ok: false as const, error: "Niet ingelogd." };

  const budget = await rateLimitHit("intervals-rides-choice", userId, 6, 3600);
  if (!budget.allowed) {
    return { ok: false as const, error: "Probeer het over een uur opnieuw." };
  }

  const admin = createAdminClient();
  const [{ data: connection }, { data: strava }] = await Promise.all([
    admin
      .from("intervals_connections")
      .select("profile_id, athlete_id, api_key, rides_backfilled_at")
      .eq("profile_id", userId)
      .maybeSingle(),
    admin
      .from("strava_connections")
      .select("revoked_at")
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);
  if (!connection?.athlete_id) {
    return { ok: false as const, error: "Koppel eerst intervals.icu." };
  }

  if (!on) {
    const { error } = await admin
      .from("intervals_connections")
      .update({ rides_via_intervals: false })
      .eq("profile_id", userId);
    if (error) return { ok: false as const, error: error.message };
    await dropIntervalsRides(admin, userId);
    if (strava && !strava.revoked_at) {
      await syncStravaActivitiesForUser(admin, userId, { skipPostProcessing: true }).catch(
        () => null,
      );
    }
    revalidateRidePages();
    return { ok: true as const, stored: 0 };
  }

  if (!strava || strava.revoked_at) {
    return { ok: false as const, error: "Koppel eerst Strava." };
  }

  // Aanvullen vanaf de laatste rit die er al staat, niet een heel jaar: oudere
  // ritten staan er al van Strava.
  const now = new Date();
  const { data: latest } = await admin
    .from("strava_activities")
    .select("start_date")
    .eq("profile_id", userId)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sinceLatest = latest?.start_date
    ? Math.ceil((now.getTime() - Date.parse(latest.start_date)) / 86400_000) + 1
    : FIRST_SYNC_DAYS;
  const days = Math.min(FIRST_SYNC_DAYS, Math.max(SYNC_WINDOW_DAYS, sinceLatest));

  const { error } = await admin
    .from("intervals_connections")
    .update({ rides_via_intervals: true, rides_backfilled_at: now.toISOString() })
    .eq("profile_id", userId);
  if (error) return { ok: false as const, error: error.message };

  const result = await syncIntervalsRidesForProfile(
    admin,
    { ...connection, rides_backfilled_at: now.toISOString() },
    { now, days },
  );
  revalidateRidePages();
  if (result.error) return { ok: false as const, error: result.error };
  return { ok: true as const, stored: result.stored };
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
