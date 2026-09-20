// Van de Zwift-kalender in de database naar drie voorstellen bij één geplande
// training. Dit is de lees- en koppelkant; het oordeel zelf zit in
// zwift-match.ts en heeft geen database nodig.

import type { createAdminClient } from "@/lib/supabase/admin";
import { routeFromZwiftId } from "@/lib/events/zwift-route";
import {
  loadAvailabilityRange,
  minutesForDate,
  type AvailabilityPlan,
} from "@/lib/training/availability";
import { normalizeWorkoutBlocks, type WorkoutIntensity } from "@/lib/training/workouts";
import {
  suggestZwiftEvents,
  type MatchAthlete,
  type PlannedSession,
  type ZwiftEventCandidate,
  type ZwiftEventMatch,
  type ZwiftSubgroup,
} from "@/lib/training/zwift-match";

type Admin = ReturnType<typeof createAdminClient>;

type CachedEventRow = {
  event_id: number;
  name: string;
  event_start: string;
  event_type: string | null;
  sport: string | null;
  route_id: number | null;
  duration_seconds: number | null;
  distance_m: number | string | null;
  laps: number | null;
  subgroups: unknown;
  series_name: string | null;
  description: string | null;
  total_signups: number | null;
  zwb_signups: number | null;
  external_url: string;
};

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeSubgroups(value: unknown): ZwiftSubgroup[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const record = (row ?? {}) as Record<string, unknown>;
    return {
      label: record.label == null ? null : String(record.label),
      minWkg: numberOrNull(record.minWkg),
      maxWkg: numberOrNull(record.maxWkg),
      startAt: record.startAt == null ? null : String(record.startAt),
      distanceM: numberOrNull(record.distanceM),
      signups: numberOrNull(record.signups),
    } satisfies ZwiftSubgroup;
  });
}

/**
 * Een cacherij naar een kandidaat. De route komt er hier bij: die staat niet in
 * de cache maar in het `zwift-data`-pakket, precies zoals zwift_routes (0144)
 * het doet — één bron voor naam, afstand en hoogtemeters van een route.
 */
export function candidateFromRow(row: CachedEventRow): ZwiftEventCandidate {
  const route = row.route_id === null ? null : routeFromZwiftId(row.route_id);
  return {
    eventId: row.event_id,
    name: row.name,
    startAt: row.event_start,
    eventType: row.event_type,
    sport: row.sport,
    durationSeconds: row.duration_seconds,
    distanceM: numberOrNull(row.distance_m),
    laps: row.laps,
    subgroups: normalizeSubgroups(row.subgroups),
    seriesName: row.series_name,
    description: row.description,
    totalSignups: row.total_signups,
    zwbSignups: row.zwb_signups,
    externalUrl: row.external_url,
    route: route
      ? {
          name: route.name,
          world: route.world,
          distanceKm: route.distanceKm,
          elevationM: route.elevationM,
          leadInKm: route.leadInKm,
          leadInElevationM: route.leadInElevationM,
        }
      : null,
  };
}

export type SuggestionWorkout = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  intensity: string | null;
  structure: unknown;
  /** Het event dat het lid al koos; dan stellen we niets meer voor. */
  zwiftEventId: number | null;
  dismissedAt: string | null;
};

export type WorkoutSuggestions = {
  workoutId: string;
  matches: ZwiftEventMatch[];
};

/**
 * Voorstellen voor een reeks geplande trainingen in één keer: één query over het
 * hele dagbereik in plaats van één per training.
 *
 * Trainingen waar het lid al een event bij koos of de voorstellen wegklikte
 * slaan we over -- een voorstel dat terugkomt nadat je het wegklikte is geen
 * voorstel meer maar gezeur.
 */
