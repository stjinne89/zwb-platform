"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Een lid beheert zijn eigen vertrekpunten, en niemand anders — ook beheer niet.
 * Daarom de gewone RLS-client en niet de admin-client: de policy uit migratie
 * 0173 is hier de grendel, en de eq() de tweede. Zie de privacytoelichting boven
 * in die migratie.
 *
 * De coördinaat wordt in de database afgerond op ~110 m door een trigger, niet
 * hier: een tweede schrijfpad mag die afronding niet kunnen overslaan.
 */
export async function saveStartPoint(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Niet ingelogd.");

    const label = String(formData.get("label") ?? "").trim();
    if (!label) throw new Error("Geef het punt een naam.");

    const lat = Number(formData.get("lat"));
    const lon = Number(formData.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error("Kies eerst een punt op de kaart.");
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error("Dat punt ligt niet op de kaart.");
    }

    const { error } = await supabase
      .from("profile_start_points")
      .insert({ profile_id: user.id, label: label.slice(0, 60), lat, lon });
    if (error) throw new Error(error.message);

    revalidatePath("/profiel");
    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Vertrekpunt bewaren faalde.",
    };
  }
}

export async function deleteStartPoint(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Niet ingelogd.");

    const id = String(formData.get("start_point_id") ?? "").trim();
    if (!id) throw new Error("Vertrekpunt ontbreekt.");

    const { error } = await supabase
      .from("profile_start_points")
      .delete()
      .eq("id", id)
      .eq("profile_id", user.id);
    if (error) throw new Error(error.message);

    revalidatePath("/profiel");
    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Vertrekpunt verwijderen faalde.",
    };
  }
}
