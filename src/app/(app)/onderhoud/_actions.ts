"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isWearRange, resolveThresholdKm } from "@/lib/maintenance/component-types";

function parseKm(value: FormDataEntryValue | null): number | null {
  const n = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function bikeDistanceM(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  bikeId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("strava_bikes")
    .select("distance_m")
    .eq("profile_id", profileId)
    .eq("id", bikeId)
    .maybeSingle();
  if (!data) return null;
  return Number(data.distance_m) || 0;
}

export async function addComponent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const bikeId = String(formData.get("bike_id") ?? "");
  const componentType = String(formData.get("component_type") ?? "");
  const range = String(formData.get("wear_range") ?? "normal");
  if (!bikeId || !componentType) {
    return { ok: false as const, error: "Kies een fiets en onderdeel." };
  }
  if (!isWearRange(range)) {
    return { ok: false as const, error: "Ongeldige slijtage-range." };
  }

  const customKm = parseKm(formData.get("custom_km"));
  const presetKm = resolveThresholdKm(componentType, range);
  const thresholdKm = customKm ?? presetKm;
  if (!thresholdKm) {
    return { ok: false as const, error: "Geen drempel bekend; vul eigen km in." };
  }

  const distance = await bikeDistanceM(supabase, user.id, bikeId);
  if (distance == null) {
    return { ok: false as const, error: "Fiets niet gevonden." };
  }

  const alreadyRiddenKm = parseKm(formData.get("already_ridden_km")) ?? 0;
  const baseline = Math.max(0, distance - alreadyRiddenKm * 1000);
  const name = String(formData.get("name") ?? "").trim() || null;
  const installedAt = String(formData.get("installed_at") ?? "").trim() || null;

  const { error } = await supabase.from("bike_components").insert({
    profile_id: user.id,
    bike_id: bikeId,
    component_type: componentType,
    name,
    wear_range: range,
    threshold_km: Math.round(thresholdKm),
    custom_threshold: customKm != null,
    baseline_distance_m: baseline,
    installed_at: installedAt,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/onderhoud");
  return { ok: true as const };
}

export async function replaceComponent(componentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: comp } = await supabase
    .from("bike_components")
    .select("bike_id")
    .eq("id", componentId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!comp) return { ok: false as const, error: "Onderdeel niet gevonden." };

  const distance = await bikeDistanceM(supabase, user.id, comp.bike_id);
  const { error } = await supabase
    .from("bike_components")
    .update({
      baseline_distance_m: distance ?? 0,
      installed_at: new Date().toISOString().slice(0, 10),
      status: "active",
      replaced_at: null,
      notified_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", componentId)
    .eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/onderhoud");
  return { ok: true as const };
}

export async function deleteComponent(componentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("bike_components")
    .delete()
    .eq("id", componentId)
    .eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/onderhoud");
  return { ok: true as const };
}
