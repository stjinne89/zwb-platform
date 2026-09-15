// Gedeelde dataophaal voor de ZWBeter Worden-subpagina's. Elke pagina roept
// alleen de loaders aan die ze nodig heeft; dat scheelt per pagina een handvol
// queries en één of twee intervals.icu-calls ten opzichte van de oude
// alles-in-één trainingspagina.

import { redirect } from "next/navigation";
import { after } from "next/server";
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
import {
  asFtpTestType,
  loadFtpTests,
  pickFtpTestState,
  type FtpTestRow,
  type FtpTestType,
  type FtpTestWorkout,
} from "@/lib/training/ftp-test";
import { eventWorkoutDefaults, loadScheduleEvents } from "@/lib/training/events";
import { amsterdamDayKey, computeZwbStatus, type ZwbStatus } from "@/lib/training/zwbeterworden";
import { cautionsFromSummary, memberCautions } from "@/lib/training/plan-summary";
import {
  buildComplianceContext,
  markExcludedRides,
  planIsBeingIgnored,
} from "@/lib/training/compliance";
import {
  COMPLETION_WINDOW_DAYS,
  detectCompletedWorkouts,
  pickPendingReview,
  reassignCandidates,
  type PendingReviewReport,
  type PendingReviewWorkout,
  type WorkoutMetricsSnapshot,
} from "@/lib/training/completion";
import { refreshWellnessIfStale, type WellnessDevice } from "@/lib/training/wellness";
import { STRAVA_RIDE_COLUMNS, type StravaRideRow } from "@/lib/training/ride-metrics";
import { unplannedRides, type UnplannedRide } from "@/lib/training/unplanned-rides";
import type {
  GoalRow,
  PlanRow,
  ProfileRow,
  WorkoutReportRow,
  WorkoutRow,
} from "./_components/types";
import type { PendingReview } from "./_components/workout-review-dialog";
import { formatDayMonth } from "./_components/format";
import type { RideLink } from "./_components/ride-link";
import type { PlanUpdateDefaults } from "./_components/plan-update-form";
import type { AvailabilityOptions } from "./_components/availability-form";
import type { ScheduleEventItem } from "./_components/event-choice";

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
      "id, display_name, ftp_watts, weight_kg, zrl_category, zrl_division, sex, wellness_device",
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
      // Gemeten zonetijden pas na het antwoord: een watt-stream ophalen hoeft
      // de pagina niet op te houden.
      const { admin, user } = viewer;
      after(async () => {
        const { fillZoneTimes } = await import("@/lib/training/zone-times-fill");
        await fillZoneTimes(admin, user.id, conn).catch(() => null);
      });
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

/**
 * Laatste dag waarop intervals.icu daadwerkelijk een herstelwaarde had. De
 * panelen tonen 7-daagse gemiddelden, dus zonder deze regel lijkt een bron die
 * al dagen stilstaat op een kapotte koppeling.
 */
export function lastWellnessDayOf(wellness: IntervalsWellness[]): string | null {
  return (
    wellness
      .filter(
        (day) =>
          day.restingHR != null ||
          day.hrv != null ||
          day.hrvSDNN != null ||
          day.sleepSecs != null ||
          day.readiness != null,
      )
      .map((day) => day.id)
      .sort()
      .at(-1) ?? null
  );
}

export function zwbStatusFor(
  wellness: IntervalsWellness[],
  conn: IntervalsConnection | null,
  profile: ProfileRow | null,
): ZwbStatus {
  return computeZwbStatus(wellness, {
    wellnessOptIn: Boolean(conn?.wellness_opt_in),
    sex: profile?.sex,
    wellnessDevice: (profile?.wellness_device ?? null) as WellnessDevice | null,
  });
}

/**
 * Workouts van het lid, met de datums die het in intervals.icu heeft verschoven
 * al toegepast. Door een aanpassing vervangen workouts horen niet meer in het
 * schema en filteren we eruit.
 *
 * Ook eruit: de workouts van een nog niet toegepast voorstel uit de dagelijkse
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

/** Hoe ver de schemakalender terugkijkt voor gereden ritten. */
export const SCHEDULE_RIDE_DAYS = 120;

export type ScheduleRides = {
  /** Ritten waar geen geplande training tegenover stond. */
  unplanned: UnplannedRide[];
  /** Alle ritten uit het venster, op Strava-id: dag en naam, voor het koppelen. */
  byId: Map<string, { dateKey: string; name: string }>;
};

