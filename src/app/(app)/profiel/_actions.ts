"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
 * ingelogde gebruiker zelf: storage-bestanden (avatar + eventfoto's) worden
 * best-effort opgeruimd en daarna wordt de auth-gebruiker verwijderd, wat via
 * de FK-cascades alle profielgekoppelde data wist. De gebruiker moet ter
 * bevestiging zijn e-mailadres exact intypen.
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

  const admin = createAdminClient();

  // Best-effort: storage-objecten opruimen (worden niet via FK gecascadeerd).
  try {
    const { data: avatarFiles } = await admin.storage
      .from("avatars")
      .list(user.id);
    if (avatarFiles?.length) {
      await admin.storage
        .from("avatars")
        .remove(avatarFiles.map((f) => `${user.id}/${f.name}`));
    }
  } catch {
    // niet kritiek
  }
  try {
    const { data: photos } = await admin
      .from("event_photos")
      .select("storage_path")
      .eq("profile_id", user.id);
    const paths = (photos ?? [])
      .map((p) => p.storage_path as string)
      .filter(Boolean);
    if (paths.length) await admin.storage.from("event-photos").remove(paths);
  } catch {
    // niet kritiek
  }

  // Auth-gebruiker verwijderen → cascade ruimt profiel + gekoppelde data op.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false as const, error: error.message };

  await supabase.auth.signOut();
  return { ok: true as const };
}
