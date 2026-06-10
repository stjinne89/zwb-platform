"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseDateKey } from "@/lib/birthdays";
import { createClient } from "@/lib/supabase/server";

function validYear(year: number) {
  return Number.isInteger(year) && year >= 2000 && year <= 2100;
}

function birthdayPath(profileId: string) {
  return `/verjaardagen/${profileId}`;
}

export async function saveBirthdayRide(
  birthdayProfileId: string,
  celebrationYear: number,
  input: {
    rideDate: string;
    rideTime: string;
    location: string;
    invitation: string;
    gpxPath: string | null;
    distanceKm: number | null;
    elevationM: number | null;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  if (user.id !== birthdayProfileId) {
    return { ok: false as const, error: "Alleen de jarige kan dit rondje beheren." };
  }
  if (!validYear(celebrationYear)) {
    return { ok: false as const, error: "Ongeldig verjaardagsjaar." };
  }

  const date = parseDateKey(input.rideDate);
  if (!date || date.year !== celebrationYear) {
    return {
      ok: false as const,
      error: `Kies een datum in ${celebrationYear}.`,
    };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.rideTime)) {
    return { ok: false as const, error: "Vul een geldige tijd in." };
  }

  const location = input.location.trim();
  const invitation = input.invitation.trim();
  if (!location || location.length > 160) {
    return {
      ok: false as const,
      error: "Vul een locatie van maximaal 160 tekens in.",
    };
  }
  if (!invitation || invitation.length > 1000) {
    return {
      ok: false as const,
      error: "Schrijf een uitnodiging van maximaal 1000 tekens.",
    };
  }

  const gpxPath = input.gpxPath?.trim() || null;
  const expectedPrefix = `${birthdayProfileId}/${celebrationYear}/`;
  if (
    gpxPath &&
    (!gpxPath.startsWith(expectedPrefix) ||
      !gpxPath.toLowerCase().endsWith(".gpx"))
  ) {
    return { ok: false as const, error: "Ongeldige GPX-route." };
  }

  const distanceKm =
    input.distanceKm !== null &&
    Number.isFinite(input.distanceKm) &&
    input.distanceKm >= 0
      ? Math.round(input.distanceKm * 100) / 100
      : null;
  const elevationM =
    input.elevationM !== null &&
    Number.isFinite(input.elevationM) &&
    input.elevationM >= 0
      ? Math.round(input.elevationM)
      : null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", birthdayProfileId)
    .eq("is_approved", true)
    .maybeSingle();
  if (!profile) {
    return { ok: false as const, error: "Profiel niet gevonden." };
  }

  const { data: existing } = await supabase
    .from("birthday_rides")
    .select("gpx_path")
    .eq("birthday_profile_id", birthdayProfileId)
    .eq("celebration_year", celebrationYear)
    .maybeSingle();

  const { error } = await supabase.from("birthday_rides").upsert(
    {
      birthday_profile_id: birthdayProfileId,
      celebration_year: celebrationYear,
      ride_date: input.rideDate,
      ride_time: input.rideTime,
      location,
      invitation,
      gpx_path: gpxPath,
      distance_km: gpxPath ? distanceKm : null,
      elevation_m: gpxPath ? elevationM : null,
    },
    { onConflict: "birthday_profile_id,celebration_year" },
  );
  if (error) return { ok: false as const, error: error.message };

  if (existing?.gpx_path && existing.gpx_path !== gpxPath) {
    await supabase.storage.from("birthday-gpx").remove([existing.gpx_path]);
  }

  revalidatePath(birthdayPath(birthdayProfileId));
  return { ok: true as const };
}

export async function deleteBirthdayRide(
  birthdayProfileId: string,
  celebrationYear: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  if (user.id !== birthdayProfileId) {
    return { ok: false as const, error: "Alleen de jarige kan dit rondje beheren." };
  }
  if (!validYear(celebrationYear)) {
    return { ok: false as const, error: "Ongeldig verjaardagsjaar." };
  }

  const { data: existing } = await supabase
    .from("birthday_rides")
    .select("gpx_path")
    .eq("birthday_profile_id", birthdayProfileId)
    .eq("celebration_year", celebrationYear)
    .maybeSingle();

  const { error } = await supabase
    .from("birthday_rides")
    .delete()
    .eq("birthday_profile_id", birthdayProfileId)
    .eq("celebration_year", celebrationYear);
  if (error) return { ok: false as const, error: error.message };

  if (existing?.gpx_path) {
    await supabase.storage.from("birthday-gpx").remove([existing.gpx_path]);
  }

  revalidatePath(birthdayPath(birthdayProfileId));
  return { ok: true as const };
}

