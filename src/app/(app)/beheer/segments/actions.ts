"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { backfillSegmentBatch } from "@/lib/segments/backfill";

export async function runSegmentBatch(profileId: string) {
  const access = await getCurrentUserAccess(await createClient());
  if (!access.user || !access.has("community.manage")) return { error: "Geen toegang" };
  if (!/^[0-9a-f-]{36}$/i.test(profileId)) return { error: "Ongeldig lid" };
  try { return { result: await backfillSegmentBatch(createAdminClient(), profileId) }; }
  catch (error) { return { error: error instanceof Error ? error.message : "Synchronisatie mislukt" }; }
}
