// Doelen-tab: de intake van de renner, met per doel de knop om de AI een
// conceptschema te laten schrijven.

import { EmptyState } from "@/components/app-ui";
import { defaultTrainingPrompt } from "@/lib/training/workouts";
import { formatDayMonth, GOAL_LABELS } from "../../_components/format";
import type { AiGenerationRow, GoalRow, SearchParamsProp } from "../../_components/types";
import { AiDraftForm } from "../_components/ai-draft-form";
import { trainerContext } from "../_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrainerGoalsPage({ searchParams }: SearchParamsProp) {
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

  const [{ data: goalRows }, { data: generationRows }] = await Promise.all([
    viewer.supabase
      .from("training_goals")
      .select("*")
      .eq("profile_id", athleteId)
      .order("created_at", { ascending: false }),
    viewer.supabase
      .from("training_ai_generations")
      .select("id, profile_id, goal_id, status, error, created_at")
      .eq("profile_id", athleteId)
      .in("status", ["queued", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const goals = (goalRows ?? []) as GoalRow[];
  if (goals.length === 0) {
    return <EmptyState>Geen actieve intake.</EmptyState>;
  }

  // Per doel de lopende generatie, zodat het formulier meteen weer meepolt.
  const pendingByGoal = new Map<string, AiGenerationRow>();
  for (const generation of (generationRows ?? []) as AiGenerationRow[]) {
    if (generation.goal_id && !pendingByGoal.has(generation.goal_id)) {
      pendingByGoal.set(generation.goal_id, generation);
    }
  }

  const canUseAi = Boolean(process.env.OPENAI_API_KEY);
  const canGenerateAi = viewer.access.has("training.ai_generate");

  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b p-4">
        <h2 className="font-semibold">Doelen</h2>
      </div>
      <div className="divide-y">
        {goals.map((goal) => {
          const pending = pendingByGoal.get(goal.id);
          return (
            <div key={goal.id} className="p-4">
              <p className="font-medium">{goal.title}</p>
              <p className="text-xs text-muted-foreground">
                {GOAL_LABELS[goal.goal_type] ?? goal.goal_type}
                {goal.target_date ? ` - ${formatDayMonth(goal.target_date, false)}` : ""}
                {goal.max_hours_per_week ? ` - max ${goal.max_hours_per_week}u/week` : ""}
              </p>
              <AiDraftForm
                athleteId={athleteId}
                goalId={goal.id}
                defaultPrompt={defaultTrainingPrompt()}
                canUseAi={canUseAi}
                canGenerateAi={canGenerateAi}
                initialGenerationId={pending?.id}
                initialStatus={pending?.status}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
