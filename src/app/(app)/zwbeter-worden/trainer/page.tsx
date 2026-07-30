import { EmptyState } from "@/components/app-ui";
import {
  fetchIntervalsEvents,
  fetchIntervalsPowerCurve,
  fetchIntervalsWellness,
  type IntervalsEvent,
} from "@/lib/intervals/client";
import { computeZwbStatus } from "@/lib/training/zwbeterworden";
import type { WellnessDevice } from "@/lib/training/wellness";
import { toTrainingLoadPoints, type TrainingLoadPoint } from "@/lib/training/load-points";
import type { PowerCurvePoint } from "@/components/charts/power-curve-chart";
import {
  COMPARISON_RIDER_COLUMNS,
  comparisonRidersFromRows,
} from "@/lib/teams/comparison-riders";
import type { WorkoutMetricsSnapshot } from "@/lib/training/completion";
import { CoachWorkspace } from "../_components/coach-workspace";
import { ReviewQueue, type ReviewQueueItem } from "../_components/review-queue";
import { byPlan, byProfile, byWorkout, paramString } from "../_components/format";
import type {
  AiGenerationRow,
  AssignmentRow,
  CoachLoadMetric,
  CoachRecoveryState,
  GoalRow,
  PlanRow,
  ProfileRow,
  SearchParamsProp,
  StravaActivityRow,
  WorkoutReportRow,
  WorkoutRow,
} from "../_components/types";
import { PlanUpdateForm } from "../_components/plan-update-form";
import {
  WorkoutLibraryPanel,
  type WorkoutTemplateRow,
} from "../_components/workout-library-panel";
import { activePlan, planUpdateDefaults, requireViewer, todayKeyAmsterdam } from "../_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export default async function ZwbeterWordenTrainerPage({ searchParams }: SearchParamsProp) {
  const params = (await searchParams) ?? {};
  const requestedAthleteId = paramString(params.athlete);
  const viewer = await requireViewer();
  if (!viewer.access.has("training.view_assigned")) {
    return <EmptyState>Je hebt geen trainer-rechten.</EmptyState>;
  }

  const now = new Date();
  const since21Workouts = new Date(now);
  since21Workouts.setDate(since21Workouts.getDate() - 21);
  const since28 = new Date(now);
  since28.setDate(since28.getDate() - 28);

  const { data: assignmentRows } = await viewer.supabase
    .from("training_coach_assignments")
    .select("id, athlete_id, trainer_id, status, notes, granted_at")
    .eq("trainer_id", viewer.user.id)
    .eq("status", "active")
    .order("granted_at", { ascending: false });
  const assignments = (assignmentRows ?? []) as AssignmentRow[];
  const athleteIds = assignments.map((assignment) => assignment.athlete_id);

  let profiles = new Map<string, ProfileRow>();
  let goals = new Map<string, GoalRow[]>();
  let activities = new Map<string, StravaActivityRow[]>();
  let plans = new Map<string, PlanRow[]>();
  let workoutsByPlan = new Map<string, WorkoutRow[]>();
  let workoutsByProfile = new Map<string, WorkoutRow[]>();
  let reportsByWorkout = new Map<string, WorkoutReportRow>();
  let aiGenerations: AiGenerationRow[] = [];

  if (athleteIds.length > 0) {
    const [
      { data: profileRows },
      { data: goalRows },
      { data: activityRows },
      { data: planRows },
      { data: workoutRows },
      { data: reportRows },
      { data: aiGenerationRows },
    ] = await Promise.all([
      viewer.supabase
        .from("profiles")
        .select(
          "id, display_name, ftp_watts, weight_kg, zrl_category, zrl_division, wellness_device",
        )
        .in("id", athleteIds),
      viewer.supabase
        .from("training_goals")
        .select("*")
        .in("profile_id", athleteIds)
        .order("created_at", { ascending: false }),
      viewer.supabase
        .from("strava_activities")
        .select(
          "id, profile_id, name, sport_type, start_date, distance_m, total_elevation_gain_m, kudos_count, moving_time_seconds, trainer",
        )
        .in("profile_id", athleteIds)
        .gte("start_date", since28.toISOString())
        .order("start_date", { ascending: false }),
      viewer.supabase
        .from("training_plans")
        .select("*")
        .in("profile_id", athleteIds)
        .order("created_at", { ascending: false }),
      viewer.supabase
        .from("training_workouts")
        .select("*")
        .is("superseded_at", null)
        .in("profile_id", athleteIds)
        .gte("scheduled_at", since21Workouts.toISOString())
        .order("scheduled_at", { ascending: true }),
      viewer.supabase
        .from("training_workout_reports")
        .select("*")
        .in("profile_id", athleteIds)
        .order("updated_at", { ascending: false }),
      viewer.supabase
        .from("training_ai_generations")
        .select("id, profile_id, goal_id, status, error, created_at")
        .in("profile_id", athleteIds)
        .in("status", ["queued", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    profiles = new Map(((profileRows ?? []) as ProfileRow[]).map((p) => [p.id, p]));
    goals = byProfile((goalRows ?? []) as GoalRow[]);
    activities = byProfile((activityRows ?? []) as StravaActivityRow[]);
    plans = byProfile((planRows ?? []) as PlanRow[]);
    const workouts = (workoutRows ?? []) as WorkoutRow[];
    workoutsByPlan = byPlan(workouts);
    workoutsByProfile = byProfile(workouts);
    reportsByWorkout = byWorkout((reportRows ?? []) as WorkoutReportRow[]);
    aiGenerations = (aiGenerationRows ?? []) as AiGenerationRow[];
  }

  const loadMetrics = new Map<string, CoachLoadMetric>();
  const intervalEvents = new Map<string, IntervalsEvent[]>();
  const intervalAthleteIds = new Map<string, string>();
  const coachWellness = new Map<string, CoachRecoveryState>();
  // De cockpit toont grafiek en curve alleen voor de geselecteerde renner.
  const selectedAthleteId =
    assignments.find((assignment) => assignment.athlete_id === requestedAthleteId)?.athlete_id ??
    assignments[0]?.athlete_id;
  // Map i.p.v. losse variabelen: de fetch-lus is async en mag geen buitenliggende
  // binding herschrijven.
  const selectedDetail = new Map<"load" | "power", TrainingLoadPoint[] | PowerCurvePoint[]>();

  if (athleteIds.length > 0) {
    const { data: connections } = await viewer.admin
      .from("intervals_connections")
      .select("profile_id, athlete_id, api_key, wellness_opt_in")
      .in("profile_id", athleteIds);

    await Promise.all(
      (
        (connections ?? []) as Array<{
          profile_id: string;
          athlete_id: string;
          api_key: string;
          wellness_opt_in: boolean | null;
        }>
      ).map(async (connection) => {
        // Alleen de geselecteerde renner krijgt de lange reeks en de curve;
        // voor de lijst is 30 dagen genoeg en blijft het één aanroep per renner.
        const isSelected = connection.profile_id === selectedAthleteId;
        try {
          const [rows, upcoming, curve] = await Promise.all([
            fetchIntervalsWellness(connection.api_key, connection.athlete_id, isSelected ? 730 : 30),
            fetchIntervalsEvents(connection.api_key, connection.athlete_id, 14),
            isSelected
              ? fetchIntervalsPowerCurve(connection.api_key, connection.athlete_id, "90d").catch(
                  () => null,
                )
              : Promise.resolve(null),
          ]);
          intervalAthleteIds.set(connection.profile_id, connection.athlete_id);
          const status = computeZwbStatus(rows, {
            wellnessOptIn: Boolean(connection.wellness_opt_in),
            zrlDivision: profiles.get(connection.profile_id)?.zrl_division,
            wellnessDevice: (profiles.get(connection.profile_id)?.wellness_device ??
              null) as WellnessDevice | null,
          });
          loadMetrics.set(connection.profile_id, {
            ctl: status.ctl ?? undefined,
            tsb: status.tsb ?? undefined,
            eftp: status.eftp ?? undefined,
          });
          coachWellness.set(connection.profile_id, {
            optedIn: Boolean(connection.wellness_opt_in),
            summary: status.recoverySummary,
          });
          if (isSelected) {
            selectedDetail.set("load", toTrainingLoadPoints(rows));
            selectedDetail.set("power", curve?.points ?? []);
          }
          intervalEvents.set(
            connection.profile_id,
            upcoming
              .filter((event) => event.start_date_local >= new Date().toISOString().slice(0, 10))
              .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local))
              .slice(0, 5),
          );
        } catch (err) {
          loadMetrics.set(connection.profile_id, {
            error: err instanceof Error ? err.message : "Kon intervals.icu niet laden.",
          });
        }
      }),
    );
  }

  const loadPoints = (selectedDetail.get("load") ?? []) as TrainingLoadPoint[];
  const powerPoints = (selectedDetail.get("power") ?? []) as PowerCurvePoint[];
  const reviewQueue = selectedAthleteId
    ? await loadReviewQueue(viewer, selectedAthleteId, workoutsByProfile)
    : [];
  const selectedActivePlan = selectedAthleteId
    ? activePlan(plans.get(selectedAthleteId) ?? [])
    : null;
  const updateDefaults = planUpdateDefaults(
    selectedActivePlan,
    selectedAthleteId ? goals.get(selectedAthleteId) ?? [] : [],
  );
  const { data: templateRows } = await viewer.supabase
    .from("training_workout_templates")
    .select("id, form, title, description, duration_minutes, intensity, is_standard, created_by")
    .order("form")
    .order("duration_minutes");

  // Vergelijkingscurves voor de trainer: dezelfde clubbrede momentopname als op
  // de vermogenspagina, leesbaar via RLS dus zonder admin-client.
  const { data: comparisonRows } =
    powerPoints.length > 1 && selectedAthleteId
      ? await viewer.supabase
          .from("rider_power_profiles")
          .select(COMPARISON_RIDER_COLUMNS)
          .in("sync_status", ["ok", "partial"])
          .neq("profile_id", selectedAthleteId)
      : { data: null };

  return (
    <section className="space-y-4">
      <CoachWorkspace
        assignments={assignments}
        profiles={profiles}
        goals={goals}
        activities={activities}
        plans={plans}
        workoutsByPlan={workoutsByPlan}
        workoutsByProfile={workoutsByProfile}
        intervalEvents={intervalEvents}
        intervalAthleteIds={intervalAthleteIds}
        loadMetrics={loadMetrics}
        wellness={coachWellness}
        reportsByWorkout={reportsByWorkout}
        aiGenerations={aiGenerations}
        selectedAthleteId={selectedAthleteId}
        loadPoints={loadPoints}
        powerPoints={powerPoints}
        comparisonRiders={comparisonRidersFromRows(comparisonRows)}
        todayKey={todayKeyAmsterdam()}
        canUseAi={Boolean(process.env.OPENAI_API_KEY)}
        canGenerateAi={viewer.access.has("training.ai_generate")}
        canPublish={viewer.access.has("training.publish_plans")}
        nowMs={now.getTime()}
        reviewQueue={<ReviewQueue items={reviewQueue} />}
        planTools={
          <div className="space-y-3">
            {updateDefaults ? <PlanUpdateForm defaults={updateDefaults} /> : null}
            <WorkoutLibraryPanel
              templates={(templateRows ?? []) as WorkoutTemplateRow[]}
              planId={selectedActivePlan?.id ?? null}
              defaultDate={todayKeyAmsterdam()}
              viewerId={viewer.user.id}
            />
          </div>
        }
      />
    </section>
  );
}

/**
 * Bevestigde, nog niet beoordeelde workouts van de geselecteerde renner. De
 * momentopname zit al in de rapportage; alleen de titel en datum halen we uit de
 * al geladen workouts van deze renner.
 */
async function loadReviewQueue(
  viewer: Awaited<ReturnType<typeof requireViewer>>,
  athleteId: string,
  workoutsByProfile: Map<string, WorkoutRow[]>,
): Promise<ReviewQueueItem[]> {
  const { data } = await viewer.supabase
    .from("training_workout_reports")
    .select(
      "workout_id, metrics_json, athlete_rpe, athlete_feel, athlete_report, athlete_confirmed_at",
    )
    .eq("profile_id", athleteId)
    .not("athlete_confirmed_at", "is", null)
    .is("trainer_reviewed_at", null)
    .order("athlete_confirmed_at", { ascending: false })
    .limit(10);

  const workouts = new Map(
    (workoutsByProfile.get(athleteId) ?? []).map((workout) => [workout.id, workout]),
  );

  return ((data ?? []) as Array<{
    workout_id: string;
    metrics_json: WorkoutMetricsSnapshot | null;
    athlete_rpe: number | null;
    athlete_feel: string | null;
    athlete_report: string | null;
    athlete_confirmed_at: string;
  }>).flatMap((row) => {
    const workout = workouts.get(row.workout_id);
    // Zonder momentopname valt er niets te beoordelen; dat is een rapportage uit
    // het oude paneel, die staat al bij de workout zelf.
    if (!workout || !row.metrics_json?.plannedTitle) return [];
    return [
      {
        workoutId: row.workout_id,
        title: workout.title,
        scheduledAt: workout.scheduled_at,
        metrics: row.metrics_json,
        athleteRpe: row.athlete_rpe,
        athleteFeel: row.athlete_feel,
        athleteReport: row.athlete_report,
        confirmedAt: row.athlete_confirmed_at,
      },
    ];
  });
}