export async function loadZwiftSuggestions(
  admin: Admin,
  profileId: string,
  workouts: SuggestionWorkout[],
  options: { now?: Date; limit?: number } = {},
): Promise<Map<string, ZwiftEventMatch[]>> {
  const now = options.now ?? new Date();
  const result = new Map<string, ZwiftEventMatch[]>();

  const open = workouts.filter(
    (workout) =>
      workout.zwiftEventId === null &&
      workout.dismissedAt === null &&
      workout.durationMinutes > 0 &&
      new Date(workout.scheduledAt).getTime() > now.getTime(),
  );
  if (open.length === 0) return result;

  const starts = open.map((workout) => workout.scheduledAt).sort();
  const from = dayStart(starts[0]);
  const to = dayEnd(starts[starts.length - 1]);

  const { data: rows, error } = await admin
    .from("zwift_events")
    .select(
      "event_id, name, event_start, event_type, sport, route_id, duration_seconds, distance_m, laps, subgroups, series_name, description, total_signups, zwb_signups, external_url",
    )
    .gte("event_start", from)
    .lte("event_start", to)
    .order("event_start", { ascending: true });

  if (error) {
    // Loggen en leeg teruggeven, niet stil doen alsof er niets gepland staat --
    // dezelfde regel als bij de andere loaders in deze module.
    console.error("[zwift-suggestions] events laden mislukt", error.message);
    return result;
  }

  const candidates = ((rows ?? []) as CachedEventRow[]).map(candidateFromRow);
  if (candidates.length === 0) return result;

  const [profile, availability] = await Promise.all([
    loadAthlete(admin, profileId),
    loadAvailabilityRange(admin, profileId, dayKey(starts[0]), dayKey(starts[starts.length - 1])).catch(
      () => ({ default: null, weeks: [] }) as AvailabilityPlan,
    ),
  ]);

  for (const workout of open) {
    const athlete: MatchAthlete = {
      ...profile,
      availableMinutes: minutesForDate(availability, dayKey(workout.scheduledAt)),
    };
    const session: PlannedSession = {
      scheduledAt: workout.scheduledAt,
      durationMinutes: workout.durationMinutes,
      intensity: (workout.intensity ?? "endurance") as WorkoutIntensity,
      blocks: normalizeWorkoutBlocks(workout.structure),
    };
    const matches = suggestZwiftEvents(candidates, session, athlete, {
      now,
      limit: options.limit,
    });
    if (matches.length > 0) result.set(workout.id, matches);
  }

  return result;
}

async function loadAthlete(admin: Admin, profileId: string) {
  const { data } = await admin
    .from("profiles")
    .select("ftp_watts, weight_kg")
    .eq("id", profileId)
    .maybeSingle();
  return {
    ftpWatts: numberOrNull(data?.ftp_watts),
    weightKg: numberOrNull(data?.weight_kg),
  };
}

/** Het event dat het lid koos, om het bij de training te kunnen tonen. */
export async function loadChosenZwiftEvents(
  admin: Admin,
  eventIds: number[],
): Promise<Map<number, { name: string; startAt: string; externalUrl: string }>> {
  const unique = [...new Set(eventIds)].filter((id) => Number.isFinite(id));
  const chosen = new Map<number, { name: string; startAt: string; externalUrl: string }>();
  if (unique.length === 0) return chosen;

  const { data, error } = await admin
    .from("zwift_events")
    .select("event_id, name, event_start, external_url")
    .in("event_id", unique);
  if (error) {
    console.error("[zwift-suggestions] gekozen events laden mislukt", error.message);
    return chosen;
  }

  for (const row of (data ?? []) as CachedEventRow[]) {
    chosen.set(row.event_id, {
      name: row.name,
      startAt: row.event_start,
      externalUrl: row.external_url,
    });
  }
  return chosen;
}

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

/**
 * Begin en eind van de dag in Amsterdamse tijd, als ISO. De marge van een paar
 * uur aan weerszijden is er omdat een event dat om 23:45 start nog bij de
 * training van die dag hoort; het harde filter in zwift-match.ts bepaalt daarna
 * of het echt dezelfde dag is.
 */
function dayStart(iso: string) {
  return new Date(new Date(`${dayKey(iso)}T00:00:00Z`).getTime() - 2 * 3600_000).toISOString();
}

function dayEnd(iso: string) {
  return new Date(new Date(`${dayKey(iso)}T23:59:59Z`).getTime() + 2 * 3600_000).toISOString();
}
