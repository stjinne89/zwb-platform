"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";

type EventInput = {
  title: string;
  type: string;
  start_at: string; // ISO
  end_at?: string | null;
  location?: string | null;
  // undefined = niet wijzigen (alleen voor update); null = expliciet leegmaken
  gpx_path?: string | null;
  distance_km?: number | null;
  elevation_m?: number | null;
  start_lat?: number | null;
  start_lon?: number | null;
  description?: string | null;
  external_url?: string | null;
};

const TYPES = ["outdoor", "zrl", "ladder", "flamme_rouge", "social", "training"];

function validate(input: EventInput) {
  if (!input.title.trim()) return "Titel is verplicht.";
  if (!TYPES.includes(input.type)) return "Ongeldig type.";
  if (!input.start_at) return "Startdatum is verplicht.";
  if (input.external_url && !/^https?:\/\//i.test(input.external_url)) {
    return "Externe link moet beginnen met https:// of http://";
  }
  return null;
}

export async function createEvent(input: EventInput) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("events.create")) {
    return { ok: false as const, error: "Geen recht om events aan te maken." };
  }

  const err = validate(input);
  if (err) return { ok: false as const, error: err };

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: input.title.trim(),
      type: input.type,
      start_at: input.start_at,
      end_at: input.end_at || null,
      location: input.location || null,
      gpx_path: input.gpx_path ?? null,
      distance_km: input.distance_km ?? null,
      elevation_m: input.elevation_m ?? null,
      start_lat: input.start_lat ?? null,
      start_lon: input.start_lon ?? null,
      description: input.description || null,
      external_url: input.external_url?.trim() || null,
      created_by: access.user.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  // Best-effort push-notificatie naar opt-in leden. Faalt stil als de
  // VAPID-keys nog niet zijn ingesteld op de server.
  try {
    const { sendNotificationToMembers } = await import("@/lib/push/send");
    const startLabel = new Date(input.start_at).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    await sendNotificationToMembers(
      "on_new_event",
      {
        title: "Nieuw event op de kalender",
        body: `${input.title.trim()} — ${startLabel}`,
        url: `/events/${data.id}`,
        tag: `event-${data.id}`,
      },
      { excludeProfileId: access.user.id },
    );
  } catch {
    // nooit blokkerend voor event-aanmaak
  }

  redirect(`/events/${data.id}`);
}

export async function updateEvent(id: string, input: EventInput) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };

  const err = validate(input);
  if (err) return { ok: false as const, error: err };

  // Permissie-check: alleen creator of iemand met beheerrecht mag bewerken.
  const { data: event } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", id)
    .single();
  if (!event) return { ok: false as const, error: "Event bestaat niet." };
  const isCreator = event.created_by === access.user.id;
  if (!isCreator && !access.has("events.manage_all")) {
    return { ok: false as const, error: "Geen toegang om dit event te bewerken." };
  }

  // Bouw update-payload op: undefined = veld niet wijzigen.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {
    title: input.title.trim(),
    type: input.type,
    start_at: input.start_at,
    end_at: input.end_at || null,
    location: input.location || null,
    description: input.description || null,
    external_url: input.external_url?.trim() || null,
  };
  // GPX-velden alleen overschrijven als ze expliciet zijn meegegeven
  // (undefined = behoud bestaande waarde). De form geeft null door om te
  // verwijderen, of de nieuwe waardes bij een upload.
  if (input.gpx_path !== undefined) update.gpx_path = input.gpx_path;
  if (input.distance_km !== undefined) update.distance_km = input.distance_km;
  if (input.elevation_m !== undefined) update.elevation_m = input.elevation_m;
  if (input.start_lat !== undefined) update.start_lat = input.start_lat;
  if (input.start_lon !== undefined) update.start_lon = input.start_lon;

  const { error } = await supabase.from("events").update(update).eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/events/${id}`);
  revalidatePath("/kalender");
  revalidatePath("/dashboard");
  redirect(`/events/${id}`);
}
