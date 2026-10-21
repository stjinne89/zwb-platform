"use server";

import { revalidatePath } from "next/cache";
import { getRequestUser } from "@/lib/auth/request";
import { createClient } from "@/lib/supabase/server";

/**
 * Je steen tonen aan alle goedgekeurde leden (de standaard, 0267) of verbergen. Met
 * de sessie van het lid: RLS laat alleen je eigen voorkeur schrijven. Verbergen
 * werkt meteen; je eigen historie blijft.
 */
export async function setBriljantSharing(share: boolean): Promise<{ ok: boolean }> {
  const user = await getRequestUser();
  if (!user) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("zwbriljant_preferences")
    .upsert(
      { profile_id: user.id, visible: share },
      { onConflict: "profile_id" },
    );
  if (error) return { ok: false };
  revalidatePath("/stats/zwbriljant");
  return { ok: true };
}
