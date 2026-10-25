// ZWBriljant: staan de kJ-standen in intervals.icu goed voor durability? Zonder
// vermoeide curve, of met alleen standen onder 10 kJ/kg, blijft durability leeg en
// telt die voor 0 (2026-10-25: bij 16 van de 24 stenen). De layout toont dan een
// melding met een link naar /hulp.

import type { SupabaseClient } from "@supabase/supabase-js";
import { DURABILITY_MIN_KJ_PER_KG } from "./norms";

export type FatigueSetupIssue = { kind: "geen" } | { kind: "te-laag"; afterKj: number };

/**
 * Wat er mis is met de vermoeide curves uit `rider_power_profiles`; null als er
 * minstens één stand is met genoeg werk voor het gewicht. Zonder gewicht is "te
 * laag" niet te beoordelen.
 */
export function fatigueSetupIssue(
  curves: Array<{ afterKj: number }> | null | undefined,
  weightKg: number | null,
): FatigueSetupIssue | null {
  const thresholds = (curves ?? []).map((curve) => Number(curve.afterKj)).filter((kj) => Number.isFinite(kj) && kj > 0);
  if (thresholds.length === 0) return { kind: "geen" };
  if (!weightKg || weightKg <= 0) return null;
  if (thresholds.every((kj) => kj / weightKg < DURABILITY_MIN_KJ_PER_KG)) {
    return { kind: "te-laag", afterKj: Math.max(...thresholds) };
  }
  return null;
}

/**
 * De melding voor dit lid, alleen met een powerprofiel uit intervals.icu (anders
 * is er niets te zeggen over de kJ-standen). Fouten zijn stil: dan geen melding.
 */
export async function loadFatigueSetupIssue(client: Pick<SupabaseClient, "from">, profileId: string): Promise<FatigueSetupIssue | null> {
  try {
    const { data } = await client
      .from("rider_power_profiles")
      .select("athlete_id, weight_kg, curve_points_fatigue")
      .eq("profile_id", profileId)
      .maybeSingle();
    const row = data as {
      athlete_id: string | null;
      weight_kg: number | string | null;
      curve_points_fatigue: Array<{ afterKj: number }> | null;
    } | null;
    if (!row?.athlete_id) return null;
    const weight = Number(row.weight_kg);
    return fatigueSetupIssue(row.curve_points_fatigue, Number.isFinite(weight) && weight > 0 ? weight : null);
  } catch {
    return null;
  }
}
