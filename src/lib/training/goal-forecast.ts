// De I/O rond een doeltijd: het parcours laden, de renner lezen, de prognose
// bewaren en het verloop teruglezen. Het rekenwerk staat in goal-target-time.ts.
//
// Een prognose is een momentopname. Er komt een nieuwe bij als de vorige een
// week oud is, als CP of gewicht is veranderd, of als het lid de doeltijd
// aanpast. Zo ziet het lid of het de goede kant op gaat, zonder dat elke
// paginaweergave een doorrekening kost.

import type { createAdminClient } from "@/lib/supabase/admin";
import { allTrkptFromGpx } from "@/lib/gpx";
import { detectClimbs, labelClimbsWithCols, type ColLite } from "@/lib/gpx-climbs";
import { sampleRoute } from "@/lib/route-sample";
import { withParentRoute, type RouteFields } from "@/lib/events/route-source";
import { loadPacingRoute, type PacingEventRow } from "@/lib/pacing/route-loader";
import {
  pacingRouteFromGpx,
  withDescents,
  type PacingRoute,
} from "@/lib/pacing/route-profile";
import { loadRiderContext, totalElevation } from "@/lib/pacing/draft";
import { CYCLING_SPORTS } from "@/lib/strava/sports";
import {
  forecastGoal,
  type GoalEmphasis,
  type GoalForecast,
  type GoalRiding,
  type GoalVerdict,
} from "@/lib/training/goal-target-time";
import type { CpSource } from "@/lib/pacing/cp";

type Admin = ReturnType<typeof createAdminClient>;
// Leest ook met de gewone sessieclient (RLS); alleen select is nodig.
type Reader = { from: Admin["from"] };

/** Na zoveel dagen komt er een nieuwe prognose. */
export const FORECAST_MAX_AGE_DAYS = 7;
/** Zoveel prognoses per doel tonen we als verloop. */
export const FORECAST_HISTORY = 8;
/** Venster voor de langste rit. */
export const LONGEST_RIDE_DAYS = 56;

const EVENT_COLUMNS =
  "id, title, type, start_at, gpx_path, distance_km, elevation_m, zwift_event_id, zwift_route_id, laps, parent_event_id";

export type GoalTargetRow = {
  id: string;
  profile_id: string;
  status: string;
  target_date: string | null;
  target_event_id: string | null;
  target_time_seconds: number | null;
  target_riding: string | null;
  target_route: unknown;
};

/** Wat er van een eigen GPX bewaard blijft: alleen het hoogteprofiel. */
export type StoredGoalRoute = {
  name: string | null;
  totalKm: number;
  elevationM: number;
  route: PacingRoute;
};

export type GoalForecastDetail = Pick<
  GoalForecast,
  | "cpSource"
  | "requiredGainPct"
  | "realisticGainPct"
  | "weeksToGoal"
  | "secondsPerCpPct"
  | "secondsPerKg"
  | "climbShare"
  | "durabilityFadePct"
  | "riding"
  | "emphasis"
>;

export type GoalForecastRow = {
  id: string;
  goal_id: string;
  computed_at: string;
  target_seconds: number;
  predicted_seconds: number;
  verdict: GoalVerdict;
  cp_watts: number;
  weight_kg: number | string;
  required_cp_watts: number | null;
  detail: Partial<GoalForecastDetail>;
};

const FORECAST_COLUMNS =
  "id, goal_id, computed_at, target_seconds, predicted_seconds, verdict, cp_watts, weight_kg, required_cp_watts, detail";

export function riding(value: string | null | undefined): GoalRiding {
  return value === "group" ? "group" : "alone";
}

