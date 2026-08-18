// Het schema dat nu loopt: een basisplan (geen aanpassing), goedgekeurd of
// gepubliceerd, en nog niet afgelopen.
//
// Stond in twee vrijwel identieke kopieën — één in replan.ts en één in de
// server-actions van ZWBeter Worden — en wordt sinds de eventkoppeling ook
// vanaf de eventpagina aangeroepen. Eén bron, zodat "het lopende schema" overal
// hetzelfde betekent.

import type { createAdminClient } from "@/lib/supabase/admin";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

type Admin = ReturnType<typeof createAdminClient>;

export type ActiveBasePlan = {
  id: string;
  profile_id: string;
  trainer_id: string | null;
  status: string;
  end_date: string;
  updated_at: string | null;
};

export async function activeBasePlan(
  admin: Admin,
  profileId: string,
): Promise<ActiveBasePlan | null> {
  const { data } = await admin
    .from("training_plans")
    .select("id, profile_id, trainer_id, status, end_date, updated_at")
    .eq("profile_id", profileId)
    .is("parent_plan_id", null)
    .in("status", ["published", "approved"])
    .gte("end_date", amsterdamDayKey())
    .order("status", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(5);

  const plans = (data ?? []) as ActiveBasePlan[];
  // Een gepubliceerd schema gaat voor een goedgekeurd concept; daarbinnen de
  // meest recent bijgewerkte.
  return plans.find((plan) => plan.status === "published") ?? plans[0] ?? null;
}
