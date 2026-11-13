"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/session-user";
import { SCALE_VERSION } from "@/lib/briljant/norms";

/**
 * Voor de melding over de nieuwe durability: heeft dit lid een ZWBriljant-steen
 * op de huidige schaal? Wordt pas gevraagd als de melding op dit apparaat nog
 * niet gezien is, dus niet bij elke pagina.
 */
export async function hasBriljantStone(): Promise<boolean> {
  const user = await getSessionUser(await createClient());
  if (!user) return false;
  try {
    const { data } = await createAdminClient()
      .from("zwbriljant_snapshots")
      .select("profile_id")
      .eq("profile_id", user.id)
      .eq("provenance->>scale", SCALE_VERSION)
      .limit(1);
    return (data ?? []).length > 0;
  } catch {
    return false;
  }
}
