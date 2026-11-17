"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session-user";
import { getClub } from "@/lib/club";
import { parseEntryForm } from "@/lib/uitdaging";

type Result = { ok: true } | { ok: false; error: string };

async function guard() {
  const supabase = await createClient();
  const [user, club] = await Promise.all([getSessionUser(supabase), getClub()]);
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  if (!club.isEnabled("uitdaging")) return { ok: false as const, error: "Deze module staat uit." };
  return { ok: true as const, supabase, userId: user.id };
}

function revalidate(eventId: string) {
  revalidatePath("/uitdaging");
  revalidatePath(`/events/${eventId}`);
}

/** Aanmelden of je deelname bijwerken. De eerste keer ook "ja" bij het event. */
export async function saveChallengeEntry(formData: FormData): Promise<Result> {
  const g = await guard();
  if (!g.ok) return g;

  const eventId = String(formData.get("event_id") ?? "").trim();
  if (!eventId) return { ok: false, error: "Geen event." };
  const parsed = parseEntryForm(formData);
  if (!parsed.ok) return parsed;

  const { data: event } = await g.supabase
    .from("events")
    .select("id, kind")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || event.kind !== "goed_doel") return { ok: false, error: "Event niet gevonden." };

  const { data: existing } = await g.supabase
    .from("challenge_entries")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("profile_id", g.userId)
    .maybeSingle();

  const now = new Date().toISOString();
  const { error } = await g.supabase.from("challenge_entries").upsert({
    event_id: eventId,
    profile_id: g.userId,
    target_climbs: parsed.value.targetClimbs,
    climbs_done: parsed.value.climbsDone,
    fundraising_target_eur: parsed.value.fundraisingTargetEur,
    raised_eur: parsed.value.raisedEur,
    fundraising_url: parsed.value.fundraisingUrl,
    updated_at: now,
  });
  if (error) return { ok: false, error: error.message };

  if (!existing) {
    await g.supabase
      .from("event_rsvps")
      .upsert({ event_id: eventId, profile_id: g.userId, status: "yes", updated_at: now });
  }

  revalidate(eventId);
  return { ok: true };
}

/** Afmelden. Je RSVP bij het event blijft staan; die zet je op de eventpagina. */
export async function deleteChallengeEntry(eventId: string): Promise<Result> {
  const g = await guard();
  if (!g.ok) return g;

  const { error } = await g.supabase
    .from("challenge_entries")
    .delete()
    .eq("event_id", eventId)
    .eq("profile_id", g.userId);
  if (error) return { ok: false, error: error.message };

  revalidate(eventId);
  return { ok: true };
}
