"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { awardCompletedAchievementWeeks } from "@/lib/achievements/awards";
import { syncStravaActivitiesForUser } from "@/lib/strava/client";

export async function syncMyStravaActivities() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  try {
    const result = await syncStravaActivitiesForUser(supabase, user.id);
    if (!result.ok) return result;

    await awardCompletedAchievementWeeks(supabase).catch(() => null);
    revalidatePath("/achievements");
    revalidatePath("/dashboard");
    revalidatePath("/leden");
    revalidatePath("/profiel");
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: me, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (error) return { ok: false as const, error: error.message };
  if (!me?.is_admin) {
    return { ok: false as const, error: "Alleen admins kunnen badges vastleggen." };
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
