"use server";

import { gunzipSync } from "node:zlib";
import { revalidatePath } from "next/cache";
import { INTERVALS_RIDE_ID_CEILING } from "@/lib/intervals/ride-id";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { rateLimitHit } from "@/lib/rate-limit";
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
  stravaActivityFromFit,
  stravaActivityFromGpx,
  timedTrackFromGpx,
  type ImportedStravaActivity,
} from "@/lib/strava/import";
import { looksLikeFit } from "@/lib/strava/fit";
import type { TimedPoint } from "@/lib/segments/gps-efforts";

// Gelijk aan serverActions.bodySizeLimit in next.config.ts.
const STRAVA_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
// Een gezipt bestand mag uitgepakt niet eindeloos groot worden.
const UNZIPPED_MAX_BYTES = 50 * 1024 * 1024;

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
      revalidatePath("/profiel/segments/collecties");
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
export async function disconnectStrava(options: { keepData?: boolean } = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const admin = createAdminClient();
  const { revokeAndCleanupStravaConnection } = await import("@/lib/strava/sweep");
  const result = await revokeAndCleanupStravaConnection(
    admin,
    user.id,
    options.keepData === true ? "member_keep_data" : "member",
  );

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

    // Het Strava-deel (Watopia-kalibratie, coltijden, segment-PR's) kost tot
    // ~150 calls op een daglimiet van 2000, en elk lid kan deze knop indrukken.
    // Daarom één keer per dag per lid; de badges zelf rekenen altijd opnieuw,
    // want dat leest alleen de database.
    const strava = await rateLimitHit(
      "badges_recompute_strava",
      user.id,
      1,
      24 * 60 * 60,
    );

    // Strava-token (eenmalig) voor Watopia-kalibratie + segmenttijden.
    let stravaToken: string | null = null;
    try {
      const { data: conn } = strava.allowed
        ? await supabase
            .from("strava_connections")
            .select(
              "profile_id, strava_athlete_id, access_token, refresh_token, expires_at",
            )
            .eq("profile_id", user.id)
            .maybeSingle()
        : { data: null };
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
          resolveCandidates: 3,
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
    revalidatePath("/profiel/segments/collecties");
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
 * Leest de bestanden van één aanroep in: activities.csv, GPX of FIT (ook
 * .fit.gz). De browser stuurt er een paar per keer en krijgt per bestand een
 * uitkomst terug, zodat één kapot bestand de rest niet tegenhoudt. Het nawerk
 * (cols, ZWBlokken, segmenten, badges) doet finishMyStravaImport, één keer na
 * alle bestanden; per bestand zou een bulkupload dat werk tientallen keren doen.
 */
export async function importMyStravaFiles(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const files = formData
    .getAll("file")
    .filter((file): file is File => file instanceof File && file.size > 0);
  if (files.length === 0) {
    return {
      ok: false as const,
      error: "Kies activities.csv, een GPX- of een FIT-bestand.",
    };
  }
  if (files.reduce((total, file) => total + file.size, 0) > STRAVA_UPLOAD_MAX_BYTES) {
    return { ok: false as const, error: "Bestand is te groot (max 10 MB)." };
  }

  const { data: connection } = await supabase
    .from("strava_connections")
    .select("strava_athlete_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  // Tegelijk: de client handelt server actions één voor één af, dus hier zit de
  // enige winst bij een map met honderden ritten.
  const results = await Promise.all(
    files.map((file) => importOneFile(supabase, user.id, connection?.strava_athlete_id, file)),
  );
  return { ok: true as const, results };
}

async function importOneFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  athleteId: number | string | undefined,
  file: File,
) {
  const isGpx =
    /\.gpx$/i.test(file.name) || /xml|gpx/i.test(file.type);

  try {
    // De Strava-export bewaart de meeste ritten gezipt (.fit.gz).
    let bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      bytes = new Uint8Array(gunzipSync(bytes, { maxOutputLength: UNZIPPED_MAX_BYTES }));
    }
    const isFit = looksLikeFit(bytes);
    const text = isFit ? "" : new TextDecoder().decode(bytes);

    let rows: ImportedStravaActivity[];
    let skippedRows = 0;
    let skippedNonCycling = 0;
    let withTracks = false;
    // Het volledige spoor met tijden, voor de eigen segment- en coltijden.
    let timedTrack: TimedPoint[] | null = null;

    if (isFit) {
      const result = stravaActivityFromFit(
        bytes,
        profileId,
        athleteId,
      );
      if (!result.ok) {
        // Een map vol exportbestanden bevat ook hardloopjes en ritten zonder
        // GPS; die zijn geen mislukte upload.
        if (!result.skip) return { ok: false as const, error: result.error };
        return {
          ok: true as const,
          imported: 0,
          tracksAdded: 0,
          segmentEfforts: 0,
          skippedRows: 0,
          skippedNoTrack: result.skip === "no_track" ? 1 : 0,
          skippedNonCycling: result.skip === "non_cycling" ? 1 : 0,
        };
      }
      rows = [result.row];
      withTracks = true;
      timedTrack = result.track;
    } else if (/<TrainingCenterDatabase[\s>]/.test(text.slice(0, 1000))) {
      // TCX lezen we niet. In de map van een Strava-export staan ze tussen de
      // FIT-bestanden; overslaan, niet als fout melden.
      return {
        ok: true as const,
        imported: 0,
        tracksAdded: 0,
        segmentEfforts: 0,
        skippedRows: 1,
        skippedNoTrack: 0,
        skippedNonCycling: 0,
      };
    } else if (isGpx || /^\s*(?:<\?xml|<gpx)/i.test(text.slice(0, 300))) {
      const result = stravaActivityFromGpx(
        text,
        profileId,
        athleteId,
      );
      if (!result.ok) return { ok: false as const, error: result.error };
      rows = [result.row];
      withTracks = true;
      timedTrack = timedTrackFromGpx(text);
    } else {
      const imported = stravaActivitiesFromCsv(
        text,
        profileId,
        athleteId,
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
          .eq("profile_id", profileId)
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

    // Een GPX of FIT bij een rit uit activities.csv: het spoor erbij, en die rit
    // opnieuw door ZWBlokken (die werken incrementeel op blocks_processed_at).
    for (const attachment of plan.attach) {
      const { data: current, error: readError } = await supabase
        .from("strava_activities")
        .select("raw")
        .eq("id", attachment.id)
        .eq("profile_id", profileId)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      if (!current) continue;
      const raw = (current.raw ?? {}) as Record<string, unknown>;
      const { error } = await supabase
        .from("strava_activities")
        .update({
          raw: {
            ...raw,
            map: { summary_polyline: attachment.summaryPolyline },
            ...(attachment.deviceName && !raw.device_name
              ? { device_name: attachment.deviceName }
              : {}),
          },
          blocks_processed_at: null,
          zwift_blocks_processed_at: null,
        })
        .eq("id", attachment.id)
        .eq("profile_id", profileId);
      if (error) throw new Error(error.message);
    }

    // Eigen segment- en coltijden uit het volledige spoor, op de rit waar het
    // bestand in terechtkwam (nieuw, of de CSV-rit die het spoor kreeg). Alleen
    // hier is het bestand met alle tijden er nog; bewaard wordt een uitgedunde lijn.
    let segmentEfforts = 0;
    const trackRideId = timedTrack ? (plan.upsert[0]?.id ?? plan.attach[0]?.id) : undefined;
    if (timedTrack && trackRideId != null) {
      try {
        const stored = await storeGpsEfforts(
          createAdminClient(),
          profileId,
          trackRideId,
          timedTrack,
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
      .eq("profile_id", profileId)
      .lt("id", 0)
      .gt("id", INTERVALS_RIDE_ID_CEILING)
      .is("efforts_fetched_at", null);

    return {
      ok: true as const,
      imported: plan.upsert.length,
      tracksAdded: plan.attach.length,
      segmentEfforts,
      skippedRows: skippedRows + plan.duplicates,
      skippedNoTrack: 0,
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
 * alleen de database. ZWBlokken doet hier hooguit 500 ritten; de rest haalt het
 * formulier op met syncMyBlocks. Een cron die dat overneemt is er niet.
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
    revalidatePath("/profiel/segments/collecties");
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

/**
 * ZWBlokken verder bijwerken na een grote import: 500 ritten per aanroep, buiten
 * en Zwift. Het formulier herhaalt dit tot `remaining` false is.
 */
export async function syncMyBlocks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  try {
    const admin = createAdminClient();
    const { syncBlocksForUser } = await import("@/lib/zwblokken/sync");
    const { syncZwiftBlocksForUser } = await import("@/lib/zwblokken/zwift-sync");
    const [outside, zwift] = await Promise.all([
      syncBlocksForUser(admin, user.id),
      syncZwiftBlocksForUser(admin, user.id),
    ]);
    if (!outside.remaining && !zwift.remaining) revalidatePath("/zwblokken");
    return { ok: true as const, remaining: outside.remaining || zwift.remaining };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "ZWBlokken bijwerken faalde.",
    };
  }
}
