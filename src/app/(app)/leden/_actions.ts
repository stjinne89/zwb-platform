"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteAccount } from "@/lib/account-deletion";
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

  // De rol Bestuur geeft alle rechten: alleen wie rechten beheert mag hem geven
  // of afnemen (zelfde regel als de databasetrigger, migr. 0205).
  if (!access.has("roles.manage_permissions")) {
    const { data: current } = await supabase
      .from("profiles")
      .select("community_roles")
      .eq("id", profileId)
      .maybeSingle();
    const wasBoard = normalizeCommunityRoles(current?.community_roles).includes("board");
    if (wasBoard !== community_roles.includes("board")) {
      return { ok: false as const, error: "Geen recht om de rol Bestuur te geven of af te nemen." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ community_roles })
    .eq("id", profileId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/leden");
  revalidatePath("/profiel");
  return { ok: true as const };
}

/**
 * Verwijdert het account van een ander lid volledig (bv. een per ongeluk
 * goedgekeurde of verkeerde aanmelding). Alleen met rechtenbeheer, niet jezelf
 * en geen systeemadmin; ter bevestiging moet de weergavenaam exact worden
 * overgetypt. Dezelfde opruiming als "eigen account verwijderen".
 */
export async function deleteMember(profileId: string, confirmName: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("roles.manage_permissions")) {
    return { ok: false as const, error: "Geen recht om leden te verwijderen." };
  }
  if (profileId === access.user.id) {
    return { ok: false as const, error: "Je eigen account verwijder je via je profiel." };
  }

  const { data: target, error: readError } = await supabase
    .from("profiles")
    .select("id, display_name, is_admin")
    .eq("id", profileId)
    .maybeSingle();
  if (readError) return { ok: false as const, error: readError.message };
  if (!target) return { ok: false as const, error: "Lid niet gevonden." };
  if (target.is_admin) {
    return { ok: false as const, error: "Een systeemadmin kan niet worden verwijderd." };
  }

  const typed = (confirmName ?? "").trim().toLowerCase();
  const expected = ((target.display_name as string | null) ?? "").trim().toLowerCase();
  if (!typed || typed !== expected) {
    return { ok: false as const, error: "Typ de naam exact over om te bevestigen." };
  }

  const res = await deleteAccount(createAdminClient(), profileId);
  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath("/leden");
  return { ok: true as const };
}