/**
 * De ritten van het lid uit het schemavenster. Zelfde bron en venster als de
 * belastingpagina, zodat een rit die daar meetelt ook in het schema zichtbaar is.
 */
export async function loadScheduleRides(
  viewer: Viewer,
  workouts: WorkoutRow[],
  reports: WorkoutReportRow[],
  ftpWatts: number | null,
  days = SCHEDULE_RIDE_DAYS,
): Promise<ScheduleRides> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data } = await viewer.supabase
    .from("strava_activities")
    .select(STRAVA_RIDE_COLUMNS)
    .eq("profile_id", viewer.user.id)
    .gte("start_date", since)
    .order("start_date", { ascending: false })
    .limit(400);

  const rides = await markExcludedRides(
    viewer.supabase,
    viewer.user.id,
    (data ?? []) as StravaRideRow[],
  );
  if (rides.length === 0) return { unplanned: [], byId: new Map() };

  const byId = new Map(
    rides.map((ride) => [
      String(ride.id),
      { dateKey: amsterdamDayKey(new Date(ride.start_date)), name: ride.name?.trim() || "Rit" },
    ]),
  );
  const unplanned = unplannedRides(
    rides,
    workouts.map((workout) => ({
      id: workout.id,
      scheduled_at: workout.scheduled_at,
      title: workout.title,
      duration_minutes: workout.duration_minutes,
      intensity: workout.intensity,
      structure_json: workout.structure_json,
      status: workout.status,
    })),
    ftpWatts,
    reports.map((report) => ({
      workoutId: report.workout_id,
      activityId: report.paired_activity_id,
    })),
  );
  return { unplanned, byId };
}

/** De keuzes bij een rit: de training waar hij aan hangt en waar hij ook bij kan horen. */
export function rideLinkFor(
  ride: { activityId: string; dateKey: string; name: string },
  workoutId: string | null,
  workouts: WorkoutRow[],
  reports: WorkoutReportRow[],
): RideLink {
  const paired = new Set(
    reports.filter((report) => report.paired_activity_id).map((report) => report.workout_id),
  );
  return {
    activityId: ride.activityId,
    workoutId,
    rideLabel: `${ride.name} · ${formatDayMonth(`${ride.dateKey}T12:00:00`)}`,
    options: reassignCandidates(workouts, ride.dateKey, workoutId ?? "", paired).map(
      (candidate) => ({
        workoutId: candidate.id,
        label: `${candidate.title} · ${formatDayMonth(`${candidate.dayKey}T12:00:00`)}`,
      }),
    ),
  };
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Amsterdam",
  });
}

/**
 * De workout die het lid nog moet bevestigen. Draait eerst de detectie, zodat een
 * lid dat de app opent voordat de Strava-cron langskwam toch meteen zijn scherm
 * krijgt. Welke het wordt, beslist pickPendingReview: de nieuwste gekoppelde rit
 * van de afgelopen week, niet de rapportage die toevallig het laatst is
 * bijgewerkt.
 *
 * Met `requestedWorkoutId` (de link uit de pushmelding) komt precies die
 * training, ook als hij al is bevestigd.
 */
