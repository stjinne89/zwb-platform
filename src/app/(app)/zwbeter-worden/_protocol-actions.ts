"use server";

// Acties voor de protocollen: starten, afvinken en stoppen. Het lid schrijft
// zelf (RLS in 0233); er gaat niets naar intervals.icu, TSS of naleving.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { isRunOver, protocolBySlug, runDates, startBlocker } from "@/lib/protocols";
import { PROTOCOL_CONSENT_VERSION } from "@/lib/protocols/consent";
import { ageFromBirthDate } from "@/lib/nutrition/targets";

export type ProtocolActionResult = { ok: true } | { ok: false; error: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function todayKeyAmsterdam() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

async function currentUser() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) throw new Error("Niet ingelogd.");
  return { supabase, user: access.user };
}

function refresh() {
  revalidatePath("/zwbeter-worden", "layout");
}

export async function startProtocol(formData: FormData): Promise<ProtocolActionResult> {
  const protocol = protocolBySlug(text(formData.get("slug")));
  if (!protocol) return { ok: false, error: "Onbekend protocol." };
  if (text(formData.get("consent")) !== "ja") {
    return { ok: false, error: "Geef eerst toestemming." };
  }

  const date = text(formData.get("date"));
  if (!DAY.test(date)) return { ok: false, error: "Kies een datum." };
  const today = todayKeyAmsterdam();
  if (date < today) return { ok: false, error: "Die datum is al voorbij." };

  const dates = runDates(protocol, protocol.anchor === "wedstrijd" ? { raceDate: date } : { startDate: date });
  if (!dates) return { ok: false, error: "Kies een datum." };

  const { supabase, user } = await currentUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("birth_date")
    .eq("id", user.id)
    .single();
  const blocker = startBlocker(
    protocol,
    ageFromBirthDate((profile?.birth_date as string | null) ?? null, today),
  );
  if (blocker) return { ok: false, error: blocker };

  // Ligt de eerste dag al achter ons (een wedstrijd over een week), dan begint
  // het protocol vandaag; de dagnummers blijven aan de wedstrijd hangen.
  const startDate = dates.startDate < today ? today : dates.startDate;

  // Een vorige run die voorbij zijn laatste dag is, staat nog op actief (er is
  // geen nachtelijke job). Die sluiten we af, anders blokkeert de unieke index.
  const { data: previous } = await supabase
    .from("member_protocols")
    .select("id, protocol_slug, start_date, race_date, status")
    .eq("profile_id", user.id)
    .eq("protocol_slug", protocol.slug)
    .eq("status", "actief");
  for (const row of previous ?? []) {
    const run = {
      id: row.id as string,
      protocolSlug: protocol.slug,
      startDate: String(row.start_date).slice(0, 10),
      raceDate: row.race_date ? String(row.race_date).slice(0, 10) : null,
      status: "actief" as const,
    };
    if (isRunOver(protocol, run, today)) {
      await supabase.from("member_protocols").update({ status: "afgerond" }).eq("id", run.id);
    }
  }

  const { error } = await supabase.from("member_protocols").insert({
    profile_id: user.id,
    protocol_slug: protocol.slug,
    start_date: startDate,
    race_date: dates.raceDate,
    consent_version: PROTOCOL_CONSENT_VERSION,
  });
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Dit protocol loopt al." : error.message,
    };
  }
  refresh();
  return { ok: true };
}

/** Een taak afvinken of het vinkje weghalen. */
export async function toggleProtocolTask(formData: FormData): Promise<ProtocolActionResult> {
  const runId = text(formData.get("run_id"));
  const taskKey = text(formData.get("task_key"));
  const day = text(formData.get("day"));
  if (!runId || !taskKey || !DAY.test(day)) return { ok: false, error: "Onvolledig verzoek." };
  if (day > todayKeyAmsterdam()) return { ok: false, error: "Je kunt niet vooruit afvinken." };

  const { supabase } = await currentUser();
  const done = text(formData.get("done")) === "ja";
  const { error } = done
    ? await supabase
        .from("member_protocol_checks")
        .delete()
        .eq("protocol_id", runId)
        .eq("day", day)
        .eq("task_key", taskKey)
    : await supabase
        .from("member_protocol_checks")
        .upsert({ protocol_id: runId, day, task_key: taskKey }, { onConflict: "protocol_id,day,task_key" });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function stopProtocol(formData: FormData): Promise<ProtocolActionResult> {
  const runId = text(formData.get("run_id"));
  if (!runId) return { ok: false, error: "Geen protocol opgegeven." };
  const { supabase, user } = await currentUser();
  const { error } = await supabase
    .from("member_protocols")
    .update({ status: "gestopt", stopped_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("profile_id", user.id)
    .eq("status", "actief");
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
