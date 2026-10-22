// Het powerprofiel van één lid ophalen bij intervals.icu en vastleggen in
// rider_power_profiles (en CP/W'/zones in profile_sport_settings). Gebruikt door
// de knop op Teams (teams/_actions.ts) en de wekelijkse job van ZWBriljant.

import {
  athletePhysique,
  fetchIntervalsAthlete,
  fetchIntervalsPowerCurve,
  fetchIntervalsWellness,
  latestWellnessValue,
  rideSportSettings,
} from "@/lib/intervals/client";
import { powerProfilePayload, wattsAtDuration } from "@/lib/teams/power-profile";

export type IntervalsConnectionRow = {
  profile_id: string;
  athlete_id: string | null;
  api_key: string;
  profiles?: ConnectionProfile | ConnectionProfile[] | null;
};

type ConnectionProfile = {
  ftp_watts?: number | null;
  weight_kg?: number | string | null;
  auto_sync_physique?: boolean | null;
};

function connectionProfile(connection: IntervalsConnectionRow) {
  return Array.isArray(connection.profiles)
    ? connection.profiles[0] ?? null
    : connection.profiles ?? null;
}

function numberOrNull(value: unknown) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function compactCurvePoints(points: Awaited<ReturnType<typeof fetchIntervalsPowerCurve>>["points"]) {
  return points
    .map((point) => {
      const seconds = Number(point.seconds);
      const watts = Number(point.watts);
      const wattsPerKg = Number(point.wattsPerKg);
      if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(watts) || watts <= 0) {
        return null;
      }
      return {
        seconds: Math.round(seconds),
        watts: Math.round(watts),
        wattsPerKg:
          Number.isFinite(wattsPerKg) && wattsPerKg > 0
            ? Number(wattsPerKg.toFixed(3))
            : null,
      };
    })
    .filter((point): point is { seconds: number; watts: number; wattsPerKg: number | null } =>
      point != null,
    );
}