export async function loadPendingReview(
  viewer: Viewer,
  requestedWorkoutId?: string,
): Promise<PendingReview | null> {
  await detectCompletedWorkouts(viewer.admin, viewer.user.id).catch(() => null);

  let query = viewer.supabase
    .from("training_workout_reports")
    .select(
      "workout_id, paired_activity_id, metrics_json, athlete_rpe, athlete_feel, athlete_report, athlete_confirmed_at",
    )
    .eq("profile_id", viewer.user.id)
    .not("paired_activity_id", "is", null)
    .limit(50);
  query = requestedWorkoutId
    ? query.eq("workout_id", requestedWorkoutId)
    : query.is("athlete_confirmed_at", null);
  const { data: reportRows } = await query;
  const reports = (reportRows ?? []) as PendingReviewReport[];
  if (reports.length === 0) return null;

  const { data: workoutRows } = await viewer.supabase
    .from("training_workouts")
    .select("id, title, description, scheduled_at, status, superseded_at")
    .in(
      "id",
      reports.map((report) => report.workout_id),
    );
  const workouts = new Map(
    ((workoutRows ?? []) as Array<PendingReviewWorkout & { id: string; title: string; description: string | null }>).map(
      (row) => [row.id, row],
    ),
  );

  const picked = requestedWorkoutId
    ? reports.find((report) => report.metrics_json?.plannedTitle && workouts.has(report.workout_id))
    : pickPendingReview(reports, workouts, todayKeyAmsterdam());
  if (!picked?.paired_activity_id) return null;
  const workout = workouts.get(picked.workout_id);
  if (!workout) return null;

  // De rit die werkelijk gereden is: die beoordeelt het lid, niet de titel van
  // het plan. En de trainingen waar hij ook bij kan horen, voor als het lid een
  // training van een andere dag reed.
  const { data: rideRow } = await viewer.supabase
    .from("strava_activities")
    .select("id, name, start_date, moving_time_seconds, distance_m")
    .eq("profile_id", viewer.user.id)
    .eq("id", picked.paired_activity_id)
    .maybeSingle();

  let candidates: PendingReview["candidates"] = [];
  if (rideRow && !picked.athlete_confirmed_at) {
    const rideDayKey = amsterdamDayKey(new Date(rideRow.start_date));
    const from = new Date(`${rideDayKey}T12:00:00Z`);
    from.setUTCDate(from.getUTCDate() - COMPLETION_WINDOW_DAYS);
    const { data: openRows } = await viewer.supabase
      .from("training_workouts")
      .select("id, title, scheduled_at, intensity, status, origin")
      .eq("profile_id", viewer.user.id)
      .eq("status", "planned")
      .is("superseded_at", null)
      .gte("scheduled_at", from.toISOString())
      .lte("scheduled_at", `${rideDayKey}T23:59:59Z`);
    const open = openRows ?? [];
    const { data: pairedRows } = open.length
      ? await viewer.supabase
          .from("training_workout_reports")
          .select("workout_id")
          .eq("profile_id", viewer.user.id)
          .not("paired_activity_id", "is", null)
          .in(
            "workout_id",
            open.map((row) => row.id),
          )
      : { data: [] };
    candidates = reassignCandidates(
      open,
      rideDayKey,
      picked.workout_id,
      new Set((pairedRows ?? []).map((row) => row.workout_id)),
    ).map((candidate) => ({
      workoutId: candidate.id,
      label: `${candidate.title} · ${dayLabel(`${candidate.dayKey}T12:00:00Z`)}`,
    }));
  }

  return {
    workoutId: workout.id,
    title: workout.title,
    dateLabel: dayLabel(workout.scheduled_at),
    description: workout.description,
    metrics: picked.metrics_json as WorkoutMetricsSnapshot,
    athleteRpe: picked.athlete_rpe,
    athleteFeel: picked.athlete_feel,
    athleteReport: picked.athlete_report,
    ride: rideRow
      ? {
          name: rideRow.name?.trim() || "Rit",
          dateLabel: dayLabel(rideRow.start_date),
          movingMinutes:
            rideRow.moving_time_seconds == null
              ? null
              : Math.round(Number(rideRow.moving_time_seconds) / 60),
          distanceKm:
            rideRow.distance_m == null ? null : Math.round(Number(rideRow.distance_m) / 100) / 10,
        }
      : null,
    candidates,
    requested: Boolean(requestedWorkoutId),
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

/**
 * Clubevents binnen de looptijd van het lopende schema, met het antwoord van het
 * lid erbij. Events waarop 'nee' staat vallen weg — die keuze is gemaakt.
 */
export async function loadScheduleEventChoices(
  viewer: Viewer,
  plan: PlanRow | null,
): Promise<ScheduleEventItem[]> {
  if (!plan) return [];
  const today = todayKeyAmsterdam();
  const to = String(plan.end_date).slice(0, 10);
  if (to < today) return [];

  const events = await loadScheduleEvents(viewer.admin, viewer.user.id, today, to).catch(() => []);
  return events
    .filter((event) => event.rsvp !== "no")
    .map((event) => ({
      id: event.id,
      title: event.title,
      type: event.type,
      startAt: event.start_at,
      dateLabel: new Date(event.start_at).toLocaleDateString("nl-NL", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Europe/Amsterdam",
      }),
      durationMinutes: eventWorkoutDefaults(event).durationMinutes,
      rsvp: event.rsvp,
      inSchedule: event.inSchedule,
      inIntervals: event.inIntervals,
    }));
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
    planEndDate: String(plan.end_date).slice(0, 10),
    goalType: goal.goal_type,
    targetDate: goal.target_date,
    maxHoursPerWeek:
      goal.max_hours_per_week == null ? null : Number(goal.max_hours_per_week),
    desiredIntensity: goal.desired_intensity,
  };
}

