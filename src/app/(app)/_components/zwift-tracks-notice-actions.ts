"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session-user";
import { loadMissingZwiftTracks, type MissingZwiftTracks } from "@/lib/zwblokken/missing-tracks";

/**
 * Voor de melding "Je Zwift-ritten tellen nog niet mee". Wordt hooguit één keer
 * per browsersessie gevraagd, en niet zolang het lid "Later" koos.
 */
export async function missingZwiftTracks(): Promise<MissingZwiftTracks | null> {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return null;
  return loadMissingZwiftTracks(supabase, user.id).catch(() => null);
}
