import type { SupabaseClient } from "@supabase/supabase-js";

/** Wat de middleware per verzoek van het lid nodig heeft: goedkeuring en groepen. */
export type GateProfile = {
  is_approved: boolean | null;
  is_admin: boolean | null;
  community_roles: string[] | null;
};

// Kort onthouden binnen een warme instantie (zoals modules-gate.ts). Een pagina
// met veel links laat de browser tot 25 verzoeken per seconde prefetchen, en elk
// verzoek vroeg dit profiel opnieuw op: op 2026-11-19 ruim 14.000 keer per dag,
// de drukste vraag aan de database. Gevolg: een goedkeuring, intrekking of
// groepswijziging werkt hooguit een minuut later door in de middleware. De
// rechten op data blijven in RLS en in de server-actions.
const TTL_MS = 60_000;
const MAX_ENTRIES = 500;
const cache = new Map<string, { at: number; profile: GateProfile }>();

export async function loadGateProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<GateProfile | null> {
  const now = Date.now();
  const hit = cache.get(userId);
  if (hit && now - hit.at < TTL_MS) return hit.profile;

  const { data, error } = await supabase
    .from("profiles")
    .select("is_approved, is_admin, community_roles")
    .eq("id", userId)
    .maybeSingle();
  // Een fout of een ontbrekend profiel niet onthouden: het volgende verzoek
  // vraagt het opnieuw, net als voorheen.
  if (error || !data) return null;

  const profile = data as GateProfile;
  if (cache.size >= MAX_ENTRIES) cache.clear();
  cache.set(userId, { at: now, profile });
  return profile;
}

/** Voor de tests: de onthouden profielen vergeten. */
export function resetGateProfileCache() {
  cache.clear();
}