/** Teamlidmaatschap is het concrete signaal dat iemand ZRL rijdt; een ingevulde
 * categorie alleen betekent nog niet dat ZRL ook het trainingsdoel is. */
export async function loadZrlTeamMembership(viewer: Viewer): Promise<boolean> {
  const { data } = await viewer.admin
    .from("team_members")
    .select("teams!inner(type)")
    .eq("profile_id", viewer.user.id)
    .eq("teams.type", "zrl")
    .limit(1);
  return Boolean(data?.length);
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

export type PlannedFtpTest = {
  workoutId: string;
  date: string;
  testType: FtpTestType;
};

export type FtpTestState = {
  todayKey: string;
  /** Een test die nog moet komen. */
  upcoming: PlannedFtpTest | null;
  /** Een test die geweest is en waarvan de uitslag nog ontbreekt. */
  awaitingResult: PlannedFtpTest | null;
  lastTest: FtpTestRow | null;
};

/**
 * Waar een lid staat met zijn FTP-test: staat er één klaar, wacht er één op een
 * uitslag, en wat was de vorige. Of een test op een uitslag wacht, hangt af van
 * de uitslagen zelf en niet van de workoutstatus: de ritsync zet een gereden
 * test op 'completed'. Zie pickFtpTestState().
 *
 * `profileId` is er voor het trainerscherm, waar het inplannen woont; zonder die
 * parameter gaat het over de kijker zelf.
 */
export async function loadFtpTestState(
  viewer: Viewer,
  profileId: string = viewer.user.id,
): Promise<FtpTestState> {
  const todayKey = todayKeyAmsterdam();
  const [{ data: rows }, tests] = await Promise.all([
    viewer.admin
      .from("training_workouts")
      .select("id, scheduled_at, test_type, status, origin")
      .eq("profile_id", profileId)
      .not("test_type", "is", null)
      .is("superseded_at", null)
      .order("scheduled_at", { ascending: true }),
    loadFtpTests(viewer.admin, profileId, 50).catch(() => []),
  ]);

  const workouts = (rows ?? []).flatMap((row): FtpTestWorkout[] => {
    const testType = asFtpTestType(row.test_type);
    if (!testType) return [];
    return [
      {
        workoutId: row.id as string,
        date: String(row.scheduled_at).slice(0, 10),
        testType,
        status: String(row.status),
        origin: String(row.origin),
      },
    ];
  });
  const state = pickFtpTestState(workouts, tests, todayKey);
  const brief = (test: FtpTestWorkout | null): PlannedFtpTest | null =>
    test ? { workoutId: test.workoutId, date: test.date, testType: test.testType } : null;

  return {
    todayKey,
    upcoming: brief(state.upcoming),
    awaitingResult: brief(state.awaitingResult),
    lastTest: tests[0] ?? null,
  };
}

/**
 * De "Let op"-regels van één schema. Bewust op plan_id van de wórkout en niet op
 * het lopende basisplan: een herziening draagt haar eigen cautions, en dat is de
 * generatie die de duur van die dag heeft bepaald.
 */
export async function loadPlanCautions(
  viewer: Viewer,
  planId: string | null | undefined,
): Promise<string[]> {
  if (!planId) return [];
  const { data } = await viewer.supabase
    .from("training_plans")
    .select("summary")
    .eq("id", planId)
    .maybeSingle();
  return memberCautions(cautionsFromSummary(data?.summary as string | null));
}

/**
 * Hoeveel trainingen dit lid achter elkaar heeft laten lopen, of null zolang het
 * schema gewoon draait. Dezelfde regel als de rem op de herzieningen
 * (planIsIgnored in replan.ts), zodat het lid geen vraag krijgt over iets dat wel
 * gewoon doorloopt — of andersom.
 */
export async function loadIgnoredStreak(viewer: Viewer): Promise<number | null> {
  const compliance = await buildComplianceContext(viewer.admin, viewer.user.id).catch(() => null);
  if (!compliance || !planIsBeingIgnored(compliance.workouts)) return null;

  let streak = 0;
  for (const workout of [...compliance.workouts].reverse()) {
    if (workout.verdict !== "niet_gereden") break;
    streak += 1;
  }
  return streak;
}
