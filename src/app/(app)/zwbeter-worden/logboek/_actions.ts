"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSymptomKey } from "@/lib/training/symptoms";

/**
 * Het logboek is gezondheidsdata: eigen opt-in, en zonder die opt-in tonen we
 * het niet en rekent er niets mee. Uitzetten laat bestaande invoer staan — dat
 * is aan het lid om te wissen.
 */
export async function setSymptomTracking(enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("profiles")
    .update({ symptom_tracking_enabled: enabled })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/zwbeter-worden/logboek");
  return { ok: true as const };
}

export async function saveSymptomLog(input: {
  logDate: string;
  severity: number | null;
  symptoms: string[];
  cycleStart: boolean;
  note: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.logDate)) {
    return { ok: false as const, error: "Ongeldige datum." };
  }
  if (input.severity != null && (input.severity < 1 || input.severity > 5)) {
    return { ok: false as const, error: "Ongeldige score." };
  }
  const symptoms = input.symptoms.filter(isSymptomKey);
  const note = input.note?.trim() || null;
  if (note && note.length > 500) {
    return { ok: false as const, error: "Notitie mag maximaal 500 tekens zijn." };
  }

  const { error } = await supabase.from("symptom_logs").upsert(
    {
      profile_id: user.id,
      log_date: input.logDate,
      severity: input.severity,
      symptoms,
      cycle_start: input.cycleStart,
      note,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,log_date" },
  );
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/zwbeter-worden/logboek");
  revalidatePath("/zwbeter-worden");
  return { ok: true as const };
}

export async function deleteSymptomLog(logDate: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("symptom_logs")
    .delete()
    .eq("profile_id", user.id)
    .eq("log_date", logDate);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/zwbeter-worden/logboek");
  return { ok: true as const };
}
