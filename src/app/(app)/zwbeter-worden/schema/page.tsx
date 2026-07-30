import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { intervalsWeekUrl } from "@/lib/intervals/links";
import {
  intensityLabel,
  normalizeWorkoutBlocks,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { PlanActions } from "../_components/plan-actions";
import { CollapsibleCard, PlanBadge } from "../_components/ui";
import { WorkoutBlocks, WorkoutTitle } from "../_components/workout-blocks";
import { WorkoutList } from "../_components/workout-list";
import {
  WorkoutCalendar,
  type CalendarWorkout,
} from "../_components/workout-calendar";
import { byPlan, byWorkout, formatDayMonth, paramString } from "../_components/format";
import { PlanUpdateForm } from "../_components/plan-update-form";
import type {
  GoalRow,
  PlanRow,
  SearchParamsProp,
  WorkoutReportRow,
} from "../_components/types";
import {
  activePlan,
  loadConnection,
  loadIntervalsSnapshot,
  loadMemberWorkouts,
  loadProfile,
  planUpdateDefaults,
  requireViewer,
  todayKeyAmsterdam,
  upcomingIntervalsEvents,
} from "../_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export default async function ZwbeterWordenSchemaPage({ searchParams }: SearchParamsProp) {
  const params = (await searchParams) ?? {};
  const workoutView = paramString(params.view) === "maand" ? "maand" : "lijst";
  const viewer = await requireViewer();

  const [profile, conn] = await Promise.all([loadProfile(viewer), loadConnection(viewer)]);
  const [snapshot, { data: planRows }, { data: reportRows }, { data: goalRows }] =
    await Promise.all([
      loadIntervalsSnapshot(viewer, conn, { eventDays: 14 }),
      viewer.supabase
        .from("training_plans")
        .select("*")
        .eq("profile_id", viewer.user.id)
        .order("created_at", { ascending: false })
        .limit(8),
      viewer.supabase
        .from("training_workout_reports")
        .select("*")
        .eq("profile_id", viewer.user.id)
        .order("updated_at", { ascending: false }),
      viewer.supabase
        .from("training_goals")
        .select("*")
        .eq("profile_id", viewer.user.id)
        .order("created_at", { ascending: false }),
    ]);

  const memberWorkouts = await loadMemberWorkouts(viewer, snapshot.events);
  const todayKey = todayKeyAmsterdam();
  const plans = (planRows ?? []) as PlanRow[];
  const reportsByWorkout = byWorkout((reportRows ?? []) as WorkoutReportRow[]);
  const workoutsByPlan = byPlan(memberWorkouts);
  const upcomingEvents = upcomingIntervalsEvents(snapshot.events, 5);
  const upcomingWorkouts = memberWorkouts
    .filter((workout) => String(workout.scheduled_at).slice(0, 10) >= todayKey)
    .slice(0, 8);

  const canSelfManagePlans = viewer.access.has("training.create_plans");
  const canSelfPublishPlans = viewer.access.has("training.publish_plans");
  // Bijwerken is voor wie zijn eigen schema beheert; heeft het lid een trainer,
  // dan doet die het vanuit de trainer-pagina.
  const updateDefaults = canSelfManagePlans
    ? planUpdateDefaults(activePlan(plans), (goalRows ?? []) as GoalRow[])
    : null;

  // Maandweergave toont de hele maand, dus ook wat al geweest is.
  const calendarWorkouts: CalendarWorkout[] = [
    ...memberWorkouts.map((workout) => ({
      id: workout.id,
      dateKey: String(workout.scheduled_at).slice(0, 10),
      title: workout.title,
      durationMinutes: workout.duration_minutes,
      intensity: workout.intensity,
      source: "zwb" as const,
      skipped: workout.status === "skipped",
    })),
    ...snapshot.events.map((event) => ({
      id: `intervals-${event.id}`,
      dateKey: String(event.start_date_local).slice(0, 10),
      title: event.name ?? "Workout",
      durationMinutes: event.moving_time ? Math.round(event.moving_time / 60) : null,
      intensity: null,
      source: "intervals" as const,
    })),
  ];

  return (
    <div className="space-y-4">
      {conn?.athlete_id ? (
        <a
          href={intervalsWeekUrl(conn.athlete_id, todayKey)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 transition hover:border-primary/40"
        >
          <h2 className="font-semibold">Bekijk schema in intervals.icu</h2>
          <ExternalLink className="size-5 shrink-0 text-muted-foreground" />
        </a>
      ) : null}

      <CollapsibleCard
        title="Komende workouts"
        subtitle="Uit intervals.icu en ZWB-schema's"
        defaultOpen
      >
        <div className="flex justify-end border-b p-2">
          <div className="flex rounded-md border bg-background p-0.5 text-xs">
            {(
              [
                { value: "lijst", label: "Lijst" },
                { value: "maand", label: "Maand" },
              ] as const
            ).map((option) => (
              <Link
                key={option.value}
                href={`/zwbeter-worden/schema?view=${option.value}`}
                scroll={false}
                className={`rounded px-2 py-1 font-medium ${
                  workoutView === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
        {workoutView === "maand" ? (
          <WorkoutCalendar workouts={calendarWorkouts} todayKey={todayKey} />
        ) : upcomingEvents.length === 0 && upcomingWorkouts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Geen geplande workouts.</p>
        ) : (
          <ul className="divide-y">
            {upcomingWorkouts.map((workout) => (
              <li key={workout.id} className="p-4">
                <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                  <span className="text-sm text-muted-foreground">
                    {formatDayMonth(workout.scheduled_at)}
                  </span>
                  <div className="min-w-0">
                    <WorkoutTitle workout={workout} athleteId={conn?.athlete_id} />
                    <p className="text-xs text-muted-foreground">
                      ZWB-schema - {workout.duration_minutes} min -{" "}
                      {intensityLabel(workout.intensity)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {workout.status === "skipped" ? "Rustdag" : workout.publish_status}
                  </span>
                </div>
                <WorkoutBlocks
                  blocks={normalizeWorkoutBlocks(
                    workout.structure_json,
                    workout.intensity as WorkoutIntensity,
                  )}
                  ftpWatts={profile?.ftp_watts}
                />
                {workout.publish_status === "published" && workout.intervals_event_id ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={`/api/training/workouts/${workout.id}/fit`}
                      className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                      <Download className="size-3" />
                      Download FIT
                    </a>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">FIT nog niet beschikbaar.</p>
                )}
              </li>
            ))}
            {upcomingEvents.map((event) => (
              <li
                key={String(event.id)}
                className="grid gap-2 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center"
              >
                <span className="text-sm text-muted-foreground">
                  {formatDayMonth(event.start_date_local)}
                </span>
                <p className="truncate font-medium">{event.name ?? "Workout"}</p>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {event.icu_training_load ? `${Math.round(event.icu_training_load)} TSS` : "-"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleCard>

      {updateDefaults ? <PlanUpdateForm defaults={updateDefaults} /> : null}

      <CollapsibleCard title="Mijn ZWB-schema's" defaultOpen>
        {plans.length === 0 ? (
          <EmptyState>Geen ZWB-trainingsschema&apos;s.</EmptyState>
        ) : (
          <div className="divide-y">
            {plans.map((plan) => {
              // Een renner mag zijn eigen dag-aanpassing (afgeleid plan) zelf
              // goedkeuren/publiceren, ook zonder trainer/bestuur-rol.
              const ownAdaptation = Boolean(plan.parent_plan_id);
              const mayApprove = canSelfManagePlans || ownAdaptation;
              const mayPublish = canSelfPublishPlans || ownAdaptation;
              return (
                <article key={plan.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div>
                      <h3 className="font-semibold">{plan.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDayMonth(plan.start_date, false)} -{" "}
                        {formatDayMonth(plan.end_date, false)}
                      </p>
                    </div>
                    <PlanBadge status={plan.status} />
                  </div>
                  {mayApprove || mayPublish ? (
                    <div className="border-y p-3">
                      <PlanActions
                        planId={plan.id}
                        status={plan.status}
                        mayApprove={mayApprove}
                        mayPublish={mayPublish}
                      />
                    </div>
                  ) : null}
                  {plan.summary && (
                    <p className="px-4 pb-3 text-sm text-muted-foreground whitespace-pre-line">
                      {plan.summary}
                    </p>
                  )}
                  <WorkoutList
                    workouts={workoutsByPlan.get(plan.id) ?? []}
                    editable={false}
                    ftpWatts={profile?.ftp_watts}
                    reports={reportsByWorkout}
                    intervalsAthleteId={conn?.athlete_id}
                  />
                </article>
              );
            })}
          </div>
        )}
      </CollapsibleCard>
    </div>
  );
}
