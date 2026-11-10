"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteAccount } from "@/lib/account-deletion";
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
    revalidatePath(`/leden/${user.id}`);
    revalidatePath(`/profielen/${user.id}`);
    return { ok: true as const, avatarUrl };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Strava-call faalde.",
    };
  }
}

/**
 * G3 — Recht op vergetelheid (AVG art. 17). Verwijdert het account van de
 * ingelogde gebruiker zelf via deleteAccount (lib/account-deletion). De
 * gebruiker moet ter bevestiging zijn e-mailadres exact intypen.
 */
export async function deleteMyAccount(confirmEmail: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const typed = (confirmEmail ?? "").trim().toLowerCase();
  if (!typed || typed !== (user.email ?? "").toLowerCase()) {
    return {
      ok: false as const,
      error: "Typ je e-mailadres exact over om te bevestigen.",
    };
  }

  const res = await deleteAccount(createAdminClient(), user.id);
  if (!res.ok) return { ok: false as const, error: res.error };

  await supabase.auth.signOut();
  return { ok: true as const };
}
