import "server-only";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { CLUB_TAG, getClub } from "@/lib/club";

// Schrijven in club_settings (0313) vanuit de beheerschermen: huisstijl en
// inrichting. Met de service role na de rechtencheck; de tabel heeft geen
// schrijfpolicy.

export type WriteResult = { ok: true } | { ok: false; error: string };

/** De ingelogde gebruiker, als die de club mag inrichten (roles.manage_permissions). */
export async function requireClubOwner(
  denied = "Geen recht om de club in te richten.",
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false, error: "Niet ingelogd." };
  if (!access.has("roles.manage_permissions")) return { ok: false, error: denied };
  return { ok: true, userId: access.user.id };
}

/** Na een wijziging: de gedeelde cache weg, en elke pagina opnieuw (de layout leest de club). */
export function refreshClub() {
  updateTag(CLUB_TAG);
  revalidatePath("/", "layout");
}

/**
 * Werkt kolommen van club_settings bij; de rest van de rij blijft staan. Een
 * installatie zonder rij krijgt er een, met de neutrale naam.
 */
export async function writeClubSettings(
  userId: string,
  columns: Record<string, string | string[] | null>,
): Promise<WriteResult> {
  const admin = createAdminClient();
  const changes = { ...columns, updated_at: new Date().toISOString(), updated_by: userId };
  const { data, error } = await admin.from("club_settings").update(changes).eq("id", true).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) {
    const { settings } = await getClub();
    const { error: insertError } = await admin
      .from("club_settings")
      .insert({ id: true, name: settings.name, short_name: settings.shortName, ...changes });
    if (insertError) return { ok: false, error: insertError.message };
  }
  refreshClub();
  return { ok: true };
}
