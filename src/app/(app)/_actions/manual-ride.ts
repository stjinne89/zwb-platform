"use server";

// Een gereden rit zelf invullen, als het bestand verloren ging (opname mislukt,
// toestel leeg). De rij bouwt manualRideRow; hier alleen opslaan, verwijderen en
// het nawerk dat een rit zonder spoor nodig heeft: de training afvinken en badges.

import { revalidatePath } from "next/cache";
import { awardCompletedAchievementWeeks } from "@/lib/achievements/awards";
import { rateLimitHit } from "@/lib/rate-limit";
import { isSameRide } from "@/lib/rides/same-ride";
import {
  MANUAL_IMPORT_SOURCE,
  manualRideRow,
  type ManualRideInput,
} from "@/lib/strava/import";
import { runPostSyncForProfile } from "@/lib/strava/post-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ManualRide = {
  id: number;
  name: string;
  start_date: string;
  distance_m: number;
  moving_time_seconds: number;
};

function revalidateRidePages() {
  for (const path of ["/dashboard", "/stats/rankings", "/stats", "/leden", "/profiel", "/zwbeter-worden"]) {
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

export async function listMyManualRides() {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false as const, error: "Niet ingelogd." };
  const { data, error } = await supabase
    .from("strava_activities")
    .select("id, name, start_date, distance_m, moving_time_seconds")
    .eq("profile_id", userId)
    .eq("raw->>import_source", MANUAL_IMPORT_SOURCE)
    .order("start_date", { ascending: false })
    .limit(5);
  if (error) return { ok: false as const, error: error.message };
  return {
    ok: true as const,
    rides: (data ?? []).map((ride) => ({
      ...ride,
      id: Number(ride.id),
      distance_m: Number(ride.distance_m) || 0,
    })) as ManualRide[],
  };
}

export async function saveManualRide(input: ManualRideInput) {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false as const, error: "Niet ingelogd." };

  const budget = await rateLimitHit("manual-ride", userId, 20, 3600);
  if (!budget.allowed) {
    return { ok: false as const, error: "Probeer het over een uur opnieuw." };
  }

  const { data: connection } = await supabase
    .from("strava_connections")
    .select("strava_athlete_id")
    .eq("profile_id", userId)
    .maybeSingle();
  const built = manualRideRow(input, userId, connection?.strava_athlete_id ?? undefined);
  if (!built.ok) return built;
  const row = built.row;

  // Dezelfde rit uit een andere bron (Strava, intervals.icu, een upload) staat
  // er al: dan niet nog eens. Dezelfde handmatige rit (zelfde id) overschrijft.
  const startMs = Date.parse(row.start_date);
  const { data: nearby, error: readError } = await supabase
    .from("strava_activities")
    .select("id, start_date, distance_m")
    .eq("profile_id", userId)
    .gte("start_date", new Date(startMs - 600_000).toISOString())
    .lte("start_date", new Date(startMs + 600_000).toISOString());
  if (readError) return { ok: false as const, error: readError.message };
  if ((nearby ?? []).some((ride) => String(ride.id) !== String(row.id) && isSameRide(ride, row))) {
    return { ok: false as const, error: "Deze rit staat er al." };
  }

  const { error } = await supabase.from("strava_activities").upsert(row, { onConflict: "id" });
  if (error) return { ok: false as const, error: error.message };

  await runAfterChange(userId, []);
  return { ok: true as const };
}

export async function deleteManualRide(id: number) {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false as const, error: "Niet ingelogd." };

  // Alleen een eigen handmatige rit; een rit uit een bestand of koppeling niet.
  const { data, error } = await supabase
    .from("strava_activities")
    .delete()
    .eq("id", id)
    .eq("profile_id", userId)
    .eq("raw->>import_source", MANUAL_IMPORT_SOURCE)
    .select("id");
  if (error) return { ok: false as const, error: error.message };
  if (!data || data.length === 0) return { ok: false as const, error: "Rit niet gevonden." };

  await runAfterChange(userId, [id]);
  return { ok: true as const };
}

/** Training afvinken of loslaten en badges bijwerken; een rit zonder spoor heeft niet meer nodig. */
async function runAfterChange(userId: string, removedActivityIds: number[]) {
  const admin = createAdminClient();
  await Promise.all([
    runPostSyncForProfile(admin, userId, null, {
      workoutCompletion: true,
      milestones: true,
      removedActivityIds,
    }).catch(() => null),
    awardCompletedAchievementWeeks(admin).catch(() => null),
  ]);
  revalidateRidePages();
}
