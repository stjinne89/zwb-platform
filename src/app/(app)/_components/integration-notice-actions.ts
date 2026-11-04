"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/session-user";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * De pop-up "nog niet gekoppeld" is gezien (0307). Met de admin-client, want
 * leden mogen de tabel niet zelf wijzigen; daarom alleen rijen van dit lid.
 */
export async function markIntegrationNoticesSeen(ids: string[]): Promise<void> {
  const user = await getSessionUser(await createClient());
  if (!user) return;
  const clean = [...new Set((ids ?? []).flatMap((id) => String(id).split(",")))].filter((id) => UUID.test(id));
  if (clean.length === 0) return;
  await createAdminClient()
    .from("integration_notices")
    .update({ seen_at: new Date().toISOString() })
    .in("id", clean.slice(0, 50))
    .eq("profile_id", user.id)
    .is("seen_at", null);
}
