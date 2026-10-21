"use server";

import { revalidatePath } from "next/cache";
import { getRequestUser } from "@/lib/auth/request";
import { createClient } from "@/lib/supabase/server";

/** De versie van de toestemming om je steen met leden te delen (0265). */
const SHARE_CONSENT_VERSION = "2026-10-21";

/**
 * Je steen delen met alle goedgekeurde leden, of niet meer. Met de sessie van het
 * lid: RLS laat alleen je eigen voorkeur schrijven. Niet meer delen haalt de
 * toestemming weg; je eigen historie blijft.
 */
export async function setBriljantSharing(share: boolean): Promise<{ ok: boolean }> {
  const user = await getRequestUser();
  if (!user) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("zwbriljant_preferences")
    .upsert(
      { profile_id: user.id, consent_version: share ? SHARE_CONSENT_VERSION : null, visible: true },
      { onConflict: "profile_id" },
    );
  if (error) return { ok: false };
  revalidatePath("/stats/zwbriljant");
  return { ok: true };
}
