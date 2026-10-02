// Doelen waar de trainer nog een conceptschema op moet draaien.
//
// Een doel staat klaar zodra het lid het heeft opgeslagen (de intake eist al
// beschikbaarheid). Het wacht zolang er geen schema aan hangt en er ook geen
// AI-generatie voor loopt. Een mislukte generatie telt niet: dan wacht het doel
// nog steeds. Doelen waarvan de datum voorbij is, vallen af.

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export type GoalCandidate = {
  id: string;
  profile_id: string;
  status: string;
  target_date: string | null;
};

/** Pure kern: per renner de id's van de doelen die op een schema wachten. */
export function pickGoalsAwaitingPlan(
  goals: GoalCandidate[],
  handledGoalIds: Set<string>,
  todayKey: string,
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const goal of goals) {
    if (goal.status !== "active") continue;
    if (goal.target_date && goal.target_date.slice(0, 10) < todayKey) continue;
    if (handledGoalIds.has(goal.id)) continue;
    result.set(goal.profile_id, [...(result.get(goal.profile_id) ?? []), goal.id]);
  }
  return result;
}

export async function goalsAwaitingPlan(
  admin: Admin,
  profileIds: string[],
  todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" }),
): Promise<Map<string, string[]>> {
  if (profileIds.length === 0) return new Map();

  const [{ data: goalRows }, { data: planRows }, { data: generationRows }] = await Promise.all([
    admin
      .from("training_goals")
      .select("id, profile_id, status, target_date")
      .in("profile_id", profileIds)
      .eq("status", "active"),
    admin
      .from("training_plans")
      .select("goal_id")
      .in("profile_id", profileIds)
      .not("goal_id", "is", null),
    admin
      .from("training_ai_generations")
      .select("goal_id")
      .in("profile_id", profileIds)
      .in("status", ["queued", "in_progress"])
      .not("goal_id", "is", null),
  ]);

  const handled = new Set<string>();
  for (const row of [...(planRows ?? []), ...(generationRows ?? [])] as Array<{
    goal_id: string | null;
  }>) {
    if (row.goal_id) handled.add(row.goal_id);
  }
  return pickGoalsAwaitingPlan((goalRows ?? []) as GoalCandidate[], handled, todayKey);
}
