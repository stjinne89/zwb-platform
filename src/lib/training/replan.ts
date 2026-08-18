// Het schema past zich aan zodra het lid iets verandert: een rit inplannen of
// de beschikbaarheid van deze week bijstellen. Dat is dezelfde herziening als de
// knop "Schema bijwerken", maar dan zonder dat het lid er zelf om vraagt.
//
// Elke herziening is een AI-generatie en kost dus geld. Vandaar de demping: een
// lid dat wat zit te schuiven met schuifbalken mag niet vijf generaties per
// minuut afvuren. Binnen het venster geven we `skipped` terug — de wijziging is
// wél opgeslagen en wordt bij de eerstvolgende herziening meegenomen.

import type { createAdminClient } from "@/lib/supabase/admin";
import { activeBasePlan } from "@/lib/training/active-plan";
import { startPlanUpdate } from "@/lib/training/draft";

type Admin = ReturnType<typeof createAdminClient>;

/** Hoe lang na een herziening we een volgende laten wachten. */
export const REPLAN_COOLDOWN_MS = 5 * 60_000;

export type ReplanResult =
  | { started: true; generationId: string }
  | { started: false; reason: "no_plan" | "cooldown" | "failed"; error?: string };

/** Loopt er al een verse herziening voor dit lid? */
async function withinCooldown(admin: Admin, profileId: string) {
  const since = new Date(Date.now() - REPLAN_COOLDOWN_MS).toISOString();
  const { data } = await admin
    .from("training_ai_generations")
    .select("id")
    .eq("profile_id", profileId)
    .eq("adaptation_kind", "plan_update")
    .in("status", ["queued", "in_progress", "completed"])
    .gte("created_at", since)
    .limit(1);
  return (data ?? []).length > 0;
}

/**
 * Vraag een herziening van het resterende schema aan. Stilletjes overslaan is
 * hier het normale geval: heeft het lid geen lopend schema, of is er net een
 * herziening geweest, dan is er niets aan de hand.
 */
export async function requestReplan(
  admin: Admin,
  profileId: string,
  reason: string,
): Promise<ReplanResult> {
  try {
    const plan = await activeBasePlan(admin, profileId);
    if (!plan) return { started: false, reason: "no_plan" };
    if (await withinCooldown(admin, profileId)) {
      return { started: false, reason: "cooldown" };
    }

    const result = await startPlanUpdate({
      admin,
      planId: plan.id,
      actorId: profileId,
      reason,
    });
    if (!result.ok) return { started: false, reason: "failed", error: result.error };
    return { started: true, generationId: result.generationId };
  } catch (err) {
    return {
      started: false,
      reason: "failed",
      error: err instanceof Error ? err.message : "Schema bijwerken faalde.",
    };
  }
}
