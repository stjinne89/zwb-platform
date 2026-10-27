import "server-only";

import type { CurrentUserAccess } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Wie renners over de ladderteams verdeelt: wie het rooster mag beheren, of
 * captain/co-captain van een ladderteam. Anders dan bij een los team geldt een
 * captain voor alle ladderteams, omdat de captains samen de verdeling maken
 * (zoals een ZRL-captain van het hoofdteam alle subteams indeelt).
 */
export async function canAssignLadderRiders(access: CurrentUserAccess): Promise<boolean> {
  if (!access.user) return false;
  if (access.has("teams.manage_roster")) return true;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_members")
    .select("team_id, teams!inner(type)")
    .eq("profile_id", access.user.id)
    .eq("teams.type", "ladder")
    .in("role", ["captain", "co-captain"])
    .limit(1);
  return !error && (data ?? []).length > 0;
}
