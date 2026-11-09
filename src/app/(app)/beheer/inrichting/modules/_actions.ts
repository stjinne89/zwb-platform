"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { CLUB_TAG } from "@/lib/club";
import { MODULE_KEYS, type ModuleKey } from "@/lib/modules";

/**
 * Zet modules aan of uit (0313). Alleen de aan/uit-stand: een eigen naam van de
 * module blijft staan. Schrijven met de service role na de rechtencheck; de
 * tabel heeft geen schrijfpolicy.
 */
export async function updateClubModules(input: Partial<Record<ModuleKey, boolean>>) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("roles.manage_permissions")) {
    return { ok: false as const, error: "Geen recht om modules te wijzigen." };
  }

  const now = new Date().toISOString();
  const rows = MODULE_KEYS.filter((key) => typeof input[key] === "boolean").map((key) => ({
    module_key: key,
    enabled: input[key] as boolean,
    updated_at: now,
    updated_by: access.user!.id,
  }));
  if (rows.length === 0) return { ok: true as const };

  const { error } = await createAdminClient()
    .from("club_modules")
    .upsert(rows, { onConflict: "module_key" });
  if (error) return { ok: false as const, error: error.message };

  updateTag(CLUB_TAG);
  // Menu, tegels en beheer staan in de layout van elke pagina.
  revalidatePath("/", "layout");
  return { ok: true as const };
}
