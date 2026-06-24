"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { awardCompletedAchievementWeeks } from "@/lib/achievements/awards";
import { evaluateMilestonesForUser } from "@/lib/achievements/milestone-evaluators";
import { syncStravaActivitiesForUser } from "@/lib/strava/client";
import { stravaActivitiesFromCsv } from "@/lib/strava/import";

const STRAVA_CSV_MAX_BYTES = 10 * 1024 * 1024;

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
    // De interactieve sync houden we licht: het zware na-sync-werk
    // (col-detector, segmenttijden, milestone-evaluators — die álle
    // activiteiten doorlopen) slaan we over, anders tikt het "klaar"-blok op
    // een grote historie tegen de ~10s Netlify-timeout (504 → "An unexpected
    // response..."). De gear-/onderhoud-sync draait wél (staat vooraan). Badges
    // en cols lopen via de cron en de knop "Badges herberekenen".
    const result = await syncStravaActivitiesForUser(supabase, user.id, {
      ...options,
      skipPostProcessing: true,
    });
    if (!result.ok) return result;

    // Weekly awards + revalidate alleen wanneer we klaar zijn met de
    // volledige sync (anders draaien we dit 10x voor één UI-update).
    if (result.done) {
      await awardCompletedAchievementWeeks(supabase).catch(() => null);
      revalidatePath("/achievements");
      revalidatePath("/dashboard");
      revalidatePath("/leden");
      revalidatePath("/profiel");
      revalidatePath("/profiel/segments");
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

      try {
        const { syncZwbSegmentsForUser } = await import("@/lib/segments/sync");
        await syncZwbSegmentsForUser(admin, stravaToken, user.id, {
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
    revalidatePath("/profiel/segments");
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

export async function importMyStravaCsv(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Kies activities.csv." };
  }
  if (file.size > STRAVA_CSV_MAX_BYTES) {
    return { ok: false as const, error: "CSV is te groot." };
  }

  try {
    const { data: connection } = await supabase
      .from("strava_connections")
      .select("strava_athlete_id")
      .eq("profile_id", user.id)
      .maybeSingle();

    const text = await file.text();
    const imported = stravaActivitiesFromCsv(
      text,
      user.id,
      connection?.strava_athlete_id,
    );

    if (imported.rows.length === 0) {
      return {
        ok: false as const,
        error: "Geen fietsritten gevonden in deze CSV.",
      };
    }

    for (let index = 0; index < imported.rows.length; index += 500) {
      const batch = imported.rows.slice(index, index + 500);
      const { error } = await supabase
        .from("strava_activities")
        .upsert(batch, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }

    const admin = createAdminClient();
    const [milestones, weekAwards] = await Promise.all([
      evaluateMilestonesForUser(admin, user.id),
      awardCompletedAchievementWeeks(admin).catch(() => ({ awarded: 0 })),
    ]);

    revalidatePath("/achievements");
    revalidatePath("/dashboard");
    revalidatePath("/leden");
    revalidatePath("/profiel");
    revalidatePath("/profiel/segments");
    revalidatePath("/stats");

    return {
      ok: true as const,
      imported: imported.rows.length,
      skippedRows: imported.skippedRows,
      skippedNonCycling: imported.skippedNonCycling,
      milestoneAwards: milestones.awarded,
      milestoneErrors: milestones.errors,
      weekAwards: weekAwards.awarded,
    };
  } catch (err) {
    return {
      ok: false as const,
      error:
        err instanceof Error
          ? err.message
          : "Strava CSV importeren faalde.",
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