const round = (value: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

/**
 * Kleiner om te bewaren: helling op vier decimalen, afstand op een decimeter.
 * Afdalingen rekent withDescents bij het laden opnieuw uit.
 */
export function compactRoute(route: PacingRoute): PacingRoute {
  return {
    source: route.source,
    totalKm: round(route.totalKm, 3),
    hasElevation: route.hasElevation,
    segments: route.segments.map((segment) => ({
      distanceM: round(segment.distanceM, 1),
      gradient: round(segment.gradient, 4),
      accentIndex: segment.accentIndex,
    })),
    accents: route.accents.map((accent) => ({
      ...accent,
      startKm: round(accent.startKm, 3),
      endKm: round(accent.endKm, 3),
      avgGradient: round(accent.avgGradient, 4),
    })),
    leadInApproximated: route.leadInApproximated,
  };
}

function isStoredRoute(value: unknown): value is StoredGoalRoute {
  const route = (value as StoredGoalRoute | null)?.route;
  return Boolean(route && Array.isArray(route.segments) && route.segments.length > 0);
}

/**
 * Een eigen GPX naar een hoogteprofiel. De coördinaten zijn alleen hier nodig,
 * om klimmen te vinden en een bekende col bij naam te noemen; daarna vallen ze weg.
 */
export async function goalRouteFromGpx(
  admin: Admin,
  xml: string,
  name: string | null,
): Promise<{ ok: true; stored: StoredGoalRoute } | { ok: false; error: string }> {
  const points = allTrkptFromGpx(xml);
  if (points.length < 2) return { ok: false, error: "De GPX bevat geen bruikbare route." };

  const { data: colRows } = await admin
    .from("cols")
    .select("slug, name, summit_lat, summit_lon, detection_radius_m")
    .not("summit_lat", "is", null);
  const climbs = labelClimbsWithCols(detectClimbs(points), points, (colRows ?? []) as ColLite[]);
  const route = compactRoute(pacingRouteFromGpx(sampleRoute(points, climbs), climbs));
  if (!route.hasElevation) {
    return { ok: false, error: "De GPX heeft geen hoogtegegevens." };
  }
  return {
    ok: true,
    stored: {
      name,
      totalKm: route.totalKm,
      elevationM: Math.round(totalElevation(route)),
      route,
    },
  };
}

/** Clubevents met een eigen GPX die nog moeten komen: de keuzelijst bij het doel. */
export async function goalEventOptions(
  admin: Admin,
): Promise<Array<{ id: string; label: string }>> {
  const { data } = await admin
    .from("events")
    .select("id, title, start_at")
    .not("gpx_path", "is", null)
    .is("zwift_route_id", null)
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(60);
  const day = new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Amsterdam",
  });
  return ((data ?? []) as Array<{ id: string; title: string; start_at: string }>).map((row) => ({
    id: row.id,
    label: `${row.title} (${day.format(new Date(row.start_at))})`,
  }));
}

/** Titels van de events waar doelen aan hangen, voor de regel onder de prognose. */
export async function goalEventTitles(
  reader: Reader,
  goals: Array<{ target_event_id?: string | null }>,
): Promise<Map<string, string>> {
  const ids = [...new Set(goals.map((goal) => goal.target_event_id).filter(Boolean))] as string[];
  if (ids.length === 0) return new Map();
  const { data } = await reader.from("events").select("id, title").in("id", ids);
  return new Map(
    ((data ?? []) as Array<{ id: string; title: string }>).map((row) => [row.id, row.title]),
  );
}

/** "Amstel Gold Race · 150 km · 1920 hm" of de titel van het event. */
export function goalRouteLabel(
  goal: { target_route?: unknown; target_event_id?: string | null },
  eventTitles: Map<string, string>,
): string | null {
  if (isStoredRoute(goal.target_route)) {
    const stored = goal.target_route;
    return [
      stored.name ?? "Eigen GPX",
      `${Math.round(stored.totalKm)} km`,
      `${stored.elevationM} hm`,
    ].join(" · ");
  }
  return goal.target_event_id ? (eventTitles.get(goal.target_event_id) ?? null) : null;
}

/**
 * Het parcours van het doel: een eigen profiel, anders de GPX van het event.
 * Een Zwift-route rekent hier niet: die vraagt de Zwift-fysica.
 */
export async function loadGoalRoute(
  admin: Admin,
  goal: Pick<GoalTargetRow, "target_route" | "target_event_id">,
): Promise<PacingRoute | null> {
  if (isStoredRoute(goal.target_route)) return withDescents(goal.target_route.route);
  if (!goal.target_event_id) return null;

  const { data: eventRow } = await admin
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", goal.target_event_id)
    .maybeSingle();
  if (!eventRow) return null;
  const row = eventRow as PacingEventRow & { parent_event_id: string | null };
  const { data: parentRow } = row.parent_event_id
    ? await admin
        .from("events")
        .select("gpx_path, zwift_route_id, laps")
        .eq("id", row.parent_event_id)
        .maybeSingle()
    : { data: null };
  const event = withParentRoute(row, parentRow as RouteFields | null);
  if (event.zwift_route_id) return null;
  const result = await loadPacingRoute(admin, event);
  return result.ok ? result.loaded.route : null;
}

