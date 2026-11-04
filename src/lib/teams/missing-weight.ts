// Zonder gewicht geen W/kg: de teamtabellen en de ladder (die op W/kg sorteert)
// laten zo'n renner leeg. Het gewicht komt uit het profiel of, via de
// intervals-sync, uit het powerprofiel; ontbreekt het in allebei, dan krijgt het
// lid een melding met een link naar het veld op het profiel.

import type { SupabaseClient } from "@supabase/supabase-js";

function positive(value: number | string | null | undefined) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) && n > 0;
}

/** Waar de melding naartoe linkt: het gewichtsveld op het profiel. */
export const WEIGHT_FIELD_HREF = "/profiel?weergave=bewerken#fysiek";

export function weightKnown(
  profileWeight: number | string | null | undefined,
  powerWeight: number | string | null | undefined,
) {
  return positive(profileWeight) || positive(powerWeight);
}

/**
 * Of het lid een gewicht mist. Met `inTeam` alleen als het lid in minstens één
 * team zit: wie niet in een team rijdt, mist in de teams ook niets.
 */
export async function loadWeightMissing(
  supabase: SupabaseClient,
  profileId: string,
  { inTeam = false }: { inTeam?: boolean } = {},
): Promise<boolean> {
  const [{ data: profile }, { data: power }, membership] = await Promise.all([
    supabase.from("profiles").select("weight_kg").eq("id", profileId).maybeSingle(),
    supabase.from("rider_power_profiles").select("weight_kg").eq("profile_id", profileId).maybeSingle(),
    inTeam
      ? supabase
          .from("team_members")
          .select("team_id", { count: "exact", head: true })
          .eq("profile_id", profileId)
      : Promise.resolve({ count: 1 }),
  ]);
  // Zonder profielrij (of als die niet te lezen is) geen melding: liever niets
  // dan een melding die na invullen blijft staan.
  if (!profile) return false;
  if ((membership.count ?? 0) === 0) return false;
  return !weightKnown(
    (profile as { weight_kg: number | string | null }).weight_kg,
    (power as { weight_kg: number | string | null } | null)?.weight_kg,
  );
}
