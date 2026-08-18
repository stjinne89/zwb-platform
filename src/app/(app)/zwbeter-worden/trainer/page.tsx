// Overzicht-tab: hoe staat de gekozen renner ervoor — belasting, herstel, wat er
// aankomt en wat er de afgelopen weken is gereden.

import { Calendar, Mountain } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { StravaAttribution, ViewOnStrava } from "@/components/strava-brand";
import { toTrainingLoadPoints } from "@/lib/training/load-points";
import { summarizeTrainingReadiness, type WellnessDevice } from "@/lib/training/wellness";
import { computeZwbStatus } from "@/lib/training/zwbeterworden";
import {
  estimateTrainingLoad,
  intensityLabel,
  normalizeWorkoutBlocks,
  projectCtl,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { MetricCard } from "../_components/ui";
import { WorkoutTitle } from "../_components/workout-blocks";
import {
  formatDayMonth,
  formatHours,
  formatKm,
  formatMeters,
  loadSummary,
  toNum,
} from "../_components/format";
import type {
  PlanRow,
  SearchParamsProp,
  StravaActivityRow,
  WorkoutRow,
} from "../_components/types";
import { todayKeyAmsterdam, upcomingIntervalsEvents } from "../_data";
import { AthleteLoadPanel } from "./_components/athlete-load-panel";
import {
  loadAthlete,
  loadAthleteConnection,
  loadAthleteIntervals,
  trainerContext,
} from "./_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export default async function TrainerOverviewPage({ searchParams }: SearchParamsProp) {
  const context = await trainerContext(searchParams);
  if (!context.ok) {
    return (
      <EmptyState>
        {context.reason === "no-permission"
          ? "Je hebt geen trainer-rechten."
          : "Geen toegewezen leden."}
      </EmptyState>
    );
  }
  const { viewer, athleteId } = context;

  const now = new Date();
  const since28 = new Date(now);
  since28.setDate(since28.getDate() - 28);
  const since21 = new Date(now);
  since21.setDate(since21.getDate() - 21);

  const [athlete, connection, { data: activityRows }, { data: workoutRows }, { data: planRows }] =
    await Promise.all([
      loadAthlete(viewer, athleteId),
      loadAthleteConnection(viewer, athleteId),
      viewer.supabase
        .from("strava_activities")
        .select(
          "id, profile_id, name, sport_type, start_date, distance_m, total_elevation_gain_m, kudos_count, moving_time_seconds, trainer",
        )
        .eq("profile_id", athleteId)
        .gte("start_date", since28.toISOString())
        .order("start_date", { ascending: false }),
      viewer.supabase
        .from("training_workouts")
        .select("*")
        .is("superseded_at", null)
        .eq("profile_id", athleteId)
        .gte("scheduled_at", since21.toISOString())
        .order("scheduled_at", { ascending: true }),
      viewer.supabase
        .from("training_plans")
        .select("*")
        .eq("profile_id", athleteId)
        .order("created_at", { ascending: false }),
    ]);

  const intervals = await loadAthleteIntervals(connection, {
    wellnessDays: 730,
    eventDays: 14,
    admin: viewer.admin,
  });
  const status = computeZwbStatus(intervals.wellness, {
    wellnessOptIn: Boolean(connection?.wellness_opt_in),
    sex: athlete?.sex,
    wellnessDevice: (athlete?.wellness_device ?? null) as WellnessDevice | null,
  });

  const activities = (activityRows ?? []) as StravaActivityRow[];
  const workouts = (workoutRows ?? []) as WorkoutRow[];
  const plans = (planRows ?? []) as PlanRow[];
  const totals = loadSummary(activities);
  const nowMs = now.getTime();
  const upcomingWorkouts = workouts
    .filter((workout) => new Date(workout.scheduled_at).getTime() >= nowMs)
    .slice(0, 5);
  const upcomingEvents = upcomingIntervalsEvents(intervals.events, 5);

  // CTL-projectie over het schema dat nu loopt.
  const activePlan = plans.find((plan) => plan.status !== "archived");
  const ctlProjection = projectCtl(
    status.ctl ?? undefined,
    workouts
      .filter((workout) => workout.plan_id === activePlan?.id)
      .map((workout) => ({
        date: workout.scheduled_at.slice(0, 10),
        load: estimateTrainingLoad(
          normalizeWorkoutBlocks(workout.structure_json, workout.intensity as WorkoutIntensity),
        ),
      })),
  );

  return (
    <div className="space-y-4">
      <AthleteLoadPanel
        loadPoints={toTrainingLoadPoints(intervals.wellness)}
        ctl={status.ctl}
        tsb={status.tsb}
        eftp={status.eftp}
        ctlProjection={ctlProjection}
        readiness={summarizeTrainingReadiness({
          tsb: status.tsb,
          wellness: status.recoverySummary,
        })}
        recovery={{
          optedIn: Boolean(connection?.wellness_opt_in),
          summary: status.recoverySummary,
        }}
        sex={athlete?.sex}
        todayKey={todayKeyAmsterdam()}
        fetchError={intervals.fetchError}
      />

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
          value={`${upcomingWorkouts.length + upcomingEvents.length}`}
          hint="ZWB + intervals.icu"
        />
      </div>

      <section className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Komende workouts</h2>
        </div>
        {upcomingWorkouts.length === 0 && upcomingEvents.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Geen komende workouts.</p>
        ) : (
          <ul className="divide-y">
            {upcomingWorkouts.map((workout) => (
              <li
                key={workout.id}
                className="grid gap-2 p-4 sm:grid-cols-[110px_1fr_auto] sm:items-center"
              >
                <span className="text-xs text-muted-foreground">
                  {formatDayMonth(workout.scheduled_at)}
                </span>
                <WorkoutTitle
                  workout={workout}
                  athleteId={connection?.athlete_id}
                  className="truncate text-sm font-medium"
                />
                <span className="text-xs text-muted-foreground">
                  {workout.status === "skipped"
                    ? "Rustdag"
                    : `${workout.duration_minutes} min - ${intensityLabel(workout.intensity)}`}
                </span>
              </li>
            ))}
            {upcomingEvents.map((event) => (
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

      <section className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Afgelopen uitvoering</h2>
        </div>
        {activities.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Geen recente uitvoering.</p>
        ) : (
          <ul className="divide-y">
            {activities.slice(0, 5).map((activity) => (
              <li
                key={activity.id}
                className="grid gap-2 p-4 sm:grid-cols-[90px_1fr_auto] sm:items-center"
              >
                <span className="text-xs text-muted-foreground">
                  {formatDayMonth(activity.start_date, false)}
                </span>
                <span className="block truncate text-sm font-medium">
                  {activity.name ?? "Rit"}
                </span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  {formatKm(toNum(activity.distance_m))} - {formatHours(activity.moving_time_seconds)}
                  <ViewOnStrava activityId={activity.id} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="p-4 pt-0">
          <StravaAttribution className="mt-0" />
        </div>
      </section>
    </div>
  );
}
