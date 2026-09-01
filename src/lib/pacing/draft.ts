// Contextopbouw en opslag voor het pacingplan.
//
// Blauwdruk: src/lib/training/draft.ts. Dezelfde drieslag — lees alles wat het
// model nodig heeft uit de database, schrijf een generatie-rij vóórdat de call
// vertrekt, en sla het resultaat idempotent op. Die volgorde is niet toevallig:
// een generatie die start zonder rij is een verdwenen euro, en een resultaat dat
// twee keer wordt opgeslagen overschrijft de bewerkingen van het lid.

import { createAdminClient } from "@/lib/supabase/admin";
import { buildIntervalsLoad } from "@/lib/training/draft";
import { classifyRider, type RiderType } from "@/lib/teams/power-profile";
import {
  resolveCpWPrime,
  type CpModel,
  type CurvePoint,
} from "@/lib/pacing/cp";
import {
  buildDurabilityModel,
  type DurabilityModel,
  type FatigueCurve,
} from "@/lib/pacing/durability";
import { buildBaselinePlan } from "@/lib/pacing/baseline";
import { scoreSimilarRides, type RideCandidate } from "@/lib/pacing/similarity";
import type { PacingRoute } from "@/lib/pacing/route-profile";
import type { PacingAiInput } from "@/lib/pacing/ai";
import type { PacingEventRow } from "@/lib/pacing/route-loader";

type Admin = ReturnType<typeof createAdminClient>;

/** Alles wat we van een lid weten dat voor pacing uitmaakt. */
export type RiderContext = {
  model: CpModel;
  durability: DurabilityModel | null;
  curve: CurvePoint[] | null;
  riderType: RiderType;
  ftpWatts: number | null;
};

