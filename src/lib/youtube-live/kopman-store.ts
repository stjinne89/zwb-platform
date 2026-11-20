import type { SupabaseClient } from "@supabase/supabase-js";
import { parseKopman, type KopmanLook } from "./kopman";

/**
 * De eigen kopman van een lid (0347), of null: geen figuur, of de tabel is er
 * nog niet. Met de service-role voor overlay en thumbnail, met de eigen sessie
 * op de racepagina (alleen de eigen rij).
 */
export async function loadKopman(client: SupabaseClient, profileId: string): Promise<KopmanLook | null> {
  try {
    const { data, error } = await client
      .from("stream_kopman")
      .select("look")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (error) return null;
    return parseKopman((data as { look?: unknown } | null)?.look);
  } catch {
    return null;
  }
}
