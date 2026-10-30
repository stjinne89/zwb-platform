import "server-only";

import type { CurrentUserAccess } from "@/lib/auth/permissions";
import { normalizeCommunityRoles } from "@/lib/community-roles";
import { createAdminClient } from "@/lib/supabase/admin";

/** Captain of co-captain van een ladderteam, ook van een team in het archief. */
async function isLadderCaptain(profileId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_members")
    .select("team_id, teams!inner(type)")
    .eq("profile_id", profileId)
    .eq("teams.type", "ladder")
    .in("role", ["captain", "co-captain"])
    .limit(1);
  return !error && (data ?? []).length > 0;
}

/**
 * Wie renners over de ladderteams verdeelt: wie het rooster mag beheren, of
 * captain/co-captain van een ladderteam. Anders dan bij een los team geldt een
 * captain voor alle ladderteams, omdat de captains samen de verdeling maken
 * (zoals een ZRL-captain van het hoofdteam alle subteams indeelt).
 */
export async function canAssignLadderRiders(access: CurrentUserAccess): Promise<boolean> {
  if (!access.user) return false;
  if (access.has("teams.manage_roster")) return true;
  return isLadderCaptain(access.user.id);
}

/**
 * Wie de Ladderpuzzel bewerkt: iedereen met de rol teamcaptain, en geen andere
 * rol (ook bestuur niet, al heeft dat teams.manage_roster; afspraak eigenaar
 * 2026-10-29). Captain van een ladderteam zijn telt hier niet.
 */
export async function canEditLadderPuzzle(access: CurrentUserAccess): Promise<boolean> {
  if (!access.user) return false;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("community_roles")
    .eq("id", access.user.id)
    .maybeSingle();
  if (error || !data) return false;
  return normalizeCommunityRoles(data.community_roles as string[] | null).includes("team_captain");
}
