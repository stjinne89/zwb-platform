"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isDiscipline,
  isWearRange,
  resolveThreshold,
  type Discipline,
} from "@/lib/maintenance/component-types";

const GARAGE_PATH = "/mijn-garage";

function parseNumber(value: FormDataEntryValue | null): number | null {
  const n = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

type BikeRef = { distanceM: number; discipline: Discipline };

/**
 * Handmatige fietsen krijgen geen afstand uit Strava, dus daar telt de eigen
 * teller. Voor Strava-fietsen is manual_distance_m altijd 0.
 */
async function loadBike(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  bikeId: string,
): Promise<BikeRef | null> {
  const { data } = await supabase
    .from("strava_bikes")
    .select("distance_m, manual_distance_m, source, discipline")
    .eq("profile_id", profileId)
    .eq("id", bikeId)
    .maybeSingle();
  if (!data) return null;
  const distanceM =
    data.source === "manual"
      ? Number(data.manual_distance_m) || 0
      : Number(data.distance_m) || 0;
  return {
    distanceM,
    discipline: isDiscipline(data.discipline) ? data.discipline : "race",
  };
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

  const bike = await loadBike(supabase, user.id, bikeId);
  if (!bike) return { ok: false as const, error: "Fiets niet gevonden." };

  const preset = resolveThreshold(componentType, bike.discipline, range);
  if (!preset) {
    return {
      ok: false as const,
      error: "Dit onderdeel hoort niet bij dit fietstype.",
    };
  }

  const custom = parseNumber(formData.get("custom_value"));
  const threshold = custom ?? preset.value;
  const metric = preset.metric;

  // Bij kilometers verrekenen we wat er al op zit; bij maanden doet de
  // montagedatum dat werk.
  const installedAt = String(formData.get("installed_at") ?? "").trim() || null;
  const alreadyRiddenKm = parseNumber(formData.get("already_ridden_km")) ?? 0;
  const baseline =
    metric === "km" ? Math.max(0, bike.distanceM - alreadyRiddenKm * 1000) : 0;

  if (metric === "months" && !installedAt) {
    return {
      ok: false as const,
      error: "Vul een montagedatum in — dit onderdeel rekent in maanden.",
    };
  }

  const { error } = await supabase.from("bike_components").insert({
    profile_id: user.id,
    bike_id: bikeId,
    component_type: componentType,
    name: String(formData.get("name") ?? "").trim() || null,
    wear_range: range,
    wear_metric: metric,
    threshold_value: Math.round(threshold),
    // Blijft gevuld zodat oude queries en rapportages niet omvallen.
    threshold_km: Math.round(metric === "km" ? threshold : 0) || 1,
    custom_threshold: custom != null,
    baseline_distance_m: baseline,
    installed_at: installedAt,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(GARAGE_PATH);
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
    .select("bike_id, component_type, wear_metric")
    .eq("id", componentId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!comp) return { ok: false as const, error: "Onderdeel niet gevonden." };

  const bike = await loadBike(supabase, user.id, comp.bike_id);
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("bike_components")
    .update({
      // Beide nulpunten opnieuw zetten: welke telt hangt af van de maat.
      baseline_distance_m: bike?.distanceM ?? 0,
      installed_at: today,
      status: "active",
      replaced_at: null,
      notified_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", componentId)
    .eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(GARAGE_PATH);
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

  revalidatePath(GARAGE_PATH);
  return { ok: true as const };
}

/** Fietstype corrigeren; de sync gokt het maar zit er geregeld naast. */
export async function setBikeDiscipline(bikeId: string, discipline: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  if (!isDiscipline(discipline)) {
    return { ok: false as const, error: "Onbekend fietstype." };
  }

  const { error } = await supabase
    .from("strava_bikes")
    .update({ discipline })
    .eq("id", bikeId)
    .eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(GARAGE_PATH);
  revalidatePath("/profiel");
  return { ok: true as const };
}

/** Kilometerstand van een handmatige fiets; Strava-fietsen tellen zelf. */
export async function setManualDistance(bikeId: string, km: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  if (!Number.isFinite(km) || km < 0) {
    return { ok: false as const, error: "Vul een geldige kilometerstand in." };
  }

  const { data: bike } = await supabase
    .from("strava_bikes")
    .select("source")
    .eq("id", bikeId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!bike) return { ok: false as const, error: "Fiets niet gevonden." };
  if (bike.source !== "manual") {
    return {
      ok: false as const,
      error: "Deze fiets haalt zijn kilometers uit Strava.",
    };
  }

  const { error } = await supabase
    .from("strava_bikes")
    .update({ manual_distance_m: Math.round(km * 1000) })
    .eq("id", bikeId)
    .eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(GARAGE_PATH);
  return { ok: true as const };
}
