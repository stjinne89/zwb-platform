"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { awardCompletedAchievementWeeks } from "@/lib/achievements/awards";
import { evaluateMilestonesForUser } from "@/lib/achievements/milestone-evaluators";
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

export async function recomputeMyMilestoneBadges() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: activity } = await supabase
    .from("strava_activities")
    .select("id")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!activity) {
    return {
      ok: false as const,
      error: "Nog geen Strava-ritten gevonden. Sync eerst je activiteiten.",
    };
  }

  try {
    const admin = createAdminClient();

    // Strava-token (eenmalig) voor Watopia-kalibratie + segmenttijden.
    let stravaToken: string | null = null;
    try {
      const { data: conn } = await supabase
        .from("strava_connections")
        .select(
          "profile_id, strava_athlete_id, access_token, refresh_token, expires_at",
        )
        .eq("profile_id", user.id)
        .maybeSingle();
      if (conn) {
        const { accessTokenFor } = await import("@/lib/strava/client");
        const { calibrateWatopiaCols } = await import("@/lib/cols/watopia");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stravaToken = await accessTokenFor(supabase, conn as any);
        await calibrateWatopiaCols(admin, stravaToken);
      }
    } catch {
      // niet kritiek
    }

    // Eerst col-detector draaien (full scan, geen activityIds-filter)
    // zodat A013-A019/A095 over actuele climbed-cols beschikken.
    try {
      const { syncClimbedColsForUser } = await import("@/lib/cols/detector");
      await syncClimbedColsForUser(admin, user.id);
    } catch {
      // niet kritiek; evaluators draaien sowieso
    }

    // Segmenttijden per col ophalen (begrensd per run i.v.m. rate-limit;
    // backfilt over meerdere klikken). Voedt PR-tijden + A083 sub-75/60.
    if (stravaToken) {
      try {
        const { syncColSegmentTimesForUser } = await import(
          "@/lib/cols/segment-times"
        );
        await syncColSegmentTimesForUser(admin, stravaToken, user.id, {
          maxFetches: 40,
        });
      } catch {
        // niet kritiek; evaluators draaien sowieso
      }
    }

    const result = await evaluateMilestonesForUser(admin, user.id);
    revalidatePath("/achievements");
    revalidatePath("/dashboard");
    revalidatePath("/leden");
    revalidatePath("/profiel");
    return {
      ok: true as const,
      awarded: result.awarded,
      skipped: result.skipped,
      errors: result.errors,
    };
  } catch (err) {
    return {
      ok: false as const,
      error:
        err instanceof Error
          ? err.message
          : "Milestonebadges herberekenen faalde.",
    };
  }
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