function num(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Leest vermogen, drempel en duurzaamheid. Elke bron mag ontbreken; resolveCpWPrime
 * levert altijd een model, met een `source` die het scherm toont.
 */
export async function loadRiderContext(
  admin: Admin,
  profileId: string,
): Promise<RiderContext> {
  const [powerRow, settingsRow, profileRow] = await Promise.all([
    admin
      .from("rider_power_profiles")
      .select(
        "weight_kg, ftp_watts, watts_20m, watts_15s, watts_30s, watts_1m, watts_2m, watts_5m, watts_10m, curve_points, curve_points_fatigue, rider_type",
      )
      .eq("profile_id", profileId)
      .maybeSingle(),
    admin
      .from("profile_sport_settings")
      .select("cp_watts, w_prime_joules")
      .eq("profile_id", profileId)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("weight_kg, ftp_watts")
      .eq("id", profileId)
      .maybeSingle(),
  ]);

  const power = (powerRow.data ?? {}) as Record<string, unknown>;
  const settings = (settingsRow.data ?? {}) as Record<string, unknown>;
  const profile = (profileRow.data ?? {}) as Record<string, unknown>;

  const weightKg = num(power.weight_kg) ?? num(profile.weight_kg);
  const watts20m = num(power.watts_20m);
  const ftpWatts =
    num(power.ftp_watts) ??
    num(profile.ftp_watts) ??
    (watts20m ? Math.round(watts20m * 0.95) : null);

  const curve = Array.isArray(power.curve_points)
    ? (power.curve_points as CurvePoint[])
    : null;

  const model = resolveCpWPrime({
    storedCpWatts: num(settings.cp_watts),
    storedWPrimeJoules: num(settings.w_prime_joules),
    curvePoints: curve,
    ftpWatts,
    weightKg,
  });

  const durability = Array.isArray(power.curve_points_fatigue)
    ? buildDurabilityModel(
        power.curve_points_fatigue as FatigueCurve[],
        model.cpWatts,
      )
    : null;

  const riderType =
    (typeof power.rider_type === "string" ? power.rider_type : null) ??
    classifyRider({
      ftpWatts,
      weightKg,
      watts15s: num(power.watts_15s),
      watts30s: num(power.watts_30s),
      watts1m: num(power.watts_1m),
      watts2m: num(power.watts_2m),
      watts5m: num(power.watts_5m),
      watts10m: num(power.watts_10m),
      watts20m,
    });

  return {
    model,
    durability,
    curve,
    riderType: riderType as RiderType,
    ftpWatts,
  };
}

/** Duren die er voor pacing toe doen; de hele curve is te veel context. */
const CURVE_DURATIONS = [60, 120, 300, 600, 1200, 3600];

function trimCurve(curve: CurvePoint[] | null): Array<{ seconds: number; watts: number }> {
  if (!curve?.length) return [];
  return CURVE_DURATIONS.flatMap((seconds) => {
    let best: CurvePoint | null = null;
    for (const point of curve) {
      if (!best || Math.abs(point.seconds - seconds) < Math.abs(best.seconds - seconds)) {
        best = point;
      }
    }
    return best && Math.abs(best.seconds - seconds) <= seconds * 0.15
      ? [{ seconds, watts: Math.round(best.watts) }]
      : [];
  });
}

const RIDE_LOOKBACK_DAYS = 730;

/**
 * Ritten uit de historie van het lid, uit beide bronnen. Strava levert afstand
 * en hoogtemeters; intervals.icu levert daarnaast genormaliseerd vermogen. Een
 * rit zonder echte vermogensmeter telt wel mee voor gelijkenis, maar levert geen
 * wattgetal — geschat vermogen is hier waardeloos.
 */
export async function loadRideHistory(
  admin: Admin,
  profileId: string,
): Promise<RideCandidate[]> {
  const since = new Date(
    Date.now() - RIDE_LOOKBACK_DAYS * 24 * 3600 * 1000,
  ).toISOString();

  const [stravaRows, intervalsRows] = await Promise.all([
    admin
      .from("strava_activities")
      .select("id, name, start_date, distance_m, total_elevation_gain_m, moving_time_seconds, raw")
      .eq("profile_id", profileId)
      .gte("start_date", since)
      .order("start_date", { ascending: false })
      .limit(400),
    admin
      .from("intervals_activities")
      .select(
        "intervals_id, name, start_date_local, distance_m, elevation_gain_m, moving_time_seconds, average_watts, normalized_watts",
      )
      .eq("profile_id", profileId)
      .gte("start_date_local", since)
      .order("start_date_local", { ascending: false })
      .limit(400),
  ]);

  const candidates: RideCandidate[] = [];

  for (const row of (stravaRows.data ?? []) as Array<Record<string, unknown>>) {
    const raw = (row.raw ?? {}) as Record<string, unknown>;
    const distanceKm = Number(row.distance_m ?? 0) / 1000;
    if (!(distanceKm > 0)) continue;
    // Alleen een echte vermogensmeter; Strava's schatting is hier onbruikbaar.
    const hasPower = raw.device_watts === true;
    candidates.push({
      id: `strava-${row.id}`,
      source: "strava",
      name: String(row.name ?? "Rit"),
      date: String(row.start_date ?? ""),
      distanceKm,
      elevationM: Number(row.total_elevation_gain_m ?? 0),
      movingSeconds: Number(row.moving_time_seconds ?? 0),
      avgWatts: hasPower ? (num(raw.average_watts) ?? null) : null,
      normalizedWatts: hasPower ? (num(raw.weighted_average_watts) ?? null) : null,
    });
  }

  for (const row of (intervalsRows.data ?? []) as Array<Record<string, unknown>>) {
    const distanceKm = Number(row.distance_m ?? 0) / 1000;
    if (!(distanceKm > 0)) continue;
    candidates.push({
      id: `intervals-${row.intervals_id}`,
      source: "intervals",
      name: String(row.name ?? "Rit"),
      date: String(row.start_date_local ?? ""),
      distanceKm,
      elevationM: Number(row.elevation_gain_m ?? 0),
      movingSeconds: Number(row.moving_time_seconds ?? 0),
      avgWatts: num(row.average_watts),
      normalizedWatts: num(row.normalized_watts),
    });
  }

  return candidates;
}

export type PacingContext = {
  input: PacingAiInput;
  rider: RiderContext;
  baseline: ReturnType<typeof buildBaselinePlan>;
};

/**
 * Bouwt alles wat het model krijgt. Het basisvoorstel wordt hier al doorgerekend
 * en meegestuurd: een model dat met een leeg vel begint verzint een verdeling,
 * een model dat een doorgerekend voorstel ziet verbetert het.
 */
export async function buildPacingContext(
  admin: Admin,
  options: {
    profileId: string;
    athleteName: string;
    event: PacingEventRow;
    route: PacingRoute;
    goal?: string | null;
  },
): Promise<PacingContext> {
  const { route, event } = options;

  const [rider, rides, form] = await Promise.all([
    loadRiderContext(admin, options.profileId),
    loadRideHistory(admin, options.profileId),
    buildIntervalsLoad(admin, options.profileId),
  ]);

  const baseline = buildBaselinePlan({
    route,
    model: rider.model,
    riderType: rider.riderType,
    curve: rider.curve,
    durability: rider.durability,
  });

  const elevationM = totalElevation(route);
  const longestClimbKm = route.accents
    .filter((accent) => accent.kind === "climb")
    .reduce((longest, accent) => Math.max(longest, accent.endKm - accent.startKm), 0);

  const similar = scoreSimilarRides(
    {
      distanceKm: route.totalKm,
      elevationM,
      longestClimbKm: longestClimbKm > 0 ? longestClimbKm : null,
      expectedSeconds: baseline.evaluation.totalSeconds,
    },
    rides,
  );

  const input: PacingAiInput = {
    athleteName: options.athleteName,
    event: {
      title: event.title,
      type: event.type,
      date: event.start_at,
      routeSource: route.source,
      distanceKm: round1(route.totalKm),
      elevationM: Math.round(elevationM),
      laps: event.laps == null ? null : Number(event.laps),
    },
    accents: route.accents.map((accent) => ({
      id: accent.id,
      name: accent.name,
      kind: accent.kind,
      startKm: round1(accent.startKm),
      endKm: round1(accent.endKm),
      lengthKm: round1(accent.endKm - accent.startKm),
      avgGradientPct: Math.round(accent.avgGradient * 1000) / 10,
      lap: accent.lap,
    })),
    rider: {
      cpWatts: rider.model.cpWatts,
      cpSource: rider.model.source,
      wPrimeJoules: rider.model.wPrimeJoules,
      ftpWatts: rider.ftpWatts,
      weightKg: rider.model.weightKg,
      riderType: rider.riderType,
      powerCurve: trimCurve(rider.curve),
      durabilityFadePct: rider.durability
        ? Math.round(rider.durability.maxFadePct * 10) / 10
        : null,
    },
    form: form
      ? { ctl: form.ctl, atl: form.atl, tsb: form.tsb }
      : null,
    baseline: {
      segments: baseline.plan.map((segment) => ({
        startKm: round1(segment.startKm),
        endKm: round1(segment.endKm),
        targetWkg: segment.targetWkg,
        label: segment.label,
      })),
      estimatedMinutes: Math.round(baseline.evaluation.totalSeconds / 60),
      avgWkg: Math.round(baseline.evaluation.avgWkg * 100) / 100,
      deepestDrawPct: Math.round(baseline.evaluation.deepestDrawPct),
    },
    similarRides: similar.map((scored) => ({
      name: scored.ride.name,
      date: scored.ride.date.slice(0, 10),
      distanceKm: round1(scored.ride.distanceKm),
      elevationM: Math.round(scored.ride.elevationM),
      durationMinutes: Math.round(scored.ride.movingSeconds / 60),
      watts: scored.wattsUsed,
      wkg:
        scored.wattsUsed && rider.model.weightKg
          ? Math.round((scored.wattsUsed / rider.model.weightKg) * 100) / 100
          : null,
      why: scored.reasons.join(", "),
    })),
    goal: options.goal ?? null,
  };

  return { input, rider, baseline };
}

/** Hoogtemeters uit het segmentraster; het profiel zelf is al gesmoothd. */
export function totalElevation(route: PacingRoute): number {
  let gain = 0;
  for (const segment of route.segments) {
    const rise = segment.gradient * segment.distanceM;
    if (rise > 0) gain += rise;
  }
  return gain;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