export async function setBirthdayRideRsvp(
  birthdayProfileId: string,
  celebrationYear: number,
  status: "yes" | "maybe" | "no",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  if (!validYear(celebrationYear)) {
    return { ok: false as const, error: "Ongeldig verjaardagsjaar." };
  }
  if (status !== "yes" && status !== "maybe" && status !== "no") {
    return { ok: false as const, error: "Ongeldige keuze." };
  }

  // Verjaardag moet gedeeld zijn en er moet een rondje zijn om je op aan te
  // melden (de FK dwingt dit ook af, maar zo geven we een nette melding).
  const { data: birthdayMember } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", birthdayProfileId)
    .eq("is_approved", true)
    .eq("share_birthday", true)
    .maybeSingle();
  if (!birthdayMember) {
    return { ok: false as const, error: "Deze verjaardag wordt niet gedeeld." };
  }

  const { data: ride } = await supabase
    .from("birthday_rides")
    .select("birthday_profile_id")
    .eq("birthday_profile_id", birthdayProfileId)
    .eq("celebration_year", celebrationYear)
    .maybeSingle();
  if (!ride) {
    return { ok: false as const, error: "Er is nog geen verjaardagsrondje gepland." };
  }

  const { error } = await supabase.from("birthday_ride_rsvps").upsert(
    {
      birthday_profile_id: birthdayProfileId,
      celebration_year: celebrationYear,
      profile_id: user.id,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "birthday_profile_id,celebration_year,profile_id" },
  );
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(birthdayPath(birthdayProfileId));
  return { ok: true as const };
}

export async function addBirthdayMessage(
  birthdayProfileId: string,
  celebrationYear: number,
  body: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  if (!validYear(celebrationYear)) {
    return { ok: false as const, error: "Ongeldig verjaardagsjaar." };
  }

  const message = body.trim();
  if (!message || message.length > 500) {
    return {
      ok: false as const,
      error: "Schrijf een felicitatie van maximaal 500 tekens.",
    };
  }

  const { data: birthdayMember } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", birthdayProfileId)
    .eq("is_approved", true)
    .eq("share_birthday", true)
    .maybeSingle();
  if (!birthdayMember) {
    return { ok: false as const, error: "Deze verjaardag wordt niet gedeeld." };
  }

  const { error } = await supabase.from("birthday_messages").insert({
    birthday_profile_id: birthdayProfileId,
    author_profile_id: user.id,
    celebration_year: celebrationYear,
    body: message,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(birthdayPath(birthdayProfileId));
  return { ok: true as const };
}

export async function deleteBirthdayMessage(
  messageId: string,
  birthdayProfileId: string,
  celebrationYear: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  if (!validYear(celebrationYear)) {
    return { ok: false as const, error: "Ongeldig verjaardagsjaar." };
  }

  const { error } = await supabase
    .from("birthday_messages")
    .delete()
    .eq("id", messageId)
    .eq("birthday_profile_id", birthdayProfileId)
    .eq("celebration_year", celebrationYear);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(birthdayPath(birthdayProfileId));
  return { ok: true as const };
}

export async function deleteBirthdayPhoto(
  photoId: string,
  birthdayProfileId: string,
  celebrationYear: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };
  if (!validYear(celebrationYear)) {
    return { ok: false as const, error: "Ongeldig verjaardagsjaar." };
  }

  const { data: photo } = await supabase
    .from("birthday_photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .eq("birthday_profile_id", birthdayProfileId)
    .eq("celebration_year", celebrationYear)
    .maybeSingle();
  if (!photo) return { ok: false as const, error: "Foto niet gevonden." };

  const { error } = await supabase
    .from("birthday_photos")
    .delete()
    .eq("id", photoId);
  if (error) return { ok: false as const, error: error.message };

  try {
    await createAdminClient()
      .storage.from("birthday-photos")
      .remove([photo.storage_path]);
  } catch {
    // De database-row is leidend; een achtergebleven bestand kan later worden opgeruimd.
  }

  revalidatePath(birthdayPath(birthdayProfileId));
  return { ok: true as const };
}
