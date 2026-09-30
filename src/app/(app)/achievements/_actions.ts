"use server";

import { revalidatePath } from "next/cache";
import { INTERVALS_RIDE_ID_CEILING } from "@/lib/intervals/ride-id";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { awardCompletedAchievementWeeks } from "@/lib/achievements/awards";
import { evaluateMilestonesForUser } from "@/lib/achievements/milestone-evaluators";
import { syncStravaActivitiesForUser } from "@/lib/strava/client";
import { runPostSyncForProfile } from "@/lib/strava/post-sync";
import { storeGpsEfforts } from "@/lib/segments/gps-sync";
import {
  planRideImport,
  type ExistingImportRide,
} from "@/lib/strava/import-merge";
import {
  stravaActivitiesFromCsv,
  stravaActivityFromGpx,
  timedTrackFromGpx,
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

type ExistingRideRow = {
  id: number | string;
  start_date: string;
  distance_m: number | string | null;
  import_source: string | null;
  track?: string | null;
};

const EXISTING_PAGE = 1000;

/**
 * Leest één bestand in: activities.csv of één GPX. Het nawerk (cols, ZWBlokken,
 * segmenten, badges) doet finishMyStravaImport, één keer na alle bestanden; per
 * bestand zou een bulkupload van GPX'en dat werk tientallen keren doen.
 */
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
    let withTracks = false;

    if (isGpx || /^\s*(?:<\?xml|<gpx)/i.test(text.slice(0, 300))) {
      const result = stravaActivityFromGpx(
        text,
        user.id,
        connection?.strava_athlete_id,
      );
      if (!result.ok) return { ok: false as const, error: result.error };
      rows = [result.row];
      withTracks = true;
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

    // Ritten die er al zijn onder een ander id: via Strava, intervals.icu of een
    // eerdere import. Het spoor alleen opvragen als er een GPX binnenkomt.
    const times = rows.map((row) => Date.parse(row.start_date)).filter(Number.isFinite);
    const existing: ExistingImportRide[] = [];
    if (times.length > 0) {
      const from = new Date(Math.min(...times) - 86400_000).toISOString();
      const to = new Date(Math.max(...times) + 86400_000).toISOString();
      const columns = withTracks
        ? "id, start_date, distance_m, import_source:raw->>import_source, track:raw->map->>summary_polyline"
        : "id, start_date, distance_m, import_source:raw->>import_source";
      for (let offset = 0; ; offset += EXISTING_PAGE) {
        const { data, error } = await supabase
          .from("strava_activities")
          .select(columns)
          .eq("profile_id", user.id)
          .gte("start_date", from)
          .lte("start_date", to)
          .order("id")
          .range(offset, offset + EXISTING_PAGE - 1);
        if (error) throw new Error(error.message);
        const page = (data ?? []) as unknown as ExistingRideRow[];
        existing.push(
          ...page.map((ride) => ({
            id: ride.id,
            start_date: ride.start_date,
            distance_m: ride.distance_m,
            import_source: ride.import_source,
            has_track: Boolean(ride.track),
          })),
        );
        if (page.length < EXISTING_PAGE) break;
      }
    }

    const plan = planRideImport(rows, existing);

    for (let index = 0; index < plan.upsert.length; index += 500) {
      const batch = plan.upsert.slice(index, index + 500);
      const { error } = await supabase
        .from("strava_activities")
        .upsert(batch, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }

    // Een GPX bij een rit uit activities.csv: het spoor erbij, en die rit
    // opnieuw door ZWBlokken (die werken incrementeel op blocks_processed_at).
    for (const attachment of plan.attach) {
      const { data: current, error: readError } = await supabase
        .from("strava_activities")
        .select("raw")
        .eq("id", attachment.id)
        .eq("profile_id", user.id)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      if (!current) continue;
      const raw = (current.raw ?? {}) as Record<string, unknown>;
      const { error } = await supabase
        .from("strava_activities")
        .update({
          raw: { ...raw, map: { summary_polyline: attachment.summaryPolyline } },
          blocks_processed_at: null,
          zwift_blocks_processed_at: null,
        })
        .eq("id", attachment.id)
        .eq("profile_id", user.id);
      if (error) throw new Error(error.message);
    }

    // Eigen segment- en coltijden uit het volledige spoor, op de rit waar de GPX
    // in terechtkwam (nieuw, of de CSV-rit die het spoor kreeg). Alleen hier is
    // het bestand met alle tijden er nog; bewaard wordt een uitgedunde lijn.
    let segmentEfforts = 0;
    const gpxRideId = withTracks ? (plan.upsert[0]?.id ?? plan.attach[0]?.id) : undefined;
    if (gpxRideId != null) {
      try {
        const stored = await storeGpsEfforts(
          createAdminClient(),
          user.id,
          gpxRideId,
          timedTrackFromGpx(text),
        );
        segmentEfforts = stored.segments + stored.cols;
      } catch {
        // Niet kritiek: de rit staat er; de tijden ontbreken dan.
      }
    }

    // Een import zonder Strava-id heeft een negatief id. Zonder deze stempel
    // vraagt de segment-inhaalslag hem bij Strava op en verwijdert hij de rit
    // na de 404, als het lid ook Strava gekoppeld heeft.
    await supabase
      .from("strava_activities")
      .update({ efforts_fetched_at: new Date().toISOString() })
      .eq("profile_id", user.id)
      .lt("id", 0)
      .gt("id", INTERVALS_RIDE_ID_CEILING)
      .is("efforts_fetched_at", null);

    return {
      ok: true as const,
      imported: plan.upsert.length,
      tracksAdded: plan.attach.length,
      segmentEfforts,
      skippedRows: skippedRows + plan.duplicates,
      skippedNonCycling,
    };
  } catch (err) {
    return {
      ok: false as const,
      error:
        err instanceof Error ? err.message : "Strava-import faalde.",
    };
  }
}

/**
 * Na het laatste bestand: cols, ZWB-segmenten (uit de cols), ZWBlokken,
 * afgeronde trainingen en badges. Zonder Strava-token, want alles hier leest
 * alleen de database. Wat ZWBlokken niet in één keer haalt, pakt de
 * backfill-cron op.
 */
export async function finishMyStravaImport() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  try {
    const admin = createAdminClient();
    const [postSync, weekAwards] = await Promise.all([
      runPostSyncForProfile(admin, user.id, null, {
        workoutCompletion: true,
        colsDetector: true,
        zwblokken: true,
        recomputeSegments: true,
        milestones: true,
      }),
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
      milestoneAwards: postSync.milestoneAwards,
      milestoneErrors: postSync.milestoneErrors,
      weekAwards: weekAwards.awarded,
    };
  } catch (err) {
    return {
      ok: false as const,
      error:
        err instanceof Error ? err.message : "Badges en cols bijwerken faalde.",
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
