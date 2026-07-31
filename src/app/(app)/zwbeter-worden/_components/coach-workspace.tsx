// De trainer-cockpit: rennerlijst links, en rechts belasting, herstel, doelen,
// uitvoering en de schema's van de geselecteerde renner.

import Link from "next/link";
import {
  Activity,
  Calendar,
  ExternalLink,
  Mountain,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import type { IntervalsEvent } from "@/lib/intervals/client";
import {
  defaultTrainingPrompt,
  estimateTrainingLoad,
  intensityLabel,
  normalizeWorkoutBlocks,
  projectCtl,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { zwbeterWordenAdvice } from "@/lib/training/zwbeterworden";
import { summarizeTrainingReadiness } from "@/lib/training/wellness";
import type { TrainingLoadPoint } from "@/lib/training/load-points";
import {
  PowerCurveChart,
  type ComparisonRider,
  type FatigueCurve,
  type PowerCurvePoint,
} from "@/components/charts/power-curve-chart";
import { downsample } from "@/lib/teams/comparison-riders";
import { updateTrainingPlan } from "../_actions";
import { AiDraftForm } from "./ai-draft-form";
import { DeleteTrainingPlanButton } from "./delete-training-plan-button";
import { PlanActions } from "./plan-actions";
import { TrainingLoadMetrics } from "./training-load-chart";
import {
  formAction,
  formatDayMonth,
  formatHours,
  formatKm,
  formatMeters,
  formatNumber,
  formatWellnessDate,
  GOAL_LABELS,
  loadSummary,
  toNum,
} from "./format";
import {
  CollapsibleCard,
  MetricCard,
  PlanBadge,
  RecoveryStat,
  recoveryPillClass,
  recoveryStateLabel,
} from "./ui";
import { WorkoutTitle } from "./workout-blocks";
import { WorkoutList } from "./workout-list";
import type {
  AiGenerationRow,
  AssignmentRow,
  CoachLoadMetric,
  CoachRecoveryState,
  GoalRow,
  PlanRow,
  ProfileRow,
  StravaActivityRow,
  WorkoutReportRow,
  WorkoutRow,
} from "./types";

export function CoachWorkspace({
  assignments,
  profiles,
  goals,
  activities,
  plans,
  workoutsByPlan,
  workoutsByProfile,
  intervalEvents,
  intervalAthleteIds,
  loadMetrics,
  wellness,
  reportsByWorkout,
  aiGenerations,
  selectedAthleteId,
  loadPoints,
  powerPoints,
  powerFatigueCurves = [],
  comparisonRiders,
  todayKey,
  canUseAi,
  canGenerateAi,
  canPublish,
  nowMs,
  reviewQueue,
  planTools,
}: {
  assignments: AssignmentRow[];
  profiles: Map<string, ProfileRow>;
  goals: Map<string, GoalRow[]>;
  activities: Map<string, StravaActivityRow[]>;
  plans: Map<string, PlanRow[]>;
  workoutsByPlan: Map<string, WorkoutRow[]>;
  workoutsByProfile: Map<string, WorkoutRow[]>;
  intervalEvents: Map<string, IntervalsEvent[]>;
  intervalAthleteIds: Map<string, string>;
  loadMetrics: Map<string, CoachLoadMetric>;
  wellness: Map<string, CoachRecoveryState>;
  reportsByWorkout: Map<string, WorkoutReportRow>;
  aiGenerations: AiGenerationRow[];
  selectedAthleteId?: string;
  loadPoints: TrainingLoadPoint[];
  powerPoints: PowerCurvePoint[];
  powerFatigueCurves?: FatigueCurve[];
  comparisonRiders: ComparisonRider[];
  todayKey: string;
  canUseAi: boolean;
  canGenerateAi: boolean;
  canPublish: boolean;
  nowMs: number;
  /** Beoordelingsrij van bevestigde workouts; boven de schema's gerenderd. */
  reviewQueue?: React.ReactNode;
  /** Bibliotheek en schema-bijwerken, per geselecteerde renner. */
  planTools?: React.ReactNode;
}) {
  if (assignments.length === 0) {
    return <EmptyState>Geen toegewezen leden.</EmptyState>;
  }

  const selected =
    assignments.find((assignment) => assignment.athlete_id === selectedAthleteId) ??
    assignments[0];
  const athlete = profiles.get(selected.athlete_id);
  const athleteGoals = goals.get(selected.athlete_id) ?? [];
  const athleteActivities = activities.get(selected.athlete_id) ?? [];
  const athletePlans = plans.get(selected.athlete_id) ?? [];
  const athleteWorkouts = workoutsByProfile.get(selected.athlete_id) ?? [];
  const athleteEvents = intervalEvents.get(selected.athlete_id) ?? [];
  const intervalsAthleteId = intervalAthleteIds.get(selected.athlete_id);
  const metric = loadMetrics.get(selected.athlete_id);
  const pendingGenerationsByGoal = new Map<string, AiGenerationRow>();
  for (const generation of aiGenerations) {
    if (
      generation.profile_id === selected.athlete_id &&
      generation.goal_id &&
      !pendingGenerationsByGoal.has(generation.goal_id)
    ) {
      pendingGenerationsByGoal.set(generation.goal_id, generation);
    }
  }
  const recovery = wellness.get(selected.athlete_id);
  const trainingReadiness = summarizeTrainingReadiness({
    tsb: metric?.tsb,
    wellness: recovery?.summary,
  });
  const totals = loadSummary(athleteActivities);
  const recentZwbWorkouts = athleteWorkouts
    .filter((workout) => new Date(workout.scheduled_at).getTime() < nowMs)
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
    .slice(0, 4);
  const upcomingZwbWorkouts = athleteWorkouts
    .filter((workout) => new Date(workout.scheduled_at).getTime() >= nowMs)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .slice(0, 5);
  const activePlan = athletePlans.find((plan) => plan.status !== "archived");
  const activePlanWorkouts = activePlan ? workoutsByPlan.get(activePlan.id) ?? [] : [];
  const ctlProjection = projectCtl(
    metric?.ctl,
    activePlanWorkouts.map((workout) => ({
      date: workout.scheduled_at.slice(0, 10),
      load: estimateTrainingLoad(
        normalizeWorkoutBlocks(workout.structure_json, workout.intensity as WorkoutIntensity),
      ),
    })),
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <aside className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Users className="size-5 text-primary" />
            Renners
          </h2>
        </div>
        <div className="divide-y">
          {assignments.map((assignment) => {
            const rowProfile = profiles.get(assignment.athlete_id);
            const rowMetric = loadMetrics.get(assignment.athlete_id);
            const rowRecovery = wellness.get(assignment.athlete_id);
            const rowActivities = activities.get(assignment.athlete_id) ?? [];
            const rowTotals = loadSummary(rowActivities);
            const rowTrainingReadiness = summarizeTrainingReadiness({
              tsb: rowMetric?.tsb,
              wellness: rowRecovery?.summary,
            });
            const active = assignment.athlete_id === selected.athlete_id;
            const advice = rowRecovery?.summary
              ? zwbeterWordenAdvice(rowTrainingReadiness, rowProfile?.zrl_division)
              : null;
            return (
              <Link
                key={assignment.id}
                href={`/zwbeter-worden/trainer?athlete=${assignment.athlete_id}`}
                className={`block p-4 transition hover:bg-muted/50 ${active ? "bg-primary/10" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {rowProfile?.display_name ?? "ZWB-lid"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      FTP {rowProfile?.ftp_watts ?? "-"}w - {formatKm(rowTotals.distance)}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {rowProfile?.zrl_category ?? "-"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span className="rounded-md bg-background px-2 py-1">
                    CTL <strong>{formatNumber(rowMetric?.ctl, 1)}</strong>
                  </span>
                  <span className="rounded-md bg-background px-2 py-1">
                    Form <strong>{formatNumber(rowMetric?.tsb, 1)}</strong>
                  </span>
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      advice ? advice.pill : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {advice
                      ? `${advice.level}/5 · ${advice.title}`
                      : rowRecovery?.optedIn
                        ? "Geen hersteldata"
                        : "Herstel niet gedeeld"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      <div className="space-y-4">
        <section className="rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Trainer-overzicht</p>
              <h2 className="text-2xl font-semibold">{athlete?.display_name ?? "ZWB-lid"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                FTP {athlete?.ftp_watts ?? "-"}w -{" "}
                {athlete?.zrl_category ? `ZRL ${athlete.zrl_category}` : "Geen ZRL-categorie"}
              </p>
            </div>
            <Link
              href={`/leden/${selected.athlete_id}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Profiel <ExternalLink className="size-3" />
            </Link>
          </div>
          <h3 className="mt-4 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="size-4 text-primary" />
            Belasting
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <TrainingLoadMetrics
              points={loadPoints}
              ctl={metric?.ctl ?? null}
              tsb={metric?.tsb ?? null}
              today={todayKey}
              idSuffix="coach"
            />
            <MetricCard icon={Mountain} label="eFTP" value={formatNumber(metric?.eftp, 0)} />
            <MetricCard
              icon={ShieldCheck}
              label="Trainingsruimte"
              value={trainingReadiness.score != null ? `${trainingReadiness.score}` : "-"}
              hint={zwbeterWordenAdvice(trainingReadiness, athlete?.zrl_division).title}
            />
            <MetricCard
              icon={TrendingUp}
              label="CTL doel"
              value={formatNumber(ctlProjection ?? undefined, 1)}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                icon={Mountain}
                label="28 dagen"
                value={formatKm(totals.distance)}
                hint={`${formatHours(totals.time)} - ${formatMeters(totals.elevation)}`}
              />
              <MetricCard
                icon={Calendar}
                label="Komend"
                value={`${upcomingZwbWorkouts.length + athleteEvents.length}`}
                hint="ZWB + intervals.icu"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="size-4 text-primary" />
                  Hersteltrend
                </h3>
                {recovery?.summary ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${recoveryPillClass(
                      recovery.summary.state,
                    )}`}
                  >
                    {recoveryStateLabel(recovery.summary.state)}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 rounded-md bg-muted/40 p-3">
                {!recovery || !recovery.optedIn ? (
                  <p className="text-sm text-muted-foreground">Hersteldata niet gedeeld.</p>
                ) : !recovery.summary ? (
                  <p className="text-sm text-muted-foreground">
                    Nog geen hersteldata gevonden in intervals.icu.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <RecoveryStat
                        label="Readiness"
                        value={
                          recovery.summary.readiness != null
                            ? `${recovery.summary.readiness}`
                            : "-"
                        }
                      />
                      <RecoveryStat
                        label="Laatste"
                        value={formatWellnessDate(recovery.summary.latestDate)}
                      />
                      <RecoveryStat
                        label="HRV 7d"
                        value={recovery.summary.hrv != null ? `${recovery.summary.hrv}` : "-"}
                      />
                      <RecoveryStat
                        label="Rust-HR 7d"
                        value={
                          recovery.summary.restingHr != null
                            ? `${recovery.summary.restingHr}`
                            : "-"
                        }
                      />
                      <RecoveryStat
                        label="Slaap 7d"
                        value={
                          recovery.summary.sleepHours != null
                            ? `${recovery.summary.sleepHours}u`
                            : "-"
                        }
                      />
                      <RecoveryStat label="Dagen" value={`${recovery.summary.days}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">{recovery.summary.note}</p>
                  </div>
                )}
              </div>
              {(() => {
                const advice = zwbeterWordenAdvice(trainingReadiness, athlete?.zrl_division);
                return (
                  <div className={`mt-3 rounded-md p-3 ${advice.block}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">ZWBeterWorden</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${advice.pill}`}>
                        {advice.level > 0 ? `Niveau ${advice.level}/5` : "—"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold">{advice.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{advice.description}</p>
                  </div>
                );
              })()}
            </div>
          </div>
          {metric?.error ? (
            <p className="mt-3 text-xs text-muted-foreground">Intervals: {metric.error}</p>
          ) : null}
        </section>

        {reviewQueue}

        {powerPoints.length > 1 ? (
          <section className="rounded-lg border bg-card p-4 sm:p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-semibold">Power-duration curve</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                <Users className="size-3.5" />
                {comparisonRiders.length} vergelijkbare ZWB-profielen
              </span>
            </div>
            <PowerCurveChart
              ownName={athlete?.display_name ?? "Renner"}
              ownWeightKg={athlete?.weight_kg ? Number(athlete.weight_kg) : null}
              ownPoints={downsample(powerPoints)}
              fatigueCurves={powerFatigueCurves.flatMap((curve) => {
                const points = downsample(curve.points);
                return points.length > 1 ? [{ afterKj: curve.afterKj, points }] : [];
              })}
              riders={comparisonRiders}
              idSuffix="coach"
            />
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card">
            <div className="border-b p-4">
              <h3 className="font-semibold">Doelen</h3>
            </div>
            {athleteGoals.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Geen actieve intake.</p>
            ) : (
              <div className="divide-y">
                {athleteGoals.map((goal) => {
                  const pendingGeneration = pendingGenerationsByGoal.get(goal.id);
                  return (
                    <div key={goal.id} className="p-4">
                      <p className="font-medium">{goal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {GOAL_LABELS[goal.goal_type] ?? goal.goal_type}
                        {goal.target_date ? ` - ${formatDayMonth(goal.target_date, false)}` : ""}
                        {goal.max_hours_per_week ? ` - max ${goal.max_hours_per_week}u/week` : ""}
                      </p>
                      <AiDraftForm
                        athleteId={selected.athlete_id}
                        goalId={goal.id}
                        defaultPrompt={defaultTrainingPrompt()}
                        canUseAi={canUseAi}
                        canGenerateAi={canGenerateAi}
                        initialGenerationId={pendingGeneration?.id}
                        initialStatus={pendingGeneration?.status}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card">
            <div className="border-b p-4">
              <h3 className="font-semibold">Afgelopen uitvoering</h3>
            </div>
            {athleteActivities.length === 0 && recentZwbWorkouts.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Geen recente uitvoering.</p>
            ) : (
              <ul className="divide-y">
                {athleteActivities.slice(0, 5).map((activity) => (
                  <li
                    key={activity.id}
                    className="grid gap-2 p-4 sm:grid-cols-[90px_1fr_auto] sm:items-center"
                  >
                    <span className="text-xs text-muted-foreground">
                      {formatDayMonth(activity.start_date, false)}
                    </span>
                    <a
                      href={`https://www.strava.com/activities/${activity.id}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Open deze rit op Strava"
                      className="block truncate text-sm font-medium transition hover:text-primary hover:underline"
                    >
                      {activity.name ?? "Rit"}
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {formatKm(toNum(activity.distance_m))} -{" "}
                      {formatHours(activity.moving_time_seconds)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h3 className="font-semibold">Komende workouts</h3>
          </div>
          {upcomingZwbWorkouts.length === 0 && athleteEvents.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Geen komende workouts.</p>
          ) : (
            <ul className="divide-y">
              {upcomingZwbWorkouts.map((workout) => (
                <li
                  key={workout.id}
                  className="grid gap-2 p-4 sm:grid-cols-[110px_1fr_auto] sm:items-center"
                >
                  <span className="text-xs text-muted-foreground">
                    {formatDayMonth(workout.scheduled_at)}
                  </span>
                  <WorkoutTitle
                    workout={workout}
                    athleteId={intervalsAthleteId}
                    className="truncate text-sm font-medium"
                  />
                  <span className="text-xs text-muted-foreground">
                    {workout.status === "skipped"
                      ? "Rustdag"
                      : `${workout.duration_minutes} min - ${intensityLabel(workout.intensity)}`}
                  </span>
                </li>
              ))}
              {athleteEvents.map((event) => (
                <li
                  key={String(event.id)}
                  className="grid gap-2 p-4 sm:grid-cols-[110px_1fr_auto] sm:items-center"
                >
                  <span className="text-xs text-muted-foreground">
                    {formatDayMonth(event.start_date_local)}
                  </span>
                  <p className="truncate text-sm font-medium">{event.name ?? "Intervals workout"}</p>
                  <span className="text-xs text-muted-foreground">
                    {event.icu_training_load
                      ? `${Math.round(event.icu_training_load)} TSS`
                      : "intervals.icu"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {planTools}

        <section className="space-y-3">
          <h3 className="font-semibold">Schema&apos;s maken en beheren</h3>
          {athletePlans.length === 0 ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              Nog geen schema&apos;s voor dit lid.
            </p>
          ) : (
            athletePlans.map((plan) => (
              <CollapsibleCard
                key={plan.id}
                title={plan.title}
                subtitle={`${formatDayMonth(plan.start_date, false)} - ${formatDayMonth(plan.end_date, false)}`}
                defaultOpen={plan.id === activePlan?.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
                  <form
                    action={formAction(updateTrainingPlan)}
                    className="grid flex-1 gap-2 lg:grid-cols-[1fr_130px_130px_auto]"
                  >
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <label className="text-xs text-muted-foreground">
                      Schema
                      <input
                        name="title"
                        defaultValue={plan.title}
                        className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Start
                      <input
                        name="start_date"
                        type="date"
                        defaultValue={plan.start_date}
                        className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Eind
                      <input
                        name="end_date"
                        type="date"
                        defaultValue={plan.end_date}
                        className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                      />
                    </label>
                    <button className="self-end rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">
                      Schema opslaan
                    </button>
                    <label className="lg:col-span-4 text-xs text-muted-foreground">
                      Samenvatting
                      <textarea
                        name="summary"
                        rows={3}
                        defaultValue={plan.summary ?? ""}
                        className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                      />
                    </label>
                    {plan.adaptation_reason ? (
                      <p className="lg:col-span-4 text-xs text-muted-foreground">
                        {plan.adaptation_reason}
                      </p>
                    ) : null}
                  </form>
                  <PlanBadge status={plan.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 border-b p-3">
                  <PlanActions
                    planId={plan.id}
                    status={plan.status}
                    mayApprove
                    mayPublish={canPublish}
                  />
                  <DeleteTrainingPlanButton planId={plan.id} title={plan.title} />
                </div>
                <WorkoutList
                  workouts={workoutsByPlan.get(plan.id) ?? []}
                  editable
                  ftpWatts={athlete?.ftp_watts}
                  reports={reportsByWorkout}
                  intervalsAthleteId={intervalsAthleteId}
                />
              </CollapsibleCard>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
