import "server-only";

// Gewicht per renner voor de ladder-matchup en het route-advies.
//
// Het gewicht waarmee Zwift rekent, dus eerst uit Zwift zelf, voor beide teams
// dezelfde bron: de Zwift-uitslag van een bewaarde ladderrace
// (`club_ladder_match_riders.weight_kg`) of een segmentpassage uit de
// racebriefing (`zwift_segment_bests.best_weight_kg`), de nieuwste van de twee.
// Alleen voor een ZWB'er zonder die twee: het gewicht uit intervals.icu
// (`rider_power_profiles`). Het gewicht staat nergens los op een pagina.

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export type WeightEntry = { zwiftId: number; kg: number; at: string };

const positiveId = (value: unknown) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const kgOf = (value: unknown) => {
  const kg = Number(value);
  return Number.isFinite(kg) && kg >= 30 && kg <= 200 ? Math.round(kg * 10) / 10 : null;
};

/** Per renner het nieuwste gewicht; bij dezelfde datum telt de eerste. */
export function latestRiderWeights(entries: WeightEntry[]): Map<number, number> {
  const latest = new Map<number, WeightEntry>();
  for (const entry of entries) {
    const known = latest.get(entry.zwiftId);
    if (!known || entry.at > known.at) latest.set(entry.zwiftId, entry);
  }
  return new Map([...latest].map(([id, entry]) => [id, entry.kg]));
}

export async function loadRiderWeights(admin: Admin, zwiftIds: number[]): Promise<Map<number, number>> {
  const ids = [...new Set(zwiftIds.filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (ids.length === 0) return new Map();
  const [{ data: ladderRows }, { data: segmentRows }] = await Promise.all([
    admin.from("club_ladder_match_riders").select("result_id, zwift_id, weight_kg").in("zwift_id", ids).not("weight_kg", "is", null),
    admin.from("zwift_segment_bests").select("zwift_id, best_weight_kg, best_at").in("zwift_id", ids).not("best_weight_kg", "is", null),
  ]);
  const ladder = (ladderRows ?? []) as Array<{ result_id: number; zwift_id: number | string; weight_kg: number | string }>;
  const resultIds = [...new Set(ladder.map((row) => row.result_id))];
  const { data: matchRows } = resultIds.length
    ? await admin.from("club_ladder_matches").select("result_id, raced_on").in("result_id", resultIds)
    : { data: [] };
  const racedOn = new Map(((matchRows ?? []) as Array<{ result_id: number; raced_on: string }>).map((row) => [row.result_id, row.raced_on]));

  const entries: WeightEntry[] = [];
  for (const row of ladder) {
    const zwiftId = positiveId(row.zwift_id);
    const kg = kgOf(row.weight_kg);
    if (zwiftId && kg) entries.push({ zwiftId, kg, at: racedOn.get(row.result_id) ?? "" });
  }
  for (const row of (segmentRows ?? []) as Array<{ zwift_id: number | string; best_weight_kg: number | string; best_at: string | null }>) {
    const zwiftId = positiveId(row.zwift_id);
    const kg = kgOf(row.best_weight_kg);
    // Een datum (jjjj-mm-dd) is te vergelijken met de racedatum van de ladder.
    if (zwiftId && kg) entries.push({ zwiftId, kg, at: (row.best_at ?? "").slice(0, 10) });
  }
  const weights = latestRiderWeights(entries);

  const missing = ids.filter((id) => !weights.has(id));
  if (missing.length === 0) return weights;
  const { data: profileRows } = await admin.from("profiles").select("id, zwift_id").in("zwift_id", missing.map(String));
  const profiles = ((profileRows ?? []) as Array<{ id: string; zwift_id: string | null }>)
    .map((row) => ({ id: row.id, zwiftId: positiveId(row.zwift_id?.trim()) }))
    .filter((row): row is { id: string; zwiftId: number } => row.zwiftId !== null);
  if (profiles.length === 0) return weights;
  const { data: powerRows } = await admin
    .from("rider_power_profiles")
    .select("profile_id, weight_kg")
    .in("profile_id", profiles.map((row) => row.id));
  const byProfile = new Map(((powerRows ?? []) as Array<{ profile_id: string; weight_kg: number | string | null }>).map((row) => [row.profile_id, kgOf(row.weight_kg)]));
  for (const profile of profiles) {
    const kg = byProfile.get(profile.id);
    if (kg && !weights.has(profile.zwiftId)) weights.set(profile.zwiftId, kg);
  }
  return weights;
}
