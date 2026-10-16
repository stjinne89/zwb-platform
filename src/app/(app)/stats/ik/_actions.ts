"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session-user";
import { parseLayoutInput } from "@/lib/stats/tiles";

/** Slaat de tegelkeuze op /stats/ik op; RLS laat alleen de eigen rij toe. */
export async function saveStatsTiles(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const layout = parseLayoutInput(input);
  if (!layout) return { ok: false, error: "Ongeldige tegelkeuze." };

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { ok: false, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("profile_stats_tiles")
    .upsert(
      { profile_id: user.id, tiles: layout, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" },
    );
  if (error) return { ok: false, error: "Opslaan lukte niet." };

  revalidatePath("/stats/ik");
  return { ok: true };
}
