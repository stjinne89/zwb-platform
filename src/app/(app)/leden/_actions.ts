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
