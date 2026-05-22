"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { awardCompletedAchievementWeeks } from "@/lib/achievements/awards";
import { syncStravaActivitiesForUser } from "@/lib/strava/client";

export async function syncMyStravaActivities(
  options: {
    fullBackfill?: boolean;
    startPage?: number;
    afterTs?: number;
    chunkPages?: number;
  } = {},
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  try {
    const result = await syncStravaActivitiesForUser(supabase, user.id, options);
    if (!result.ok) return result;

    // Weekly awards + revalidate alleen wanneer we klaar zijn met de
    // volledige sync (anders draaien we dit 10x voor één UI-update).
    if (result.done) {
      await awardCompletedAchievementWeeks(supabase).catch(() => null);
      revalidatePath("/achievements");
      revalidatePath("/dashboard");
      revalidatePath("/leden");
      revalidatePath("/profiel");
    }
    return result;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Strava sync faalde.",
    };
  }
}

export async function disconnectStrava() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("strava_connections")
    .delete()
    .eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/achievements");
  revalidatePath("/profiel");
  return { ok: true as const };
}

export async function finalizeAchievementAwards() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("achievements.finalize")) {
    return { ok: false as const, error: "Geen recht om badges vast te leggen." };
  }

  try {
    const result = await awardCompletedAchievementWeeks(supabase);
    revalidatePath("/achievements");
    revalidatePath("/leden");
    revalidatePath("/profiel");
    return { ok: true as const, awarded: result.awarded };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Badges vastleggen faalde.",
    };
  }
}
