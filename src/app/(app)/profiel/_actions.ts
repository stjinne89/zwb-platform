"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  accessTokenFor,
  refreshStravaAthleteInfo,
  type StravaConnection,
} from "@/lib/strava/client";

/**
 * Haal alleen athlete-info (foto + username) op uit Strava en update
 * profiles.avatar_url. Sneller dan een volledige sync — handig voor de
 * "Vernieuw foto"-knop op /profiel.
 */
export async function refreshMyStravaProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: connection, error } = await supabase
    .from("strava_connections")
    .select(
      "profile_id, strava_athlete_id, access_token, refresh_token, expires_at",
    )
    .eq("profile_id", user.id)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!connection) {
    return { ok: false as const, error: "Geen Strava-koppeling gevonden." };
  }

  try {
    const at = await accessTokenFor(supabase, connection as StravaConnection);
    const { avatarUrl } = await refreshStravaAthleteInfo(supabase, user.id, at);
    revalidatePath("/profiel");
    revalidatePath("/leden");
    return { ok: true as const, avatarUrl };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Strava-call faalde.",
    };
  }
}
