"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchIntervalsAthlete } from "@/lib/intervals/client";

export async function connectIntervalsWithKey(apiKey: string) {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { ok: false as const, error: "Geen API-key opgegeven." };
  }
  if (trimmed.length < 16) {
    return {
      ok: false as const,
      error: "Dit ziet er niet uit als een geldige API-key (te kort).",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  // Valideer de key door athlete-info op te halen.
  let athlete;
  try {
    athlete = await fetchIntervalsAthlete(trimmed);
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Kon intervals.icu niet bereiken.",
    };
  }

  if (!athlete.id) {
    return {
      ok: false as const,
      error: "intervals.icu gaf geen athlete-id terug.",
    };
  }

  const { error } = await supabase
    .from("intervals_connections")
    .upsert(
      {
        profile_id: user.id,
        api_key: trimmed,
        athlete_id: athlete.id,
        athlete_name: athlete.name ?? null,
      },
      { onConflict: "profile_id" },
    );
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/training");
  revalidatePath("/profiel");
  return {
    ok: true as const,
    athleteName: athlete.name ?? athlete.id,
  };
}

export async function disconnectIntervals() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("intervals_connections")
    .delete()
    .eq("profile_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/training");
  revalidatePath("/profiel");
  return { ok: true as const };
}
