// De invoer waarop het lopende schema is gemaakt, voor het tabblad
// Uitgangspunten. Dat is letterlijk wat het model zag
// (training_ai_generations.prompt_summary), niet een nieuwe berekening: zo
// klopt wat het lid leest met wat er in zijn schema is meegewogen.

import type { createAdminClient } from "@/lib/supabase/admin";
import { activeBasePlan } from "@/lib/training/active-plan";
import type { TrainingAiInput } from "@/lib/training/ai";

type Admin = ReturnType<typeof createAdminClient>;

export type PlanBasisInput = {
  /** Wanneer deze versie van het schema is gemaakt. */
  madeAt: string;
  input: Partial<TrainingAiInput>;
};

/**
 * De nieuwste versie van het lopende schema die het hele schema besloeg: het
 * basisplan of een herziening. Een dag-aanpassing telt niet mee, want die kreeg
 * alleen de rest van de week als invoer.
 */
export async function loadPlanBasisInput(
  admin: Admin,
  profileId: string,
): Promise<PlanBasisInput | null> {
  const base = await activeBasePlan(admin, profileId);
  if (!base) return null;

  const { data: versions } = await admin
    .from("training_plans")
    .select("id, ai_generation_id, adaptation_kind, created_at")
    .eq("profile_id", profileId)
    .eq("root_plan_id", base.id)
    .in("status", ["published", "approved"])
    .not("ai_generation_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const newest = (
    (versions ?? []) as Array<{
      ai_generation_id: string;
      adaptation_kind: string | null;
      created_at: string;
    }>
  ).find((plan) => plan.adaptation_kind == null || plan.adaptation_kind === "plan_update");
  if (!newest) return null;

  const { data: generation } = await admin
    .from("training_ai_generations")
    .select("prompt_summary")
    .eq("id", newest.ai_generation_id)
    .maybeSingle();

  try {
    const input = JSON.parse(String(generation?.prompt_summary ?? "")) as Partial<TrainingAiInput>;
    if (!input || typeof input !== "object") return null;
    return { madeAt: newest.created_at, input };
  } catch {
    // Een oude rij zonder geldige JSON: dan valt er niets uit te leggen.
    return null;
  }
}
