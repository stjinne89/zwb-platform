"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  COMMUNITY_ROLES,
  normalizeCommunityRoles,
} from "@/lib/community-roles";

export async function claimRosterEntry(entryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_roster_entry", {
    p_entry_id: entryId,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data) {
    return {
      ok: false as const,
      error: "Deze vermelding is al geclaimd of bestaat niet meer.",
    };
  }
  revalidatePath("/leden");
  revalidatePath("/profiel");
  return { ok: true as const };
}

export async function unclaimRosterEntry(entryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unclaim_roster_entry", {
    p_entry_id: entryId,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Kan niet ongedaan maken." };
  revalidatePath("/leden");
  return { ok: true as const };
}

export async function approveUser(profileId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("members.approve")) {
    return { ok: false as const, error: "Geen recht om leden goed te keuren." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      is_approved: true,
      approved_at: new Date().toISOString(),
      approved_by: access.user.id,
    })
    .eq("id", profileId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/leden");
  return { ok: true as const };
}

export async function updateMemberRoles(profileId: string, roles: string[]) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("members.manage_roles")) {
    return { ok: false as const, error: "Geen recht om rollen te wijzigen." };
  }

  const validRoles = roles.filter((role) =>
    (COMMUNITY_ROLES as readonly string[]).includes(role),
  );
  const community_roles = normalizeCommunityRoles(validRoles);

  const { error } = await supabase
    .from("profiles")
    .update({ community_roles })
    .eq("id", profileId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/leden");
  revalidatePath("/profiel");
  return { ok: true as const };
}
