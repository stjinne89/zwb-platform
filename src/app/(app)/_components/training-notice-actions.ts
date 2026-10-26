"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/session-user";
import { usesTraining } from "@/lib/weekly-review/load";

/**
 * Voor de melding "Nieuw in ZWBeter trainen": gebruikt dit lid ZWBeter voor de
 * training (een doel of een schema)? Wordt pas gevraagd als de melding op dit
 * apparaat nog niet gezien is, dus niet bij elke pagina.
 */
export async function usesZwbeterTraining(): Promise<boolean> {
  const user = await getSessionUser(await createClient());
  if (!user) return false;
  try {
    return await usesTraining(createAdminClient(), user.id);
  } catch {
    return false;
  }
}
