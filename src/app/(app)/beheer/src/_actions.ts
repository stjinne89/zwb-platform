"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { syncSrcCalendar } from "@/lib/src/sync";

const MANAGERS = ["events.manage_all", "community.manage"] as const;

/** De knop "Nu verversen": haalt de SRC-agenda op en zet nieuwe zondagen erin. */
export async function refreshSrcCalendar() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.hasAny(MANAGERS)) {
    return { ok: false as const, error: "Geen recht om de SRC-kalender te vullen." };
  }

  const result = await syncSrcCalendar(createAdminClient(), { createdBy: access.user.id });
  revalidatePath("/kalender");
  revalidatePath("/beheer/src");
  revalidatePath("/events/[id]", "page");
  if (result.error) return { ok: false as const, error: result.error };
  return { ok: true as const, result };
}
