// Gedeelde dataophaal voor de ZWBeter Worden-subpagina's. Elke pagina roept
// alleen de loaders aan die ze nodig heeft; dat scheelt per pagina een handvol
// queries en één of twee intervals.icu-calls ten opzichte van de oude
// alles-in-één trainingspagina.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  athletePhysique,
  fetchIntervalsAthlete,
  fetchIntervalsEvents,
  fetchIntervalsWellness,
  type IntervalsEvent,
  type IntervalsWellness,
} from "@/lib/intervals/client";
import {
  ACTIVITY_SYNC_MAX_AGE_MS,
  syncIntervalsActivities,
} from "@/lib/intervals/activities";
import { syncWorkoutDatesFromIntervals } from "@/lib/training/publish";
import { computeZwbStatus, type ZwbStatus } from "@/lib/training/zwbeterworden";
import {
  detectCompletedWorkouts,
  type WorkoutMetricsSnapshot,
} from "@/lib/training/completion";
import { refreshWellnessIfStale, type WellnessDevice } from "@/lib/training/wellness";
import type { GoalRow, PlanRow, ProfileRow, WorkoutRow } from "./_components/types";
import type { PendingReview } from "./_components/workout-review-dialog";
import type { PlanUpdateDefaults } from "./_components/plan-update-form";

export type IntervalsConnection = {
  athlete_id: string;
  athlete_name: string | null;
  api_key: string;
  updated_at: string;
  wellness_opt_in: boolean | null;
};

export type Viewer = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  admin: ReturnType<typeof createAdminClient>;
  access: Awaited<ReturnType<typeof getCurrentUserAccess>>;
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUserAccess>>["user"]>;
};

export async function requireViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");
  return { supabase, admin: createAdminClient(), access, user: access.user };
}

export function todayKeyAmsterdam() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

export async function loadProfile(viewer: Viewer): Promise<ProfileRow | null> {
  const { data } = await viewer.supabase
    .from("profiles")
    .select(
      "id, display_name, ftp_watts, weight_kg, zrl_category, zrl_division, wellness_device",
    )
    .eq("id", viewer.user.id)
    .single();
  return (data ?? null) as ProfileRow | null;
}

export async function loadConnection(viewer: Viewer): Promise<IntervalsConnection | null> {
  const { data } = await viewer.supabase
    .from("intervals_connections")
    .select("athlete_id, athlete_name, api_key, updated_at, wellness_opt_in")
    .eq("profile_id", viewer.user.id)
    .maybeSingle();
  return (data ?? null) as IntervalsConnection | null;
}

export type IntervalsSnapshot = {
  wellness: IntervalsWellness[];
  events: IntervalsEvent[];
  intervalsFtp: number | null;
  fetchError: string | null;
};

/**
 * Haalt in één keer op wat we van intervals.icu nodig hebben. `wellnessDays: 0`
 * of `eventDays: 0` slaat die call over, zodat een pagina die alleen de
 * kalender toont niet ook 730 dagen wellness ophaalt.
 */
export async function loadIntervalsSnapshot(
  viewer: Viewer,
  conn: IntervalsConnection | null,
  options: {
    wellnessDays?: number;
    eventDays?: number;
    withAthleteFtp?: boolean;
    syncActivities?: boolean;
  } = {},
): Promise<IntervalsSnapshot> {
  const empty: IntervalsSnapshot = {
    wellness: [],
    events: [],
    intervalsFtp: null,
    fetchError: null,
  };
  if (!conn?.api_key || !conn.athlete_id) return empty;

  const { wellnessDays = 0, eventDays = 0, withAthleteFtp = false, syncActivities = false } =
    options;

  try {
    const athletePromise = withAthleteFtp
      ? fetchIntervalsAthlete(conn.api_key).catch(() => null)
      : Promise.resolve(null);
    const [wellness, events] = await Promise.all([
      wellnessDays > 0
        ? fetchIntervalsWellness(conn.api_key, conn.athlete_id, wellnessDays)
        : Promise.resolve([] as IntervalsWellness[]),
      eventDays > 0
        ? fetchIntervalsEvents(conn.api_key, conn.athlete_id, eventDays)
        : Promise.resolve([] as IntervalsEvent[]),
    ]);
    const intervalsFtp = withAthleteFtp
      ? athletePhysique(await athletePromise).ftpWatts
      : null;

    if (syncActivities) {
      await refreshIntervalsActivitiesIfStale(viewer, conn);
    }

    // Zelfherstellend: de opgeslagen kopie voor de AI-planner bijwerken met de
    // records die we hier tóch al hebben. Voorheen gebeurde dat alleen op het
    // moment dat het lid de opt-in aanzette, dus een mislukte eerste poging
    // bleef voorgoed een lege tabel.
    if (conn.wellness_opt_in && wellness.length > 0) {
      await refreshWellnessIfStale(viewer.admin, viewer.user.id, {
        apiKey: conn.api_key,
        athleteId: conn.athlete_id,
        records: wellness,
      });
    }

    return { wellness, events, intervalsFtp, fetchError: null };
  } catch (err) {
    return {
      ...empty,
      fetchError: err instanceof Error ? err.message : "Onbekende fout.",
    };
  }
}

