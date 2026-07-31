// Schema-tab: het lopende schema bijwerken, workouts uit de bibliotheek
// invoegen en de schema's van de renner beheren.

import { EmptyState } from "@/components/app-ui";
import { PlanActions } from "../../_components/plan-actions";
import { PlanUpdateForm } from "../../_components/plan-update-form";
import { WorkoutList } from "../../_components/workout-list";
import { CollapsibleCard, PlanBadge } from "../../_components/ui";
import { byPlan, byWorkout, formAction, formatDayMonth } from "../../_components/format";
import type {
  GoalRow,
  PlanRow,
  SearchParamsProp,
  WorkoutReportRow,
  WorkoutRow,
} from "../../_components/types";
import { updateTrainingPlan } from "../../_actions";
import { activePlan, planUpdateDefaults, todayKeyAmsterdam } from "../../_data";
import { DeleteTrainingPlanButton } from "../_components/delete-training-plan-button";
import {
  WorkoutLibraryPanel,
  type WorkoutTemplateRow,
} from "../_components/workout-library-panel";
import { loadAthlete, loadAthleteConnection, trainerContext } from "../_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrainerPlansPage({ searchParams }: SearchParamsProp) {
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

  const [athlete, connection, { data: planRows }, { data: goalRows }, { data: templateRows }] =
    await Promise.all([
      loadAthlete(viewer, athleteId),
      loadAthleteConnection(viewer, athleteId),
      viewer.supabase
        .from("training_plans")
        .select("*")
        .eq("profile_id", athleteId)
        .order("created_at", { ascending: false }),
      viewer.supabase
        .from("training_goals")
        .select("*")
        .eq("profile_id", athleteId)
        .order("created_at", { ascending: false }),
      viewer.supabase
        .from("training_workout_templates")
        .select("id, form, title, description, duration_minutes, intensity, is_standard, created_by")
        .order("form")
        .order("duration_minutes"),
    ]);

  const plans = (planRows ?? []) as PlanRow[];
  const goals = (goalRows ?? []) as GoalRow[];

  // Per schema de hele reeks workouts: nu er maar één renner per pagina wordt
  // geladen hoeft het beheerscherm niet meer op de laatste weken te knippen.
  const [{ data: workoutRows }, { data: reportRows }] = await Promise.all([
    plans.length
      ? viewer.supabase
          .from("training_workouts")
          .select("*")
          .is("superseded_at", null)
          .in(
            "plan_id",
            plans.map((plan) => plan.id),
          )
          .order("scheduled_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    viewer.supabase
      .from("training_workout_reports")
      .select("*")
      .eq("profile_id", athleteId)
      .order("updated_at", { ascending: false }),
  ]);

  const workoutsByPlan = byPlan((workoutRows ?? []) as WorkoutRow[]);
  const reportsByWorkout = byWorkout((reportRows ?? []) as WorkoutReportRow[]);

  // Het schema dat "bijwerken" aanpast (loopt nu), en het schema dat standaard
  // openklapt (het eerste niet-gearchiveerde).
  const runningPlan = activePlan(plans);
  const updateDefaults = planUpdateDefaults(runningPlan, goals);
  const openPlan = plans.find((plan) => plan.status !== "archived");
  const canPublish = viewer.access.has("training.publish_plans");

  return (
    <div className="space-y-4">
      {updateDefaults ? <PlanUpdateForm defaults={updateDefaults} /> : null}
      <WorkoutLibraryPanel
        templates={(templateRows ?? []) as WorkoutTemplateRow[]}
        planId={runningPlan?.id ?? null}
        defaultDate={todayKeyAmsterdam()}
        viewerId={viewer.user.id}
      />

      <section className="space-y-3">
        <h2 className="font-semibold">Schema&apos;s maken en beheren</h2>
        {plans.length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            Nog geen schema&apos;s voor dit lid.
          </p>
        ) : (
          plans.map((plan) => (
            <CollapsibleCard
              key={plan.id}
              title={plan.title}
              subtitle={`${formatDayMonth(plan.start_date, false)} - ${formatDayMonth(plan.end_date, false)}`}
              defaultOpen={plan.id === openPlan?.id}
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
                <PlanActions planId={plan.id} status={plan.status} mayApprove mayPublish={canPublish} />
                <DeleteTrainingPlanButton planId={plan.id} title={plan.title} />
              </div>
              <WorkoutList
                workouts={workoutsByPlan.get(plan.id) ?? []}
                editable
                ftpWatts={athlete?.ftp_watts}
                reports={reportsByWorkout}
                intervalsAthleteId={connection?.athlete_id}
              />
            </CollapsibleCard>
          ))
        )}
      </section>
    </div>
  );
}
