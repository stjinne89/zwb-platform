// Schema's die het lid nog niet als zijn schema hoort te zien.
//
// Twee soorten: een dagvoorstel dat nog niet is toegepast (dat staat als
// strookje bij de bestaande training), en een concept dat de trainer nog moet
// publiceren. Dat laatste stond tot 2026-10-26 gewoon in de kalender en op
// Vandaag, terwijl het niet in intervals.icu stond en dus ook niet in Zwift of
// op de fietscomputer: de bron van "mijn training staat er wel, maar niet op
// mijn Wahoo" (zie docs/schema-goedkeuren-publiceren-analyse.md).
//
// Een concept dat het lid zelf maakte (trainer = het lid zelf) blijft zichtbaar:
// dat publiceert normaal vanzelf, en lukte dat niet, dan wil het lid het zien.

import type { SupabaseClient } from "@supabase/supabase-js";

export type MemberPlanRow = {
  id: string;
  profile_id: string;
  status: string;
  adaptation_kind: string | null;
  parent_plan_id: string | null;
  trainer_id: string | null;
};

export function hiddenFromMember(plan: MemberPlanRow): boolean {
  if (plan.status === "draft" && plan.adaptation_kind === "daily") return true;
  return (
    (plan.status === "draft" || plan.status === "review") &&
    !plan.parent_plan_id &&
    plan.trainer_id !== plan.profile_id
  );
}

/** De plan-id's waarvan de workouts niet in het schema van deze leden horen. */
export async function memberHiddenPlanIds(
  client: SupabaseClient,
  profileIds: string[],
): Promise<Set<string>> {
  if (profileIds.length === 0) return new Set();
  const { data } = await client
    .from("training_plans")
    .select("id, profile_id, status, adaptation_kind, parent_plan_id, trainer_id")
    .in("profile_id", profileIds)
    .in("status", ["draft", "review"]);
  return new Set(
    ((data ?? []) as MemberPlanRow[]).filter(hiddenFromMember).map((plan) => plan.id),
  );
}
