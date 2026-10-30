"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { adminAreaPermission } from "@/lib/admin-areas";
import { parseDateKey } from "@/lib/birthdays";
import {
  ITEM_MAX,
  ITEMS_MAX,
  SUMMARY_MAX,
  SUMMARY_MIN,
  parseItems,
  publishAtFor,
  weekStartOf,
} from "@/lib/app-updates/schedule";

type Result = { ok: true } | { ok: false; error: string };

/** Eén update per week: opslaan op een week die er al een heeft, past die aan. */
export async function saveAppUpdate(formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user || !access.has(adminAreaPermission("appUpdates"))) {
    return { ok: false, error: "Geen recht om app-updates te schrijven." };
  }

  const day = String(formData.get("day") ?? "");
  if (!parseDateKey(day)) return { ok: false, error: "Kies een week." };
  const summary = String(formData.get("summary") ?? "").trim();
  if (summary.length < SUMMARY_MIN || summary.length > SUMMARY_MAX) {
    return { ok: false, error: `Samenvatting moet tussen ${SUMMARY_MIN} en ${SUMMARY_MAX} tekens zijn.` };
  }
  const changes = parseItems(String(formData.get("changes") ?? ""));
  const fixes = parseItems(String(formData.get("fixes") ?? ""));
  if (changes.length + fixes.length === 0) return { ok: false, error: "Zet er minstens één punt in." };
  if (changes.length + fixes.length > ITEMS_MAX) return { ok: false, error: `Hooguit ${ITEMS_MAX} punten.` };
  if ([...changes, ...fixes].some((item) => item.length > ITEM_MAX)) {
    return { ok: false, error: `Een punt is hooguit ${ITEM_MAX} tekens.` };
  }

  const weekStart = weekStartOf(day);
  const { error } = await supabase.from("app_updates").upsert(
    {
      week_start: weekStart,
      publish_at: publishAtFor(weekStart),
      summary,
      changes,
      fixes,
      created_by: access.user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "week_start" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/updates");
  revalidatePath("/beheer/app-updates");
  return { ok: true };
}

export async function deleteAppUpdate(id: string): Promise<Result> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.has(adminAreaPermission("appUpdates"))) {
    return { ok: false, error: "Geen recht om app-updates te verwijderen." };
  }

  const { error } = await supabase.from("app_updates").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/updates");
  revalidatePath("/beheer/app-updates");
  return { ok: true };
}
