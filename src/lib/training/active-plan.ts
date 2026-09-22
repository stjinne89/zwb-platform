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

  return pickActiveBasePlan((data ?? []) as ActiveBasePlan[]);
}

/**
 * Welk van de lopende basisplannen van één lid hét schema is. Een gepubliceerd
 * schema gaat voor een goedgekeurd concept; daarbinnen het meest recent
 * bijgewerkte.
 */
export function pickActiveBasePlan<T extends { status: string; updated_at: string | null }>(
  plans: T[],
): T | null {
  const newestFirst = [...plans].sort((a, b) =>
    String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")),
  );
  return newestFirst.find((plan) => plan.status === "published") ?? newestFirst[0] ?? null;
}

/**
 * Per lid alleen het lopende schema, volgens pickActiveBasePlan.
 *
 * De dagelijkse cron nam elk goedgekeurd of gepubliceerd basisplan dat nog niet
 * was afgelopen. Een nieuw schema archiveerde het vorige niet, dus Jeroen en
 * Stijn hadden er in september 2026 elk twee: het oude met een einddatum eind
 * september, het nieuwe tot eind oktober. Elk kreeg een eigen dagvoorstel, en
 * dat van het oude plan werkte met het oude doel en wiste bij publicatie alles
 * tot díéns einddatum — de lege week van 21 september.
 */
export function onePlanPerProfile<
  T extends { profile_id: string; status: string; updated_at: string | null },
>(plans: T[]): T[] {
  const byProfile = new Map<string, T[]>();
  for (const plan of plans) {
    const list = byProfile.get(plan.profile_id) ?? [];
    list.push(plan);
    byProfile.set(plan.profile_id, list);
  }
  return [...byProfile.values()].flatMap((list) => {
    const active = pickActiveBasePlan(list);
    return active ? [active] : [];
  });
}

/**
 * Een nieuw schema neemt het over: de andere lopende basisplannen van dit lid
 * gaan naar het archief. Aanroepen zodra een basisplan goedgekeurd of
 * gepubliceerd wordt.
 *
 * Alleen de status. De workouts van het oude plan blijven staan waar het nieuwe
 * plan ze niet vervangt, net als voorheen; dit gaat erom dat de cron en "pas
 * vandaag aan" niet langer op het oude plan voortbouwen.
 */
export async function archiveOtherBasePlans(
  admin: Admin,
  planId: string,
  profileId: string,
): Promise<number> {
  const { data } = await admin
    .from("training_plans")
    .update({ status: "archived" })
    .eq("profile_id", profileId)
    .is("parent_plan_id", null)
    .neq("id", planId)
    .in("status", ["approved", "published"])
    .select("id");
  return (data ?? []).length;
}