function compactFatigueCurves(
  curves: Awaited<ReturnType<typeof fetchIntervalsPowerCurve>>["fatigueCurves"],
) {
  return curves.flatMap((curve) => {
    const points = compactCurvePoints(curve.points);
    return points.length > 1 ? [{ afterKj: curve.afterKj, points }] : [];
  });
}
export async function syncOnePowerProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  connection: IntervalsConnectionRow,
) {
  const athleteId = connection.athlete_id;
  if (!athleteId) {
    const { error } = await supabase.from("rider_power_profiles").upsert({
      profile_id: connection.profile_id,
      athlete_id: null,
      period: "90d",
      sync_status: "error",
      sync_error: "Intervals athlete_id ontbreekt.",
      synced_at: new Date().toISOString(),
    });
    return {
      ok: false,
      profileId: connection.profile_id,
      error: error?.message ?? "Intervals athlete_id ontbreekt.",
    };
  }

  try {
    const [curve, athlete, wellness, latestTest] = await Promise.all([
      fetchIntervalsPowerCurve(connection.api_key, athleteId, "90d", {
        includeFatigue: true,
      }),
      fetchIntervalsAthlete(connection.api_key).catch(() => null),
      fetchIntervalsWellness(connection.api_key, athleteId, 30).catch(() => []),
      supabase
        .from("training_ftp_tests")
        .select("ftp_watts")
        .eq("profile_id", connection.profile_id)
        .order("tested_on", { ascending: false })
        .limit(1)
        .then(({ data }: { data: { ftp_watts: number | null }[] | null }) => data?.[0] ?? null),
    ]);
    const watts15s = wattsAtDuration(curve.points, 15);
    const watts30s = wattsAtDuration(curve.points, 30);
    const watts1m = wattsAtDuration(curve.points, 60);
    const watts2m = wattsAtDuration(curve.points, 120);
    const watts5m = wattsAtDuration(curve.points, 300);
    const watts10m = wattsAtDuration(curve.points, 600);
    const watts20m = wattsAtDuration(curve.points, 1200);
    const profile = connectionProfile(connection);
    const athleteDefaults = athletePhysique(athlete);
    const testFtp = numberOrNull(latestTest?.ftp_watts);
    const eftpWatts =
      numberOrNull(curve.ftpWatts) ??
      latestWellnessValue(wellness, "eftp") ??
      athleteDefaults.eftpWatts;
    // Voorrang: de laatste FTP-test, dan de ingestelde FTP in intervals.icu, dan
    // de eFTP, dan het profiel. Dezelfde volgorde als /zwbeter-worden/vermogen.
    const payload = powerProfilePayload({
      ftpWatts:
        testFtp ??
        athleteDefaults.ftpWatts ??
        eftpWatts ??
        numberOrNull(profile?.ftp_watts) ??
        watts20m ??
        null,
      weightKg:
        athleteDefaults.weightKg ??
        latestWellnessValue(wellness, "weight") ??
        numberOrNull(profile?.weight_kg),
      watts15s,
      watts30s,
      watts1m,
      watts2m,
      watts5m,
      watts10m,
      watts20m,
    });
    const hasCurve = Boolean(watts15s || watts30s || watts1m || watts2m || watts5m || watts10m || watts20m);
    const hasFallback = Boolean(payload.ftp_watts || payload.weight_kg);

    // CP, W' en zones vastleggen; die zitten al in het athlete-antwoord.
    const rideSettings = rideSportSettings(athlete);
    if (rideSettings) {
      await supabase.from("profile_sport_settings").upsert({
        profile_id: connection.profile_id,
        ftp_watts: numberOrNull(rideSettings.ftp),
        cp_watts: numberOrNull(rideSettings.cp),
        w_prime_joules: numberOrNull(rideSettings.w_prime),
        lthr: numberOrNull(rideSettings.lthr),
        max_hr: numberOrNull(rideSettings.max_hr),
        power_zones: rideSettings.power_zones ?? null,
        hr_zones: rideSettings.hr_zones ?? null,
        power_zone_names: rideSettings.power_zone_names ?? null,
        synced_at: new Date().toISOString(),
      });
    }

    // Opt-in: het lid laat FTP en gewicht in het profiel meelopen met intervals.
    if (profile?.auto_sync_physique) {
      const physique: Record<string, number> = {};
      // Heeft het lid een testuitslag, dan houdt het profiel die vast tot de
      // volgende test. Anders neemt het profiel de ingestelde FTP over; de eFTP
      // is een schatting en wordt nooit weggeschreven (sinds 2026-10-22).
      const syncedFtp = latestTest ? null : athleteDefaults.ftpWatts;
      const syncedWeight = latestWellnessValue(wellness, "weight") ?? athleteDefaults.weightKg;
      if (syncedFtp) physique.ftp_watts = Math.round(syncedFtp);
      if (syncedWeight) physique.weight_kg = Math.round(syncedWeight * 10) / 10;
      if (Object.keys(physique).length > 0) {
        await supabase.from("profiles").update(physique).eq("id", connection.profile_id);
      }
    }

    const profileRow = {
      profile_id: connection.profile_id,
      athlete_id: athleteId,
      period: curve.period,
      source: "intervals",
      ...payload,
      curve_points: compactCurvePoints(curve.points),
      curve_points_fatigue: compactFatigueCurves(curve.fatigueCurves),
      sync_status: hasCurve ? "ok" : hasFallback ? "partial" : "error",
      sync_error: hasCurve
        ? null
        : `Geen powercurve-punten gevonden in Intervals (${curve.debug ?? "onbekend antwoord"}).`,
      synced_at: new Date().toISOString(),
    };
    // Databases zonder de curve-migraties kennen die kolommen niet; dan slaan we
    // eerst de vermoeide curves over en daarna de hele curve.
    let { error } = await supabase.from("rider_power_profiles").upsert(profileRow);
    for (const skipped of [["curve_points_fatigue"], ["curve_points_fatigue", "curve_points"]]) {
      if (!error?.message.includes("curve_points")) break;
      const trimmedRow = Object.fromEntries(
        Object.entries(profileRow).filter(([key]) => !skipped.includes(key)),
      );
      ({ error } = await supabase.from("rider_power_profiles").upsert(trimmedRow));
    }
    if (error) throw new Error(error.message);
    return {
      ok: hasCurve,
      partial: !hasCurve && hasFallback,
      profileId: connection.profile_id,
      error: hasCurve
        ? undefined
        : `Geen powercurve-punten gevonden; alleen FTP/gewicht fallback bijgewerkt.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende Intervals-fout.";
    const { error } = await supabase.from("rider_power_profiles").upsert({
      profile_id: connection.profile_id,
      athlete_id: athleteId,
      period: "90d",
      sync_status: "error",
      sync_error: message.slice(0, 500),
      synced_at: new Date().toISOString(),
    });
    return {
      ok: false,
      profileId: connection.profile_id,
      error: error ? `${message} Opslaan faalde: ${error.message}` : message,
    };
  }
}