/** Belasting per rit bijwerken als de opgeslagen versie verouderd is. */
async function refreshIntervalsActivitiesIfStale(
  viewer: Viewer,
  conn: IntervalsConnection,
) {
  const { data: newest } = await viewer.admin
    .from("intervals_activities")
    .select("synced_at")
    .eq("profile_id", viewer.user.id)
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const staleSince = Date.now() - ACTIVITY_SYNC_MAX_AGE_MS;
  if (newest && new Date(newest.synced_at).getTime() >= staleSince) return;
  await syncIntervalsActivities(viewer.admin, {
    profile_id: viewer.user.id,
    athlete_id: conn.athlete_id,
    api_key: conn.api_key,
  }).catch(() => null);
}

export function zwbStatusFor(
  wellness: IntervalsWellness[],
  conn: IntervalsConnection | null,
  profile: ProfileRow | null,
): ZwbStatus {
  return computeZwbStatus(wellness, {
    wellnessOptIn: Boolean(conn?.wellness_opt_in),
    zrlDivision: profile?.zrl_division,
    wellnessDevice: (profile?.wellness_device ?? null) as WellnessDevice | null,
  });
}

/**
 * Workouts van het lid, met de datums die het in intervals.icu heeft verschoven
 * al toegepast. Door een aanpassing vervangen workouts horen niet meer in het
 * schema en filteren we eruit.
 */
export async function loadMemberWorkouts(
  viewer: Viewer,
  events: IntervalsEvent[],
): Promise<WorkoutRow[]> {
  const { data } = await viewer.supabase
    .from("training_workouts")
    .select("*")
    .is("superseded_at", null)
    .eq("profile_id", viewer.user.id)
    .order("scheduled_at", { ascending: true })
    .limit(200);

  const rows = (data ?? []) as WorkoutRow[];
  const movedDates = events.length
    ? await syncWorkoutDatesFromIntervals(viewer.admin, rows, events).catch(
        () => new Map<string, string>(),
      )
    : new Map<string, string>();

  return (
    movedDates.size
      ? rows.map((workout) =>
          movedDates.has(workout.id)
            ? { ...workout, scheduled_at: movedDates.get(workout.id)! }
            : workout,
        )
      : rows
  ).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
}

/**
 * De workout die het lid nog moet bevestigen: afgerond, maar zonder
 * athlete_confirmed_at. Draait eerst de detectie, zodat een lid dat de app
 * opent voordat de Strava-cron langskwam toch meteen zijn scherm krijgt.
 */
export async function loadPendingReview(
  viewer: Viewer,
  requestedWorkoutId?: string,
): Promise<PendingReview | null> {
  await detectCompletedWorkouts(viewer.admin, viewer.user.id).catch(() => null);

  let query = viewer.supabase
    .from("training_workout_reports")
    .select(
      "workout_id, metrics_json, athlete_rpe, athlete_feel, athlete_report, athlete_confirmed_at",
    )
    .eq("profile_id", viewer.user.id)
    .order("updated_at", { ascending: false })
    .limit(1);
  query = requestedWorkoutId
    ? query.eq("workout_id", requestedWorkoutId)
    : query.is("athlete_confirmed_at", null);

  const { data: reportRows } = await query;
  const report = (reportRows ?? [])[0] as
    | {
        workout_id: string;
        metrics_json: WorkoutMetricsSnapshot | null;
        athlete_rpe: number | null;
        athlete_feel: string | null;
        athlete_report: string | null;
      }
    | undefined;
  // Zonder momentopname is er niets te tonen; dat is een rapportage die langs de
  // oude weg (het rapportage-paneel) is aangemaakt.
  if (!report?.metrics_json?.plannedTitle) return null;

  const { data: workout } = await viewer.supabase
    .from("training_workouts")
    .select("id, title, description, scheduled_at")
    .eq("id", report.workout_id)
    .maybeSingle();
  if (!workout) return null;

  return {
    workoutId: workout.id,
    title: workout.title,
    dateLabel: new Date(workout.scheduled_at).toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/Amsterdam",
    }),
    description: workout.description,
    metrics: report.metrics_json,
    athleteRpe: report.athlete_rpe,
    athleteFeel: report.athlete_feel,
    athleteReport: report.athlete_report,
  };
}

/**
 * Het schema dat nu loopt: nog niet afgelopen, niet gearchiveerd, en bij
 * meerdere kandidaten de meest recente. Dit is het schema dat "bijwerken"
 * aanpast.
 */
export function activePlan(plans: PlanRow[]): PlanRow | null {
  const today = todayKeyAmsterdam();
  return (
    plans
      .filter((plan) => plan.status !== "archived" && String(plan.end_date).slice(0, 10) >= today)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
  );
}

/** Voorgevulde waarden voor het bijwerkformulier; null zonder gekoppeld doel. */
export function planUpdateDefaults(
  plan: PlanRow | null,
  goals: GoalRow[],
): PlanUpdateDefaults | null {
  if (!plan?.goal_id) return null;
  const goal = goals.find((row) => row.id === plan.goal_id);
  if (!goal) return null;
  return {
    planId: plan.id,
    planTitle: plan.title,
    goalType: goal.goal_type,
    targetDate: goal.target_date,
    maxHoursPerWeek:
      goal.max_hours_per_week == null ? null : Number(goal.max_hours_per_week),
    desiredIntensity: goal.desired_intensity,
    availableDays: goal.available_days ?? [],
  };
}

/** Events van vandaag of later, oplopend, maximaal `limit`. */
export function upcomingIntervalsEvents(events: IntervalsEvent[], limit = 5) {
  const today = new Date().toISOString().slice(0, 10);
  return [...events]
    .filter((event) => event.start_date_local >= today)
    .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local))
    .slice(0, limit);
}
