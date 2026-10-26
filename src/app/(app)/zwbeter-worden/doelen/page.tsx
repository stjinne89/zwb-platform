import { ClipboardList, ShieldCheck } from "lucide-react";
import { aiConfigured } from "@/lib/ai/settings";
import { ConnectIntervalsForm } from "../_components/connect-form";
import { DisconnectIntervalsButton } from "../_components/disconnect-button";
import { TrainerAccessPanel } from "../_components/trainer-access-panel";
import { CollapsibleCard } from "../_components/ui";
import { formatDayMonth, GOAL_LABELS, paramString } from "../_components/format";
import { AiDraftForm } from "../trainer/_components/ai-draft-form";
import { goalsAwaitingPlan } from "@/lib/training/goals-awaiting-plan";
import type {
  AiGenerationRow,
  AssignmentRow,
  GoalRow,
  ProfileRow,
  SearchParamsProp,
} from "../_components/types";
import { loadConnection, requireViewer } from "../_data";
import { GoalAvailability } from "./_components/goal-availability";
import { GoalForm } from "./_components/goal-form";
import { loadAvailability } from "@/lib/training/availability";
import { after } from "next/server";
import {
  goalEventOptions,
  goalEventTitles,
  goalRouteLabel,
  loadGoalForecasts,
  refreshGoalForecasts,
  type GoalForecastRow,
  type GoalTargetRow,
} from "@/lib/training/goal-forecast";
import { GoalForecastCard } from "./_components/goal-forecast-card";
import { GoalTypeFields } from "./_components/goal-type-fields";
import { GoalEdit } from "./_components/goal-edit";
import { INTENSITY_OPTIONS, LEVEL_OPTIONS, MODE_OPTIONS } from "./_components/goal-options";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ZwbeterWordenGoalsPage({ searchParams }: SearchParamsProp) {
  const viewer = await requireViewer();

  // Komt het lid hier vanaf een mikpunt op de jaarplanning ("Maak hier een doel
  // van"), dan begint het formulier met de titel en de datum van dat mikpunt en
  // wordt de koppeling na opslaan vastgelegd.
  const params = (await searchParams) ?? {};
  const seasonTargetId = paramString(params.mikpunt);
  const { data: seasonTarget } = seasonTargetId
    ? await viewer.supabase
        .from("training_season_targets")
        .select("id, title, target_date")
        .eq("id", seasonTargetId)
        .eq("profile_id", viewer.user.id)
        .maybeSingle()
    : { data: null };

  const [conn, { data: goalRows }, { data: assignmentRows }, { data: trainerRows }] =
    await Promise.all([
      loadConnection(viewer),
      viewer.supabase
        .from("training_goals")
        .select("*")
        .eq("profile_id", viewer.user.id)
        .order("created_at", { ascending: false }),
      viewer.supabase
        .from("training_coach_assignments")
        .select("id, athlete_id, trainer_id, status, notes, granted_at")
        .eq("athlete_id", viewer.user.id)
        .eq("status", "active"),
      viewer.admin
        .from("profiles")
        .select("id, display_name, community_roles")
        .contains("community_roles", ["trainer"])
        .eq("is_approved", true)
        .order("display_name"),
    ]);

  // Al eerder ingevuld? Dan begint het formulier daarmee in plaats van op nul.
  const bestaand = await loadAvailability(viewer.admin, viewer.user.id, null).catch(() => null);
  const availability = (bestaand?.minutesByDay ?? {}) as Record<string, number>;

  const goals = (goalRows ?? []) as GoalRow[];

  // Doeltijden: het verloop lezen, en na het antwoord bijwerken wat verouderd
  // is (een week oud, of CP of gewicht veranderd). De pagina wacht daar niet op.
  const targetGoals = goals.filter((goal) => goal.target_time_seconds);
  const [forecasts, eventOptions, eventTitles] = await Promise.all([
    loadGoalForecasts(viewer.supabase, targetGoals.map((goal) => goal.id)).catch(
      () => new Map<string, GoalForecastRow[]>(),
    ),
    goalEventOptions(viewer.admin).catch(() => []),
    goalEventTitles(viewer.admin, targetGoals),
  ]);
  if (targetGoals.length > 0) {
    after(async () => {
      await refreshGoalForecasts(
        viewer.admin,
        viewer.user.id,
        targetGoals as GoalTargetRow[],
        forecasts,
      ).catch(() => 0);
    });
  }

  const assignments = (assignmentRows ?? []) as AssignmentRow[];

  // Wie zichzelf coacht, maakt zijn schema hier, op het doel. Heeft het lid een
  // andere trainer, dan doet die het: een eigen schema zou het zijne archiveren.
  const selfPlanning =
    viewer.access.has("training.ai_generate") &&
    viewer.access.has("training.create_plans") &&
    aiConfigured() &&
    !assignments.some((assignment) => assignment.trainer_id !== viewer.user.id);
  const [awaiting, { data: generationRows }] = selfPlanning
    ? await Promise.all([
        goalsAwaitingPlan(viewer.admin, [viewer.user.id]).catch(
          () => new Map<string, string[]>(),
        ),
        viewer.admin
          .from("training_ai_generations")
          .select("id, profile_id, goal_id, status, error, created_at")
          .eq("profile_id", viewer.user.id)
          .in("status", ["queued", "in_progress"])
          .order("created_at", { ascending: false })
          .limit(20),
      ])
    : [new Map<string, string[]>(), { data: [] }];
  const waitingGoals = new Set(awaiting.get(viewer.user.id) ?? []);
  const pendingByGoal = new Map<string, AiGenerationRow>();
  for (const generation of (generationRows ?? []) as AiGenerationRow[]) {
    if (generation.goal_id && !pendingByGoal.has(generation.goal_id)) {
      pendingByGoal.set(generation.goal_id, generation);
    }
  }

  const trainers = (trainerRows ?? []) as ProfileRow[];
  const trainerMap = new Map(trainers.map((trainer) => [trainer.id, trainer]));
  const trainerIds = assignments.map((assignment) => assignment.trainer_id);
  const selectableTrainers = trainers.filter((trainer) => !trainerIds.includes(trainer.id));

  return (
    <div className="space-y-4">
      {conn ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
          <div>
            <h2 className="font-semibold">intervals.icu</h2>
            <p className="text-sm text-muted-foreground">
              {conn.athlete_name ?? conn.athlete_id}
            </p>
          </div>
          <DisconnectIntervalsButton />
        </section>
      ) : (
        <ConnectIntervalsForm />
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-5 text-primary" />
            Trainer-toegang
          </h2>
          <TrainerAccessPanel
            assignments={assignments.map((assignment) => ({
              id: assignment.id,
              trainerId: assignment.trainer_id,
              trainerName:
                assignment.trainer_id === viewer.user.id
                  ? "Ikzelf"
                  : trainerMap.get(assignment.trainer_id)?.display_name ?? "Trainer",
            }))}
            trainers={selectableTrainers.map((trainer) => ({
              id: trainer.id,
              label:
                trainer.id === viewer.user.id
                  ? `${trainer.display_name ?? "Ik"} (ikzelf)`
                  : trainer.display_name ?? "Trainer",
            }))}
          />
        </div>

        <GoalForm>
          <h2 className="flex items-center gap-2 font-semibold">
            <ClipboardList className="size-5 text-primary" />
            Nieuw trainingsdoel
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {seasonTarget ? (
              <input type="hidden" name="season_target_id" value={seasonTarget.id as string} />
            ) : null}
            <label className="sm:col-span-2 text-sm">
              Titel
              <input
                name="title"
                required
                defaultValue={(seasonTarget?.title as string | undefined) ?? undefined}
                placeholder="ZRL Round 5 pieken"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <GoalTypeFields events={eventOptions} />
            <label className="text-sm">
              Targetdatum
              <input
                name="target_date"
                type="date"
                defaultValue={
                  seasonTarget ? String(seasonTarget.target_date).slice(0, 10) : undefined
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Max. trainingsuren per week
              <input
                name="max_hours_per_week"
                type="number"
                min="1"
                max="30"
                step="0.5"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Voorkeur
              <select
                name="preferred_mode"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              >
                {MODE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Ervaring
              <select
                name="experience_level"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              >
                {LEVEL_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Belasting
              <select
                name="desired_intensity"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              >
                {INTENSITY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <GoalAvailability initial={availability} />
            <label className="sm:col-span-2 text-sm">
              Blessures, risico&apos;s of aandachtspunten
              <textarea
                name="risk_notes"
                rows={3}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
          </div>
        </GoalForm>
      </section>

      <CollapsibleCard title="Mijn doelen" defaultOpen>
        {goals.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Geen trainingsdoelen.</p>
        ) : (
          <ul className="divide-y">
            {goals.map((goal) => (
              <li key={goal.id} className="p-4">
                <p className="font-medium">{goal.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {GOAL_LABELS[goal.goal_type] ?? goal.goal_type}
                  {goal.target_date ? ` - ${formatDayMonth(goal.target_date, false)}` : ""}
                  {goal.max_hours_per_week ? ` - max ${goal.max_hours_per_week}u/week` : ""}
                </p>
                {goal.target_time_seconds ? (
                  <GoalForecastCard
                    goalId={goal.id}
                    targetSeconds={goal.target_time_seconds}
                    riding={goal.target_riding ?? null}
                    routeLabel={goalRouteLabel(goal, eventTitles)}
                    forecasts={forecasts.get(goal.id) ?? []}
                    editable={goal.status === "active"}
                  />
                ) : null}
                {selfPlanning && (waitingGoals.has(goal.id) || pendingByGoal.has(goal.id)) ? (
                  <AiDraftForm
                    variant="self"
                    athleteId={viewer.user.id}
                    goalId={goal.id}
                    canUseAi
                    canGenerateAi
                    initialGenerationId={pendingByGoal.get(goal.id)?.id}
                    initialStatus={pendingByGoal.get(goal.id)?.status}
                  />
                ) : null}
                <GoalEdit goal={goal} />
              </li>
            ))}
          </ul>
        )}
      </CollapsibleCard>
    </div>
  );
}
