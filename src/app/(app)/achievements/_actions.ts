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

    // Watopia-kalibratie (best-effort) met Strava-token zodat ook
    // "Badges herberekenen" de virtuele col-coords kan vullen — niet
    // alleen de sync-flow.
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
        const token = await accessTokenFor(supabase, conn as any);
        await calibrateWatopiaCols(admin, token);
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

/**
 * Diagnose-actie voor de Watopia/Zwift-col-detectie. Vertelt precies
 * waar het misgaat: migraties, kalibratie, polyline-aanwezigheid en
 * coördinaat-overlap. Voert meteen een (re-)kalibratie uit met de
 * Strava-token zodat ook "Badges herberekenen" de coords kan vullen.
 */
export async function diagnoseWatopia(): Promise<
  { ok: true; report: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const admin = createAdminClient();
  const lines: string[] = [];

  // 1. Watopia-cols in de DB?
  const { data: watopiaCols } = await admin
    .from("cols")
    .select("slug, summit_lat, summit_lon, strava_segment_id")
    .eq("virtual", true);
  const wc = (watopiaCols ?? []) as Array<{
    slug: string;
    summit_lat: number | null;
    summit_lon: number | null;
    strava_segment_id: number | null;
  }>;
  lines.push(`Watopia-cols in DB: ${wc.length} (migratie 0048 ${wc.length > 0 ? "OK" : "NIET uitgerold!"})`);
  const calibrated = wc.filter((c) => c.summit_lat != null);
  lines.push(`Gekalibreerd (coords ingevuld): ${calibrated.length}/${wc.length}`);

  // 2. Kalibratie proberen met Strava-token
  const { data: conn } = await supabase
    .from("strava_connections")
    .select("profile_id, strava_athlete_id, access_token, refresh_token, expires_at")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!conn) {
    lines.push("Geen Strava-koppeling — kan niet kalibreren.");
  } else if (wc.length > 0 && calibrated.length < wc.length) {
    try {
      const { accessTokenFor } = await import("@/lib/strava/client");
      const { calibrateWatopiaCols } = await import("@/lib/cols/watopia");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = await accessTokenFor(supabase, conn as any);
      const res = await calibrateWatopiaCols(admin, token);
      lines.push(`Kalibratie nu uitgevoerd: ${res.calibrated} nieuwe coords opgehaald.`);
    } catch (err) {
      lines.push(
        `Kalibratie faalde: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // 3. VirtualRides + polyline-aanwezigheid
  const { data: vRides } = await admin
    .from("strava_activities")
    .select("id, raw")
    .eq("profile_id", user.id)
    .eq("sport_type", "VirtualRide")
    .order("start_date", { ascending: false })
    .limit(50);
  const rides = (vRides ?? []) as Array<{
    id: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raw: any;
  }>;
  const withPolyline = rides.filter(
    (r) => r.raw?.map?.summary_polyline || r.raw?.map?.polyline,
  );
  lines.push(
    `VirtualRides (laatste 50): ${rides.length}, met polyline: ${withPolyline.length}`,
  );

  // 4. Bbox van een sample-polyline vs gekalibreerde Alpe-coords
  if (withPolyline.length > 0) {
    try {
      const polyline = (await import("@mapbox/polyline")).default;
      const enc =
        withPolyline[0].raw.map.polyline ||
        withPolyline[0].raw.map.summary_polyline;
      const pts = polyline.decode(enc) as [number, number][];
      if (pts.length > 0) {
        const lats = pts.map((p) => p[0]);
        const lons = pts.map((p) => p[1]);
        lines.push(
          `Sample-rit polyline bbox: lat ${Math.min(...lats).toFixed(3)}..${Math.max(...lats).toFixed(3)}, lon ${Math.min(...lons).toFixed(3)}..${Math.max(...lons).toFixed(3)} (${pts.length} punten)`,
        );
      }
    } catch {
      lines.push("Kon sample-polyline niet decoderen.");
    }
  }
  const alpe = calibrated.find((c) => c.slug === "zwift-alpe-du-zwift");
  if (alpe) {
    lines.push(
      `Alpe du Zwift gekalibreerd op: lat ${alpe.summit_lat}, lon ${alpe.summit_lon}`,
    );
  }

  return { ok: true as const, report: lines.join("\n") };
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
