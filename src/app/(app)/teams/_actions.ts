"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  fetchIntervalsAthlete,
  fetchIntervalsPowerCurve,
  fetchIntervalsWellness,
} from "@/lib/intervals/client";
import { syncTeamResults } from "@/lib/team-results/sync";
import { fetchLadderGraveyard, normalizeTeamName } from "@/lib/ladder";
import {
  powerProfilePayload,
  wattsAtDuration,
} from "@/lib/teams/power-profile";

type IntervalsConnectionRow = {
  profile_id: string;
  athlete_id: string | null;
  api_key: string;
  profiles?:
    | {
        ftp_watts?: number | null;
        weight_kg?: number | string | null;
      }
    | Array<{
        ftp_watts?: number | null;
        weight_kg?: number | string | null;
      }>
    | null;
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

function athleteFallbacks(athlete: Awaited<ReturnType<typeof fetchIntervalsAthlete>> | null) {
  const rideSettings = athlete?.sportSettings?.find((settings) =>
    settings.types?.some((type) => /ride/i.test(type)),
  );
  return {
    ftpWatts:
      numberOrNull(rideSettings?.mmp_model?.ftp) ??
      numberOrNull(rideSettings?.ftp) ??
      numberOrNull(rideSettings?.indoor_ftp) ??
      numberOrNull(athlete?.ftp),
    weightKg: numberOrNull(rideSettings?.weight) ?? numberOrNull(athlete?.weight),
  };
}

export async function syncResultsNow() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("teams.sync_sources")) {
    return { ok: false as const, error: "Geen recht om teambronnen te syncen." };
  }

  try {
    const admin = createAdminClient();
    const { data: zrlSeeded, error: zrlSeedError } = await admin.rpc(
      "sync_all_zrl_parent_team_memberships",
    );
    if (zrlSeedError) throw new Error(zrlSeedError.message);
    const { data: zrlRosterSeeded, error: zrlRosterSeedError } = await admin.rpc(
      "sync_zrl_parent_roster_entries",
    );
    if (zrlRosterSeedError) throw new Error(zrlRosterSeedError.message);
    const summary = await syncTeamResults(supabase);
    revalidatePath("/teams");
    revalidatePath("/dashboard");
    revalidatePath("/");
    return {
      ok: true as const,
      summary: {
        ...summary,
        zrlSeeded: Number(zrlSeeded ?? 0),
        zrlRosterSeeded: Number(zrlRosterSeeded ?? 0),
      },
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Onbekende sync-fout.",
    };
  }
}

export async function syncLadderGraveyard() {
  const cookie = process.env.LADDER_COOKIE;
  if (!cookie) {
    return {
      ok: false as const,
      error:
        "LADDER_COOKIE ontbreekt. Log in op ladder.cycleracing.club, kopieer de connect.sid cookie (DevTools → Application → Cookies) en zet hem in .env.local + Netlify env.",
    };
  }

  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("teams.sync_sources")) {
    return { ok: false as const, error: "Geen recht om teambronnen te syncen." };
  }

  let result;
  try {
    result = await fetchLadderGraveyard(cookie);
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Onbekende ladder-fout.",
    };
  }

  // Haal alle ZWB-teams op, normaliseer namen voor matching.
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, is_graveyard, type");
  if (teamsError) return { ok: false as const, error: teamsError.message };

  const graveyardNormalized = new Set(result.teamNames.map(normalizeTeamName));

  let toGraveyard = 0;
  let toActive = 0;
  const matched: string[] = [];

  for (const team of teams ?? []) {
    const normalized = normalizeTeamName(team.name);
    const inGraveyard = graveyardNormalized.has(normalized);

    if (inGraveyard) matched.push(team.name);

    // Update alleen ladder-type teams (anders zou een ZRL-team per ongeluk
    // gegraveyard worden als er een toevallige naam-match is).
    if (team.type !== "ladder") continue;

    if (inGraveyard && !team.is_graveyard) {
      const { error } = await supabase
        .from("teams")
        .update({ is_graveyard: true })
        .eq("id", team.id);
      if (!error) toGraveyard++;
    } else if (!inGraveyard && team.is_graveyard) {
      const { error } = await supabase
        .from("teams")
        .update({ is_graveyard: false })
        .eq("id", team.id);
      if (!error) toActive++;
    }
  }

  revalidatePath("/teams");
  revalidatePath("/dashboard");

  return {
    ok: true as const,
    foundOnLadder: result.teamNames.length,
    matchedZwbTeams: matched,
    toGraveyard,
    toActive,
  };
}

