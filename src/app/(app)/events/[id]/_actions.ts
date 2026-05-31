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

  // Vervang alléén de gescrapte rijen (idempotent). Handmatig toegevoegde
  // rijen (is_manual=true) blijven staan.
  await admin
    .from("event_results")
    .delete()
    .eq("event_id", eventId)
    .eq("is_manual", false);

  if (outcome.results.length > 0) {
    const rows = outcome.results.map((r) => ({
      event_id: eventId,
      profile_id: r.profileId,
      scraped_name: r.scrapedName,
      position: r.position,
      time_text: r.timeText,
      time_seconds: r.timeSeconds,
      category: r.category,
      category_rank: r.categoryRank,
      matched_via: r.matchedVia,
      is_manual: false,
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

// "6:27:03" / "6.27.03" / "42:18" → seconden (voor sortering). Null als onleesbaar.
function parseClockToSeconds(text: string): number | null {
  const m = text.match(/(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = m[3] != null ? Number(m[3]) : null;
  if (c != null) {
    if (b < 60 && c < 60) return a * 3600 + b * 60 + c;
    return null;
  }
  if (b < 60) return a * 60 + b;
  return null;
}

async function guardEventManage(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: event } = await supabase
    .from("events")
    .select("id, created_by")
    .eq("id", eventId)
    .single();
  if (!event) return { ok: false as const, error: "Event niet gevonden." };

  const access = await getCurrentUserAccess(supabase);
  const canManage =
    access.has("events.manage_all") || event.created_by === user.id;
  if (!canManage) {
    return { ok: false as const, error: "Geen recht om uitslagen te bewerken." };
  }
  return { ok: true as const };
}

export async function addManualEventResult(
  eventId: string,
  input: { name: string; position?: string; timeText?: string },
) {
  const guard = await guardEventManage(eventId);
  if (!guard.ok) return guard;

  const name = (input.name ?? "").trim();
  if (!name) return { ok: false as const, error: "Naam is verplicht." };

  let position: number | null = null;
  const posRaw = (input.position ?? "").trim();
  if (posRaw) {
    const n = Number(posRaw.replace(/[^\d]/g, ""));
    if (Number.isFinite(n) && n >= 1 && n <= 99999) position = n;
  }

  const timeText = (input.timeText ?? "").trim() || null;
  const timeSeconds = timeText ? parseClockToSeconds(timeText) : null;

  const admin = createAdminClient();
  const { error } = await admin.from("event_results").insert({
    event_id: eventId,
    profile_id: null,
    scraped_name: name.slice(0, 200),
    position,
    time_text: timeText,
    time_seconds: timeSeconds,
    matched_via: "manual",
    is_manual: true,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/events/${eventId}`);
  return { ok: true as const };
}

export async function removeEventResult(resultId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: row } = await supabase
    .from("event_results")
    .select("id, event_id")
    .eq("id", resultId)
    .single();
  if (!row) return { ok: false as const, error: "Uitslag-rij niet gevonden." };

  const guard = await guardEventManage(row.event_id);
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  const { error } = await admin
    .from("event_results")
    .delete()
    .eq("id", resultId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/events/${row.event_id}`);
  return { ok: true as const };
}
