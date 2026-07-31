// Gedeelde dataophaal voor de trainer-tabs. Elke tab laadt alleen wat hij toont;
// het all-renners-deel (de kiezer) zit in de layout en draait daardoor één keer
// per laadbeurt in plaats van bij elke tab.

import { cache } from "react";
import {
  fetchIntervalsEvents,
  fetchIntervalsWellness,
  type IntervalsEvent,
  type IntervalsWellness,
} from "@/lib/intervals/client";
import type { WorkoutMetricsSnapshot } from "@/lib/training/completion";
import type { WellnessDevice } from "@/lib/training/wellness";
import { summarizeTrainingReadiness } from "@/lib/training/wellness";
import { computeZwbStatus, zwbeterWordenAdvice } from "@/lib/training/zwbeterworden";
import { requireViewer, type Viewer } from "../_data";
import { byProfile, formatKm, formatNumber, loadSummary, paramString } from "../_components/format";
import type {
  AssignmentRow,
  ProfileRow,
  SearchParamsProp,
  StravaActivityRow,
} from "../_components/types";

export type IntervalsAthleteConnection = {
  profile_id: string;
  athlete_id: string;
  api_key: string;
  wellness_opt_in: boolean | null;
};

/** Viewer van deze request. Gecached zodat layout en pagina bij een volledige
 * laadbeurt samen één auth-ronde doen. */
export const trainerViewer = cache(async (): Promise<Viewer> => requireViewer());

/** De renners die deze trainer actief mag zien. */
export const loadAssignments = cache(async (viewer: Viewer): Promise<AssignmentRow[]> => {
  const { data } = await viewer.supabase
    .from("training_coach_assignments")
    .select("id, athlete_id, trainer_id, status, notes, granted_at")
    .eq("trainer_id", viewer.user.id)
    .eq("status", "active")
    .order("granted_at", { ascending: false });
  return (data ?? []) as AssignmentRow[];
});

/**
 * De renner uit `?athlete=`, maar alleen als die aan deze trainer is toegewezen;
 * anders de eerste. Dit is de toegangscontrole van alle trainer-tabs: geen enkele
 * pagina mag een id uit de URL rechtstreeks in een query stoppen.
 */
export function resolveAthleteId(
  assignments: AssignmentRow[],
  requested?: string,
): string | undefined {
  return (
    assignments.find((assignment) => assignment.athlete_id === requested)?.athlete_id ??
    assignments[0]?.athlete_id
  );
}

export type TrainerContext =
  | { ok: false; reason: "no-permission" | "no-athletes" }
  | { ok: true; viewer: Viewer; assignments: AssignmentRow[]; athleteId: string };

/** Waar elke trainer-tab mee begint: rechten, toewijzingen en de gekozen renner. */
export async function trainerContext(
  searchParams: SearchParamsProp["searchParams"],
): Promise<TrainerContext> {
  const viewer = await trainerViewer();
  if (!viewer.access.has("training.view_assigned")) return { ok: false, reason: "no-permission" };

  const [assignments, params] = await Promise.all([
    loadAssignments(viewer),
    searchParams ?? Promise.resolve<Record<string, string | string[] | undefined>>({}),
  ]);
  const athleteId = resolveAthleteId(assignments, paramString(params.athlete));
  if (!athleteId) return { ok: false, reason: "no-athletes" };
  return { ok: true, viewer, assignments, athleteId };
}

export async function loadAthlete(viewer: Viewer, athleteId: string): Promise<ProfileRow | null> {
  const { data } = await viewer.supabase
    .from("profiles")
    .select("id, display_name, ftp_watts, weight_kg, zrl_category, zrl_division, wellness_device")
    .eq("id", athleteId)
    .maybeSingle();
  return (data ?? null) as ProfileRow | null;
}

/**
 * De intervals.icu-koppeling van de renner. Gaat via de admin-client omdat de
 * api_key niet leesbaar is onder RLS; alleen aanroepen met een `athleteId` die
 * uit `resolveAthleteId` komt.
 */
export async function loadAthleteConnection(
  viewer: Viewer,
  athleteId: string,
): Promise<IntervalsAthleteConnection | null> {
  const { data } = await viewer.admin
    .from("intervals_connections")
    .select("profile_id, athlete_id, api_key, wellness_opt_in")
    .eq("profile_id", athleteId)
    .maybeSingle();
  return (data ?? null) as IntervalsAthleteConnection | null;
}

export type AthleteIntervals = {
  wellness: IntervalsWellness[];
  events: IntervalsEvent[];
  fetchError: string | null;
};

/**
 * Wat de trainer van intervals.icu nodig heeft voor één renner. `wellnessDays: 0`
 * of `eventDays: 0` slaat die call over, zodat een tab niet ophaalt wat hij niet
 * toont. Tegenhanger van `loadIntervalsSnapshot` voor het lid zelf.
 */
export async function loadAthleteIntervals(
  conn: IntervalsAthleteConnection | null,
  { wellnessDays = 0, eventDays = 0 }: { wellnessDays?: number; eventDays?: number } = {},
): Promise<AthleteIntervals> {
  if (!conn?.api_key || !conn.athlete_id) {
    return { wellness: [], events: [], fetchError: null };
  }
  try {
    const [wellness, events] = await Promise.all([
      wellnessDays > 0
        ? fetchIntervalsWellness(conn.api_key, conn.athlete_id, wellnessDays)
        : Promise.resolve([] as IntervalsWellness[]),
      eventDays > 0
        ? fetchIntervalsEvents(conn.api_key, conn.athlete_id, eventDays)
        : Promise.resolve([] as IntervalsEvent[]),
    ]);
    return { wellness, events, fetchError: null };
  } catch (err) {
    return {
      wellness: [],
      events: [],
      fetchError: err instanceof Error ? err.message : "Kon intervals.icu niet laden.",
    };
  }
}