async function syncOnePowerProfile(
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
    const [curve, athlete, wellness] = await Promise.all([
      fetchIntervalsPowerCurve(connection.api_key, athleteId, "90d"),
      fetchIntervalsAthlete(connection.api_key).catch(() => null),
      fetchIntervalsWellness(connection.api_key, athleteId, 30).catch(() => []),
    ]);
    const watts15s = wattsAtDuration(curve.points, 15);
    const watts30s = wattsAtDuration(curve.points, 30);
    const watts1m = wattsAtDuration(curve.points, 60);
    const watts2m = wattsAtDuration(curve.points, 120);
    const watts5m = wattsAtDuration(curve.points, 300);
    const watts10m = wattsAtDuration(curve.points, 600);
    const watts20m = wattsAtDuration(curve.points, 1200);
    const profile = connectionProfile(connection);
    const athleteDefaults = athleteFallbacks(athlete);
    const latestWellnessWithWeight = [...wellness]
      .reverse()
      .find((row) => numberOrNull(row.weight));
    const latestWellnessWithEftp = [...wellness]
      .reverse()
      .find((row) => numberOrNull(row.eftp));
    const payload = powerProfilePayload({
      ftpWatts:
        curve.ftpWatts ??
        athleteDefaults.ftpWatts ??
        numberOrNull(latestWellnessWithEftp?.eftp) ??
        profile?.ftp_watts ??
        watts20m ??
        null,
      weightKg:
        athleteDefaults.weightKg ??
        numberOrNull(latestWellnessWithWeight?.weight) ??
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

    const profileRow = {
      profile_id: connection.profile_id,
      athlete_id: athleteId,
      period: curve.period,
      source: "intervals",
      ...payload,
      curve_points: compactCurvePoints(curve.points),
      sync_status: hasCurve ? "ok" : hasFallback ? "partial" : "error",
      sync_error: hasCurve
        ? null
        : `Geen powercurve-punten gevonden in Intervals (${curve.debug ?? "onbekend antwoord"}).`,
      synced_at: new Date().toISOString(),
    };
    let { error } = await supabase.from("rider_power_profiles").upsert(profileRow);
    if (error?.message.includes("curve_points")) {
      const legacyProfileRow = Object.fromEntries(
        Object.entries(profileRow).filter(([key]) => key !== "curve_points"),
      );
      ({ error } = await supabase.from("rider_power_profiles").upsert(legacyProfileRow));
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

export async function syncRiderPowerProfiles(scope: "self" | "all" = "self") {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };

  const syncAll = scope === "all";
  if (syncAll && !access.has("teams.sync_sources")) {
    return { ok: false as const, error: "Geen recht om alle powerprofielen te syncen." };
  }

  const db = syncAll ? createAdminClient() : supabase;
  let query = db
    .from("intervals_connections")
    .select("profile_id, athlete_id, api_key, profiles(ftp_watts, weight_kg)");

  if (!syncAll) query = query.eq("profile_id", access.user.id);

  const { data, error } = await query;
  if (error) return { ok: false as const, error: error.message };

  const connections = (data ?? []) as unknown as IntervalsConnectionRow[];
  if (connections.length === 0) {
    return {
      ok: false as const,
      error: syncAll
        ? "Geen Intervals-koppelingen gevonden."
        : "Je hebt nog geen Intervals-koppeling.",
    };
  }

  let synced = 0;
  let partial = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const connection of connections) {
    const result = await syncOnePowerProfile(db, connection);
    if (result.ok) synced += 1;
    else if (result.partial) {
      partial += 1;
      if (result.error) errors.push(result.error);
    } else {
      failed += 1;
      if (result.error) errors.push(result.error);
    }
  }

  revalidatePath("/teams");
  revalidatePath("/dashboard");
  revalidatePath("/training/vermogen");
  return { ok: true as const, synced, partial, failed, errors: errors.slice(0, 3) };
}
