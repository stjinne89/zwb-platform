"use server";

// Een training gereden, maar het bestand ging verloren (opname mislukt, toestel
// leeg): de rit zelf invullen bij die training. De rij bouwt manualRideRow; hier
// opslaan, aan de training hangen (relinkRide) en het nawerk dat een rit zonder
// spoor nodig heeft: badges.

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
import { reassignCandidates, relinkRide } from "@/lib/training/completion";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

function revalidateRidePages() {
  revalidatePath("/zwbeter-worden", "layout");
  for (const path of ["/dashboard", "/stats/rankings", "/stats", "/leden", "/profiel"]) {
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

export async function saveManualRide(workoutId: string, input: ManualRideInput) {
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

  // Vooraf dezelfde toets als relinkRide, zodat er geen losse rit achterblijft
  // als hij niet bij de training kan horen.
  const admin = createAdminClient();
  const { data: workout } = await admin
    .from("training_workouts")
    .select("id, scheduled_at, title, status, intensity, origin")
    .eq("id", workoutId)
    .eq("profile_id", userId)
    .is("superseded_at", null)
    .maybeSingle();
  if (!workout) return { ok: false as const, error: "Die training is niet gevonden." };
  const rideDayKey = amsterdamDayKey(new Date(row.start_date));
  if (reassignCandidates([workout], rideDayKey, "", new Set()).length === 0) {
    return {
      ok: false as const,
      error:
        workout.status === "planned"
          ? "Deze datum past niet bij de training."
          : "Deze training is al afgerond.",
    };
  }

  // Dezelfde rit uit een andere bron (Strava, intervals.icu, een upload) staat
  // er al: dan die rit koppelen, niet nog eens invoeren.
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
  const existed = (nearby ?? []).some((ride) => String(ride.id) === String(row.id));

  const { error } = await supabase.from("strava_activities").upsert(row, { onConflict: "id" });
  if (error) return { ok: false as const, error: error.message };

  const linked = await relinkRide(admin, {
    profileId: userId,
    activityId: String(row.id),
    toWorkoutId: workoutId,
  });
  if (!linked.ok) {
    if (!existed) await supabase.from("strava_activities").delete().eq("id", row.id);
    return { ok: false as const, error: linked.error };
  }

  await runAfterChange(admin, userId, []);
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

  // removedActivityIds laat de training los; die staat daarna weer open.
  await runAfterChange(createAdminClient(), userId, [id]);
  return { ok: true as const };
}

async function runAfterChange(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  removedActivityIds: number[],
) {
  await Promise.all([
    runPostSyncForProfile(admin, userId, null, {
      milestones: true,
      removedActivityIds,
    }).catch(() => null),
    awardCompletedAchievementWeeks(admin).catch(() => null),
  ]);
  revalidateRidePages();
}
