"use server";

// Een dubbele opname van een rit weghalen: Zwift én een horloge, beide naar
// Strava. De rit gaat weg en zijn id komt in strava_activity_dismissals (0310),
// zodat de volgende sync hem niet terugzet. Alleen een eigen rit die een andere
// eigen rit overlapt (isDuplicateRecording); een losse rit blijft staan.

import { revalidatePath } from "next/cache";
import { awardCompletedAchievementWeeks } from "@/lib/achievements/awards";
import { rateLimitHit } from "@/lib/rate-limit";
import { isDuplicateRecording } from "@/lib/rides/same-ride";
import { runPostSyncForProfile } from "@/lib/strava/post-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const RIDE_COLUMNS = "id, start_date, distance_m, moving_time_seconds";
const DAY_MS = 86_400_000;

type RideRow = {
  id: number;
  start_date: string;
  distance_m: number | string | null;
  moving_time_seconds: number | null;
};

export async function deleteDuplicateRide(id: number) {
  if (!Number.isSafeInteger(id)) return { ok: false as const, error: "Rit niet gevonden." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  const userId = user.id;

  const budget = await rateLimitHit("duplicate-ride", userId, 20, 3600);
  if (!budget.allowed) {
    return { ok: false as const, error: "Probeer het over een uur opnieuw." };
  }

  const admin = createAdminClient();
  const { data: ride } = await admin
    .from("strava_activities")
    .select(RIDE_COLUMNS)
    .eq("id", id)
    .eq("profile_id", userId)
    .maybeSingle();
  if (!ride) return { ok: false as const, error: "Rit niet gevonden." };

  const start = Date.parse((ride as RideRow).start_date);
  const { data: nearby, error: readError } = await admin
    .from("strava_activities")
    .select(RIDE_COLUMNS)
    .eq("profile_id", userId)
    .neq("id", id)
    .gte("start_date", new Date(start - DAY_MS).toISOString())
    .lte("start_date", new Date(start + DAY_MS).toISOString());
  if (readError) return { ok: false as const, error: readError.message };
  if (!((nearby ?? []) as RideRow[]).some((other) => isDuplicateRecording(ride as RideRow, other))) {
    return { ok: false as const, error: "Geen dubbele rit gevonden." };
  }

  // Eerst de markering: zonder die zet de volgende sync de rit terug.
  const { error: dismissError } = await admin
    .from("strava_activity_dismissals")
    .upsert({ profile_id: userId, activity_id: id }, { onConflict: "profile_id,activity_id" });
  if (dismissError) return { ok: false as const, error: "Verwijderen mislukt." };

  const { error } = await admin
    .from("strava_activities")
    .delete()
    .eq("id", id)
    .eq("profile_id", userId);
  if (error) return { ok: false as const, error: error.message };

  // removedActivityIds laat de training los; de detectie hangt daarna de rit die
  // bleef eraan. Coltijden van de weggehaalde rit worden herberekend.
  await Promise.all([
    runPostSyncForProfile(admin, userId, null, {
      workoutCompletion: true,
      milestones: true,
      removedActivityIds: [id],
    }).catch(() => null),
    awardCompletedAchievementWeeks(admin).catch(() => null),
  ]);
  revalidatePath("/zwbeter-worden", "layout");
  for (const path of ["/dashboard", "/stats/rankings", "/stats", "/leden", "/profiel"]) {
    revalidatePath(path);
  }
  return { ok: true as const };
}
