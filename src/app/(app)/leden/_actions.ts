"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin)
    return { ok: false as const, error: "Alleen admins kunnen goedkeuren." };

  const { error } = await supabase
    .from("profiles")
    .update({
      is_approved: true,
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("id", profileId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/leden");
  return { ok: true as const };
}
