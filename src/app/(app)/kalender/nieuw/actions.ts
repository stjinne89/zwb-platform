"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type EventInput = {
  title: string;
  type: string;
  start_at: string; // ISO
  end_at?: string | null;
  location?: string | null;
  gpx_path?: string | null;
  distance_km?: number | null;
  elevation_m?: number | null;
  start_lat?: number | null;
  start_lon?: number | null;
  description?: string | null;
  external_url?: string | null;
};

const TYPES = ["outdoor", "zrl", "ladder", "flamme_rouge", "social", "training"];

export async function createEvent(input: EventInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  if (!input.title.trim()) return { ok: false as const, error: "Titel is verplicht." };
  if (!TYPES.includes(input.type)) return { ok: false as const, error: "Ongeldig type." };
  if (!input.start_at) return { ok: false as const, error: "Startdatum is verplicht." };
  if (input.external_url && !/^https?:\/\//i.test(input.external_url)) {
    return {
      ok: false as const,
      error: "Externe link moet beginnen met https:// of http://",
    };
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: input.title.trim(),
      type: input.type,
      start_at: input.start_at,
      end_at: input.end_at || null,
      location: input.location || null,
      gpx_path: input.gpx_path || null,
      distance_km: input.distance_km ?? null,
      elevation_m: input.elevation_m ?? null,
      start_lat: input.start_lat ?? null,
      start_lon: input.start_lon ?? null,
      description: input.description || null,
      external_url: input.external_url?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  redirect(`/events/${data.id}`);
}