export async function longestRideMinutes(admin: Admin, profileId: string): Promise<number | null> {
  const { data } = await admin
    .from("strava_activities")
    .select("moving_time_seconds")
    .eq("profile_id", profileId)
    .in("sport_type", CYCLING_SPORTS)
    .gte("start_date", new Date(Date.now() - LONGEST_RIDE_DAYS * 86400_000).toISOString())
    .order("moving_time_seconds", { ascending: false })
    .limit(1);
  const seconds = Number((data ?? [])[0]?.moving_time_seconds);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds / 60) : null;
}

export function weeksUntil(targetDate: string | null, now = new Date()): number | null {
  if (!targetDate) return null;
  const target = new Date(`${String(targetDate).slice(0, 10)}T12:00:00Z`).getTime();
  if (!Number.isFinite(target)) return null;
  return (target - now.getTime()) / (7 * 86400_000);
}

/** Het doel is voorbij: dan valt er niets meer te voorspellen. */
export function goalIsOver(goal: Pick<GoalTargetRow, "target_date" | "status">, now = new Date()) {
  if (goal.status !== "active") return true;
  const weeks = weeksUntil(goal.target_date, now);
  return weeks !== null && weeks < 0;
}

/**
 * Rekent een nieuwe prognose uit en bewaart hem. Null als het doel geen
 * doeltijd of geen bruikbaar parcours heeft.
 */
