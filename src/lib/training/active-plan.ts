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

/**
 * Statussen waarin een schema meetelt als het lopende schema. Een concept
 * (`draft`/`review`) is een voorstel: het bestaat wel, met workouts en al, maar
 * het is nog niemands planning.
 */
export const LIVE_PLAN_STATUSES = new Set(["published", "approved"]);

/**
 * Haalt de conceptworkouts weg op dagen waar het lopende schema zelf al iets
 * heeft staan.
 *
 * `insertPlanWorkouts` zet de workouts van een AI-generatie meteen in de
 * database, terwijl het vervangen van het oude schema (`superseded_at`) pas bij
 * het publiceren gebeurt. Tussen die twee momenten staan beide schema's er dus
 * volledig in, en de schemakalender haalt alles op wat niet vervangen is — over
 * alle plannen heen. Het lid zag daardoor elke trainingsdag twee keer: één keer
 * uit zijn lopende schema en één keer uit het concept ernaast. Dat duurt zolang
 * het concept niet gepubliceerd wordt: bij een trainerschema tot de trainer erop
 * drukt, en bij een eigen bijwerking voorgoed als de push naar intervals.icu
 * onderweg klapte.
 *
 * Alleen op dagen waar het lopende schema iets heeft. Een concept van een lid
 * zonder lopend schema blijft dus gewoon zichtbaar — anders zou de kalender
 * leeg zijn in plaats van dubbel.
 */
export function withoutConceptDuplicates<
  W extends { plan_id: string; scheduled_at: string },
  P extends { id: string; status: string },
>(workouts: W[], plans: P[]): W[] {
  const statusOf = new Map(plans.map((plan) => [plan.id, plan.status]));
  const isLive = (planId: string) => {
    const status = statusOf.get(planId);
    // Onbekend plan: laten staan. Liever een dubbeling dan een lege dag.
    return status == null || LIVE_PLAN_STATUSES.has(status);
  };

  const liveDays = new Set(
    workouts
      .filter((workout) => isLive(workout.plan_id))
      .map((workout) => String(workout.scheduled_at).slice(0, 10)),
  );

  return workouts.filter(
    (workout) =>
      isLive(workout.plan_id) || !liveDays.has(String(workout.scheduled_at).slice(0, 10)),
  );
}
