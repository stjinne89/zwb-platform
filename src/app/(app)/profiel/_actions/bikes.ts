"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function parseKm(value: FormDataEntryValue | null): number {
  const n = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function bikeStoragePath(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/bikes\/(.+?)(?:\?|$)/);
  return m ? m[1] : null;
}

export async function addManualBike(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false as const, error: "Geef je fiets een naam." };
  const brand = String(formData.get("brand_model") ?? "").trim() || null;
  const km = parseKm(formData.get("distance_km"));

  const { error } = await supabase.from("strava_bikes").insert({
    id: `manual-${crypto.randomUUID()}`,
    profile_id: user.id,
    source: "manual",
    name,
    brand_model: brand,
    distance_m: km * 1000,
    is_primary: false,
    retired: false,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profiel");
  revalidatePath(`/profielen/${user.id}`);
  return { ok: true as const };
}

export async function updateBikeDetails(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const bikeId = String(formData.get("bike_id") ?? "");
  if (!bikeId) return { ok: false as const, error: "Onbekende fiets." };
  const brand = String(formData.get("brand_model") ?? "").trim() || null;

  const { data: bike, error: fetchError } = await supabase
    .from("strava_bikes")
    .select("source")
    .eq("id", bikeId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (fetchError) return { ok: false as const, error: fetchError.message };
  if (!bike) return { ok: false as const, error: "Fiets niet gevonden." };

  if (bike.source === "manual") {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { ok: false as const, error: "Geef je fiets een naam." };
    const km = parseKm(formData.get("distance_km"));

    const { error } = await supabase
      .from("strava_bikes")
      .update({ name, brand_model: brand, distance_m: km * 1000 })
      .eq("id", bikeId)
      .eq("profile_id", user.id)
      .eq("source", "manual");
    if (error) return { ok: false as const, error: error.message };

    revalidatePath("/profiel");
    revalidatePath(`/profielen/${user.id}`);
    return { ok: true as const };
  }

  // Strava-naam en afstand blijven uit de sync komen; merk/model is leden-copy.
  const { error } = await supabase
    .from("strava_bikes")
    .update({ brand_model: brand })
    .eq("id", bikeId)
    .eq("profile_id", user.id)
    .eq("source", "strava");
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profiel");
  revalidatePath(`/profielen/${user.id}`);
  return { ok: true as const };
}

export async function deleteManualBike(bikeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: bike } = await supabase
    .from("strava_bikes")
    .select("image_url, source")
    .eq("id", bikeId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!bike || bike.source !== "manual") {
    return { ok: false as const, error: "Fiets niet gevonden." };
  }

  const { error } = await supabase
    .from("strava_bikes")
    .delete()
    .eq("id", bikeId)
    .eq("profile_id", user.id)
    .eq("source", "manual");
  if (error) return { ok: false as const, error: error.message };

  // Best-effort: bijbehorende foto uit storage halen.
  const path = bikeStoragePath(bike.image_url as string | null);
  if (path) await supabase.storage.from("bikes").remove([path]);

  revalidatePath("/profiel");
  revalidatePath(`/profielen/${user.id}`);
  return { ok: true as const };
}
