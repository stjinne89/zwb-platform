"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { scrapeEventResults } from "@/lib/event-results/scrape";

type Status = "yes" | "maybe" | "no";

export async function setRsvp(eventId: string, status: Status) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase.from("event_rsvps").upsert({
    event_id: eventId,
    profile_id: user.id,
    status,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/events/${eventId}`);
  return { ok: true as const };
}

export async function refreshEventResults(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: event } = await supabase
    .from("events")
    .select("id, created_by, results_url")
    .eq("id", eventId)
    .single();
  if (!event) return { ok: false as const, error: "Event niet gevonden." };

  const access = await getCurrentUserAccess(supabase);
  const canManage =
    access.has("events.manage_all") || event.created_by === user.id;
  if (!canManage) {
    return { ok: false as const, error: "Geen recht om uitslagen op te halen." };
  }

  const resultsUrl = (event.results_url ?? "").trim();
  if (!resultsUrl) {
    return {
      ok: false as const,
      error: "Geen uitslag-URL ingevuld. Voeg er een toe via Bewerk.",
    };
  }

  const admin = createAdminClient();
  const outcome = await scrapeEventResults(admin, eventId, resultsUrl);

  // Status/foutmelding wegschrijven (best-effort).
  await admin
    .from("events")
    .update({
      last_results_scrape_at: new Date().toISOString(),
      results_scrape_error: outcome.ok ? null : outcome.error ?? null,
    })
    .eq("id", eventId);

  if (!outcome.ok) {
    revalidatePath(`/events/${eventId}`);
    return { ok: false as const, error: outcome.error ?? "Scrapen faalde." };
  }

  // Vervang bestaande gecachte rijen (idempotent).
  await admin.from("event_results").delete().eq("event_id", eventId);

  if (outcome.results.length > 0) {
    const rows = outcome.results.map((r) => ({
      event_id: eventId,
      profile_id: r.profileId,
      scraped_name: r.scrapedName,
      position: r.position,
      time_text: r.timeText,
      time_seconds: r.timeSeconds,
      matched_via: r.matchedVia,
    }));
    const { error } = await admin.from("event_results").insert(rows);
    if (error) {
      revalidatePath(`/events/${eventId}`);
      return { ok: false as const, error: error.message };
    }
  }

  revalidatePath(`/events/${eventId}`);
  return { ok: true as const, count: outcome.results.length };
}
