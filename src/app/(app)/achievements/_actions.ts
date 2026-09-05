"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { awardCompletedAchievementWeeks } from "@/lib/achievements/awards";
import { evaluateMilestonesForUser } from "@/lib/achievements/milestone-evaluators";
import { syncStravaActivitiesForUser } from "@/lib/strava/client";
import {
  stravaActivitiesFromCsv,
  stravaActivityFromGpx,
  type ImportedStravaActivity,
} from "@/lib/strava/import";

// Gelijk aan serverActions.bodySizeLimit in next.config.ts.
const STRAVA_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

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

/**
 * Ontkoppelen deed tot nu toe alleen een lokale delete. Daardoor bleef de grant op
 * Strava's kant bestaan en bleef de atleet een plek in onze athlete cap bezetten —
 * permanent, want de rij met de token was net weg. Nu trekken we de toestemming
 * eerst bij Strava in, wissen we de ruwe Strava-data (API Agreement) en pas dan de
 * rij.
 *
 * Lukt de call bij Strava niet, dan blijft de koppeling gemarkeerd staan: de app
 * negeert 'm vanaf nu, en de nachtelijke sweeper probeert het opnieuw.
 */
export async function disconnectStrava() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const admin = createAdminClient();
  const { revokeAndCleanupStravaConnection } = await import("@/lib/strava/sweep");
  const result = await revokeAndCleanupStravaConnection(admin, user.id, "member");

  revalidatePath("/achievements");
  revalidatePath("/profiel");

  if (!result.deauthorized) {
    return {
      ok: true as const,
      pending: true as const,
      message:
        "Strava is losgekoppeld in de app. De toestemming bij Strava zelf ruimen we vannacht op.",
    };
  }

  return { ok: true as const, pending: false as const };
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

export async function importMyStravaFile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false as const,
      error: "Kies activities.csv of een GPX-bestand.",
    };
  }
  const isGpx =
    /\.gpx$/i.test(file.name) || /xml|gpx/i.test(file.type);
  if (file.size > STRAVA_UPLOAD_MAX_BYTES) {
    return { ok: false as const, error: "Bestand is te groot (max 10 MB)." };
  }

  try {
    const { data: connection } = await supabase
      .from("strava_connections")
      .select("strava_athlete_id")
      .eq("profile_id", user.id)
      .maybeSingle();

    const text = await file.text();

    let rows: ImportedStravaActivity[];
    let skippedRows = 0;
    let skippedNonCycling = 0;

    if (isGpx || /^\s*(?:<\?xml|<gpx)/i.test(text.slice(0, 300))) {
      const result = stravaActivityFromGpx(
        text,
        user.id,
        connection?.strava_athlete_id,
      );
      if (!result.ok) return { ok: false as const, error: result.error };
      rows = [result.row];
    } else {
      const imported = stravaActivitiesFromCsv(
        text,
        user.id,
        connection?.strava_athlete_id,
      );

      if (imported.rows.length === 0) {
        return {
          ok: false as const,
          error:
            imported.totalRows === 0
              ? "Geen activiteiten gevonden. Gebruik activities.csv uit je Strava-export."
              : `Geen fietsritten gevonden in deze CSV (${imported.totalRows} regels gelezen). Gebruik activities.csv uit je Strava-export; zie de hulp-pagina.`,
        };
      }
      rows = imported.rows;
      skippedRows = imported.skippedRows;
      skippedNonCycling = imported.skippedNonCycling;
    }

    for (let index = 0; index < rows.length; index += 500) {
      const batch = rows.slice(index, index + 500);
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
      imported: rows.length,
      skippedRows,
      skippedNonCycling,
      milestoneAwards: milestones.awarded,
      milestoneErrors: milestones.errors,
      weekAwards: weekAwards.awarded,
    };
  } catch (err) {
    return {
      ok: false as const,
      error:
        err instanceof Error ? err.message : "Strava-import faalde.",
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
