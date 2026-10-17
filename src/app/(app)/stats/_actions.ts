"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session-user";
import { parseLayoutInput, TILES_BY_PAGE, type StatsPage } from "@/lib/stats/tiles";

/**
 * Slaat de tegelkeuze van /stats (club) of /stats/ik op; RLS laat alleen de
 * eigen rij toe. Elke pagina heeft een eigen kolom.
 */
export async function saveStatsTiles(
  input: unknown,
  page: StatsPage = "ik",
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (page !== "ik" && page !== "club") return { ok: false, error: "Onbekende pagina." };
  const layout = parseLayoutInput<string>(input, TILES_BY_PAGE[page]);
  if (!layout) return { ok: false, error: "Ongeldige tegelkeuze." };

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { ok: false, error: "Niet ingelogd." };

  const column = page === "club" ? "club_tiles" : "tiles";
  const { error } = await supabase
    .from("profile_stats_tiles")
    .upsert(
      { profile_id: user.id, [column]: layout, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" },
    );
  if (error) return { ok: false, error: "Opslaan lukte niet." };

  revalidatePath(page === "club" ? "/stats" : "/stats/ik");
  return { ok: true };
}
