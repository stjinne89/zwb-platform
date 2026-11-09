"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { CLUB_TAG, getClub } from "@/lib/club";
import { PALETTE_KEYS, normalizeHex, type PaletteInput } from "@/lib/club-theme";

/**
 * Slaat de vijf kleuren van de club op (0314), of wist ze met null: dan geldt
 * weer de standaard huisstijl. Schrijven met de service role na de
 * rechtencheck; club_settings heeft geen schrijfpolicy.
 */
export async function updateClubColors(input: PaletteInput | null) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("roles.manage_permissions")) {
    return { ok: false as const, error: "Geen recht om de huisstijl te wijzigen." };
  }

  const colors: Record<string, string | null> = {};
  for (const key of PALETTE_KEYS) {
    const raw = input?.[key];
    const hex = normalizeHex(raw);
    if (raw && !hex) return { ok: false as const, error: `Geen geldige kleur: ${raw}` };
    colors[`color_${key}`] = hex;
  }

  // Alleen de kleuren bijwerken: de naam en de rest van de rij blijven staan.
  const admin = createAdminClient();
  const changes = { ...colors, updated_at: new Date().toISOString(), updated_by: access.user.id };
  const { data, error } = await admin.from("club_settings").update(changes).eq("id", true).select("id");
  if (error) return { ok: false as const, error: error.message };
  if (!data?.length) {
    // Een installatie zonder rij krijgt er een, met de neutrale naam.
    const { settings } = await getClub();
    const { error: insertError } = await admin
      .from("club_settings")
      .insert({ id: true, name: settings.name, short_name: settings.shortName, ...changes });
    if (insertError) return { ok: false as const, error: insertError.message };
  }

  updateTag(CLUB_TAG);
  // De kleuren staan in de root layout van elke pagina.
  revalidatePath("/", "layout");
  return { ok: true as const };
}