export async function computeGoalForecast(
  admin: Admin,
  goal: GoalTargetRow,
): Promise<GoalForecastRow | null> {
  if (!goal.target_time_seconds) return null;
  const route = await loadGoalRoute(admin, goal);
  if (!route) return null;

  const [rider, longest] = await Promise.all([
    loadRiderContext(admin, goal.profile_id),
    longestRideMinutes(admin, goal.profile_id),
  ]);
  const forecast = forecastGoal({
    route,
    rider,
    targetSeconds: goal.target_time_seconds,
    riding: riding(goal.target_riding),
    weeksToGoal: weeksUntil(goal.target_date),
    longestRideMinutes: longest,
  });

  const detail: GoalForecastDetail = {
    cpSource: forecast.cpSource,
    requiredGainPct: forecast.requiredGainPct,
    realisticGainPct: forecast.realisticGainPct,
    weeksToGoal: forecast.weeksToGoal,
    secondsPerCpPct: forecast.secondsPerCpPct,
    secondsPerKg: forecast.secondsPerKg,
    climbShare: forecast.climbShare,
    durabilityFadePct: forecast.durabilityFadePct,
    riding: forecast.riding,
    emphasis: forecast.emphasis,
  };
  const { data, error } = await admin
    .from("training_goal_forecasts")
    .insert({
      goal_id: goal.id,
      profile_id: goal.profile_id,
      target_seconds: forecast.targetSeconds,
      predicted_seconds: forecast.predictedSeconds,
      verdict: forecast.verdict,
      cp_watts: forecast.cpWatts,
      weight_kg: forecast.weightKg,
      required_cp_watts: forecast.requiredCpWatts,
      detail,
    })
    .select(FORECAST_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as GoalForecastRow;
}

/** Per doel de laatste prognoses, nieuwste eerst. */
export async function loadGoalForecasts(
  reader: Reader,
  goalIds: string[],
): Promise<Map<string, GoalForecastRow[]>> {
  const out = new Map<string, GoalForecastRow[]>();
  if (goalIds.length === 0) return out;
  const { data } = await reader
    .from("training_goal_forecasts")
    .select(FORECAST_COLUMNS)
    .in("goal_id", goalIds)
    .order("computed_at", { ascending: false })
    .limit(goalIds.length * FORECAST_HISTORY * 2);
  for (const row of (data ?? []) as GoalForecastRow[]) {
    const list = out.get(row.goal_id) ?? [];
    if (list.length < FORECAST_HISTORY) list.push(row);
    out.set(row.goal_id, list);
  }
  return out;
}

/** Hoort er een nieuwe prognose bij? */
export function forecastIsStale(
  goal: Pick<GoalTargetRow, "target_time_seconds" | "target_riding">,
  latest: GoalForecastRow | undefined,
  current: { cpWatts: number; weightKg: number } | null,
  now = new Date(),
): boolean {
  if (!latest) return true;
  if (latest.target_seconds !== goal.target_time_seconds) return true;
  if ((latest.detail.riding ?? "alone") !== riding(goal.target_riding)) return true;
  const ageDays = (now.getTime() - new Date(latest.computed_at).getTime()) / 86400_000;
  if (ageDays >= FORECAST_MAX_AGE_DAYS) return true;
  if (current) {
    if (Math.abs(current.cpWatts - latest.cp_watts) >= 1) return true;
    if (Math.abs(current.weightKg - Number(latest.weight_kg)) >= 0.1) return true;
  }
  return false;
}

/**
 * Werkt de prognoses van één lid bij waar dat nodig is. Draait na het antwoord
 * (after) of vlak voor een schemageneratie; een fout bij één doel houdt de rest
 * niet tegen.
 */
export async function refreshGoalForecasts(
  admin: Admin,
  profileId: string,
  goals: GoalTargetRow[],
  latestByGoal: Map<string, GoalForecastRow[]>,
): Promise<number> {
  const open = goals.filter((goal) => goal.target_time_seconds && !goalIsOver(goal));
  if (open.length === 0) return 0;
  const rider = await loadRiderContext(admin, profileId);
  const current = { cpWatts: Math.round(rider.model.cpWatts), weightKg: rider.model.weightKg };
  let computed = 0;
  for (const goal of open) {
    if (!forecastIsStale(goal, latestByGoal.get(goal.id)?.[0], current)) continue;
    try {
      if (await computeGoalForecast(admin, goal)) computed++;
    } catch (err) {
      console.error("[doeltijd] prognose mislukt", {
        goalId: goal.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return computed;
}

export type GoalTargetForAi = {
  targetSeconds: number;
  predictedSeconds: number;
  verdict: GoalVerdict;
  riding: GoalRiding;
  cpWatts: number;
  cpSource: CpSource | null;
  requiredCpWatts: number | null;
  requiredGainPct: number | null;
  realisticGainPct: number | null;
  weeksToGoal: number | null;
  climbShare: number | null;
  durabilityFadePct: number | null;
  emphasis: GoalEmphasis[];
};

export function forecastForAi(row: GoalForecastRow): GoalTargetForAi {
  const detail = row.detail ?? {};
  return {
    targetSeconds: row.target_seconds,
    predictedSeconds: row.predicted_seconds,
    verdict: row.verdict,
    riding: detail.riding ?? "alone",
    cpWatts: row.cp_watts,
    cpSource: detail.cpSource ?? null,
    requiredCpWatts: row.required_cp_watts,
    requiredGainPct: detail.requiredGainPct ?? null,
    realisticGainPct: detail.realisticGainPct ?? null,
    weeksToGoal: detail.weeksToGoal ?? null,
    climbShare: detail.climbShare ?? null,
    durabilityFadePct: detail.durabilityFadePct ?? null,
    emphasis: detail.emphasis ?? [],
  };
}

/**
 * De doeltijd voor de schema-AI: de laatste prognose, of een verse als die er
 * niet is of verouderd is. Null zonder doeltijd of parcours.
 */
export async function goalTargetForAi(
  admin: Admin,
  goal: GoalTargetRow,
): Promise<GoalTargetForAi | null> {
  if (!goal.target_time_seconds) return null;
  const latest = (await loadGoalForecasts(admin, [goal.id])).get(goal.id)?.[0];
  if (latest && !forecastIsStale(goal, latest, null)) return forecastForAi(latest);
  const fresh = await computeGoalForecast(admin, goal).catch(() => null);
  if (fresh) return forecastForAi(fresh);
  return latest ? forecastForAi(latest) : null;
}

/**
 * Het actieve trainingsdoel met doeltijd dat aan dit event hangt, met de laatste
 * prognose. Voor de pacingcalculator: daar hoort het lid te zien dat er al een
 * doeltijd voor deze rit loopt.
 */
export async function goalTargetForEvent(
  reader: Reader,
  profileId: string,
  eventId: string,
): Promise<{ goalId: string; targetSeconds: number; latest: GoalForecastRow | null } | null> {
  const { data } = await reader
    .from("training_goals")
    .select("id, target_time_seconds")
    .eq("profile_id", profileId)
    .eq("target_event_id", eventId)
    .eq("status", "active")
    .not("target_time_seconds", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const goal = (data ?? [])[0] as { id: string; target_time_seconds: number } | undefined;
  if (!goal) return null;
  const latest = (await loadGoalForecasts(reader, [goal.id])).get(goal.id)?.[0] ?? null;
  return { goalId: goal.id, targetSeconds: goal.target_time_seconds, latest };
}