/** Een rij in de rennerkiezer. Al opgemaakt, zodat de client-kiezer alleen tekst hoeft te tonen. */
export type TrainerRider = {
  id: string;
  name: string;
  ftpLabel: string;
  zrlCategory: string | null;
  distanceLabel: string;
  ctlLabel: string;
  tsbLabel: string;
  adviceLabel: string;
  advicePill: string;
  pendingReviews: number;
};

/**
 * Alle renners van de trainer met hun kerncijfers voor de kiezer: 28 dagen
 * Strava, CTL/Form uit intervals.icu (30 dagen is genoeg voor de laatste stand)
 * en het aantal workouts dat op beoordeling wacht.
 */
export async function loadRiders(
  viewer: Viewer,
  assignments: AssignmentRow[],
): Promise<TrainerRider[]> {
  const athleteIds = assignments.map((assignment) => assignment.athlete_id);
  if (athleteIds.length === 0) return [];

  const since28 = new Date();
  since28.setDate(since28.getDate() - 28);

  const [{ data: profileRows }, { data: activityRows }, { data: reportRows }] = await Promise.all([
    viewer.supabase
      .from("profiles")
      .select("id, display_name, ftp_watts, weight_kg, zrl_category, zrl_division, wellness_device")
      .in("id", athleteIds),
    viewer.supabase
      .from("strava_activities")
      .select(
        "id, profile_id, name, sport_type, start_date, distance_m, total_elevation_gain_m, kudos_count, moving_time_seconds, trainer",
      )
      .in("profile_id", athleteIds)
      .gte("start_date", since28.toISOString()),
    viewer.supabase
      .from("training_workout_reports")
      .select("profile_id, metrics_json")
      .in("profile_id", athleteIds)
      .not("athlete_confirmed_at", "is", null)
      .is("trainer_reviewed_at", null),
  ]);

  const profiles = new Map(((profileRows ?? []) as ProfileRow[]).map((row) => [row.id, row]));
  const activities = byProfile((activityRows ?? []) as StravaActivityRow[]);

  const pending = new Map<string, number>();
  for (const row of (reportRows ?? []) as Array<{
    profile_id: string;
    metrics_json: WorkoutMetricsSnapshot | null;
  }>) {
    // Zonder momentopname valt er niets te beoordelen; dat is een rapportage uit
    // het oude paneel. Zelfde filter als de beoordelen-tab zelf.
    if (!row.metrics_json?.plannedTitle) continue;
    pending.set(row.profile_id, (pending.get(row.profile_id) ?? 0) + 1);
  }

  const status = await loadRiderStatus(viewer, athleteIds, profiles);

  return assignments.map((assignment) => {
    const profile = profiles.get(assignment.athlete_id);
    const totals = loadSummary(activities.get(assignment.athlete_id) ?? []);
    const rider = status.get(assignment.athlete_id);
    return {
      id: assignment.athlete_id,
      name: profile?.display_name ?? "ZWB-lid",
      ftpLabel: `${profile?.ftp_watts ?? "-"}w`,
      zrlCategory: profile?.zrl_category ?? null,
      distanceLabel: formatKm(totals.distance),
      ctlLabel: formatNumber(rider?.ctl, 1),
      tsbLabel: formatNumber(rider?.tsb, 1),
      adviceLabel: rider?.adviceLabel ?? "Herstel niet gedeeld",
      advicePill: rider?.advicePill ?? "bg-muted text-muted-foreground",
      pendingReviews: pending.get(assignment.athlete_id) ?? 0,
    };
  });
}

type RiderStatus = {
  ctl?: number;
  tsb?: number;
  adviceLabel: string;
  advicePill: string;
};

/** CTL, Form en het ZWBeterWorden-niveau per renner, uit 30 dagen wellness. */
async function loadRiderStatus(
  viewer: Viewer,
  athleteIds: string[],
  profiles: Map<string, ProfileRow>,
): Promise<Map<string, RiderStatus>> {
  const { data: connections } = await viewer.admin
    .from("intervals_connections")
    .select("profile_id, athlete_id, api_key, wellness_opt_in")
    .in("profile_id", athleteIds);

  const result = new Map<string, RiderStatus>();
  await Promise.all(
    ((connections ?? []) as IntervalsAthleteConnection[]).map(async (connection) => {
      const profile = profiles.get(connection.profile_id);
      try {
        const wellness = await fetchIntervalsWellness(connection.api_key, connection.athlete_id, 30);
        const status = computeZwbStatus(wellness, {
          wellnessOptIn: Boolean(connection.wellness_opt_in),
          zrlDivision: profile?.zrl_division,
          wellnessDevice: (profile?.wellness_device ?? null) as WellnessDevice | null,
        });
        const advice = status.recoverySummary
          ? zwbeterWordenAdvice(
              summarizeTrainingReadiness({ tsb: status.tsb, wellness: status.recoverySummary }),
              profile?.zrl_division,
            )
          : null;
        result.set(connection.profile_id, {
          ctl: status.ctl ?? undefined,
          tsb: status.tsb ?? undefined,
          adviceLabel: advice
            ? `${advice.level}/5 · ${advice.title}`
            : connection.wellness_opt_in
              ? "Geen hersteldata"
              : "Herstel niet gedeeld",
          advicePill: advice?.pill ?? "bg-muted text-muted-foreground",
        });
      } catch {
        result.set(connection.profile_id, {
          adviceLabel: "intervals.icu niet bereikbaar",
          advicePill: "bg-muted text-muted-foreground",
        });
      }
    }),
  );
  return result;
}
