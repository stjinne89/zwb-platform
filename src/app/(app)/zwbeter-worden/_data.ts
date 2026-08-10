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
import { loadAvailability, mondayKey, shiftWeeks } from "@/lib/training/availability";
import { computeZwbStatus, type ZwbStatus } from "@/lib/training/zwbeterworden";
import {
  detectCompletedWorkouts,
  type WorkoutMetricsSnapshot,
} from "@/lib/training/completion";
import { refreshWellnessIfStale, type WellnessDevice } from "@/lib/training/wellness";
import type { GoalRow, PlanRow, ProfileRow, WorkoutRow } from "./_components/types";
import type { PendingReview } from "./_components/workout-review-dialog";
import type { PlanUpdateDefaults } from "./_components/plan-update-form";
import type { AvailabilityOptions } from "./_components/availability-form";

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
 *
 * Ook eruit: de workouts van een nog niet toegepast voorstel uit de nachtelijke
 * bijstelling. Die staan al wel in de database, maar zouden anders naast de
 * bestaande training van diezelfde dag verschijnen — precies de dubbeling die we
 * met het voorstel-strookje wilden voorkomen.
 */
export async function loadMemberWorkouts(
  viewer: Viewer,
  events: IntervalsEvent[],
): Promise<WorkoutRow[]> {
  const [{ data }, { data: proposalPlans }] = await Promise.all([
    viewer.supabase
      .from("training_workouts")
      .select("*")
      .is("superseded_at", null)
      .eq("profile_id", viewer.user.id)
      .order("scheduled_at", { ascending: true })
      .limit(200),
    viewer.supabase
      .from("training_plans")
      .select("id")
      .eq("profile_id", viewer.user.id)
      .eq("status", "draft")
      .eq("adaptation_kind", "daily"),
  ]);

  const proposalIds = new Set((proposalPlans ?? []).map((plan) => plan.id as string));
  const rows = ((data ?? []) as WorkoutRow[]).filter((row) => !proposalIds.has(row.plan_id));
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
 * Alle schema's van het lid, gegroepeerd per familie: een basisplan met de
 * aanpassingen die eraan hangen. Voorheen haalde de schemapagina de plannen plat
 * op met een limiet, waardoor elke dagelijkse aanpassing als eigen programma in
 * de lijst kwam en het echte schema er binnen een week uit duwde.
 */
export async function loadPlanFamilies(viewer: Viewer, limit = 5) {
  const { data: roots } = await viewer.supabase
    .from("training_plans")
    .select("*")
    .eq("profile_id", viewer.user.id)
    .is("parent_plan_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rootIds = (roots ?? []).map((plan) => plan.id as string);
  if (rootIds.length === 0) return [] as PlanRow[];

  const { data: derived } = await viewer.supabase
    .from("training_plans")
    .select("*")
    .eq("profile_id", viewer.user.id)
    .not("parent_plan_id", "is", null)
    .in("root_plan_id", rootIds)
    .order("created_at", { ascending: false })
    .limit(200);

  return [...(roots ?? []), ...(derived ?? [])] as PlanRow[];
}

/**
 * Het schema dat nu loopt: een basisplan dat nog niet afgelopen is en niet
 * gearchiveerd, en bij meerdere kandidaten de meest recente. Dit is het schema
 * dat "bijwerken" aanpast — een aanpassing zelf is dat nadrukkelijk niet, die
 * loopt maar één dag en zou de bijwerking tot een lege operatie maken.
 */
export function activePlan(plans: PlanRow[]): PlanRow | null {
  const today = todayKeyAmsterdam();
  return (
    plans
      .filter(
        (plan) =>
          plan.parent_plan_id == null &&
          plan.status !== "archived" &&
          String(plan.end_date).slice(0, 10) >= today,
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
  );
}

/**
 * De drie weken die het beschikbaarheidsformulier toont: deze week, volgende
 * week en het standaardpatroon. Elke week valt terug op de standaard zolang er
 * niets aparts is ingevuld, zodat het lid alleen hoeft in te vullen wat afwijkt.
 */
export async function loadAvailabilityOptions(viewer: Viewer): Promise<AvailabilityOptions> {
  const thisWeek = mondayKey(todayKeyAmsterdam());
  const nextWeek = shiftWeeks(thisWeek, 1);

  const [current, next, standard] = await Promise.all([
    loadAvailability(viewer.admin, viewer.user.id, thisWeek),
    loadAvailability(viewer.admin, viewer.user.id, nextWeek),
    loadAvailability(viewer.admin, viewer.user.id, null),
  ]);

  return {
    weeks: [
      { key: "deze", label: "Deze week", weekStart: thisWeek, availability: current },
      { key: "volgende", label: "Volgende week", weekStart: nextWeek, availability: next },
      { key: "standaard", label: "Standaard", weekStart: null, availability: standard },
    ],
  };
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

/**
 * De intervals.icu-events die géén ZWB-workout zijn.
 *
 * Een gepubliceerde workout bestaat in beide bronnen: als rij in
 * training_workouts én als event dat wij daar zelf hebben neergezet. Wie ze
 * allebei toont, ziet elke geplande training twee keer — één keer in de kleur
 * van zijn intensiteit en één keer als naamloos event.
 *
 * We herkennen ons eigen werk aan het event-id dat we bij het publiceren hebben
 * opgeslagen, en anders aan de external_id die we zelf meegeven — die tweede
 * vangt de gevallen op waarin het opgeslagen id niet meer klopt.
 *
 * Allebei vergeleken met de workouts die het lid nú in zijn schema heeft. Een
 * `zwb-`-event zonder actieve workout is een wees: een sessie die wij ooit in
 * intervals.icu hebben gezet en daarna hebben vervangen zonder hem daar op te
 * ruimen. Die tonen we juist wél. Op alleen de `zwb-`-prefix filteren maakte
 * zo'n dag in ZWB helemaal leeg terwijl er in intervals.icu gewoon een training
 * stond — en dat is precies het verschil dat je niet wilt verbergen.
 */
export function externalIntervalsEvents(
  events: IntervalsEvent[],
  workouts: WorkoutRow[],
): IntervalsEvent[] {
  const ownEventIds = new Set(
    workouts.map((workout) => workout.intervals_event_id).filter(Boolean) as string[],
  );
  const ownExternalIds = new Set(
    workouts.map((workout) => workout.intervals_external_id).filter(Boolean) as string[],
  );
  return events.filter(
    (event) =>
      !ownEventIds.has(String(event.id)) &&
      !(event.external_id != null && ownExternalIds.has(String(event.external_id))),
  );
}

/** Events van vandaag of later, oplopend, maximaal `limit`. */
export function upcomingIntervalsEvents(events: IntervalsEvent[], limit = 5) {
  const today = new Date().toISOString().slice(0, 10);
  return [...events]
    .filter((event) => event.start_date_local >= today)
    .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local))
    .slice(0, limit);
}
