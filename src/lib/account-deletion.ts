import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verwijdert een account volledig: storage-bestanden (avatar, eventfoto's,
 * verhaalfoto's) worden best-effort opgeruimd, de Strava-toestemming wordt
 * ingetrokken en daarna gaat de auth-gebruiker weg, wat via de FK-cascades alle
 * profielgekoppelde data wist. Gedeeld door "eigen account verwijderen" (G3,
 * AVG art. 17) en "lid verwijderen" door het bestuur; wie wat mag, controleert
 * de aanroeper. Verwacht de service-role client.
 */
export async function deleteAccount(
  admin: SupabaseClient,
  profileId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Best-effort: storage-objecten opruimen (worden niet via FK gecascadeerd).
  try {
    const { data: avatarFiles } = await admin.storage
      .from("avatars")
      .list(profileId);
    if (avatarFiles?.length) {
      await admin.storage
        .from("avatars")
        .remove(avatarFiles.map((f) => `${profileId}/${f.name}`));
    }
  } catch {
    // niet kritiek
  }
  try {
    const { data: photos } = await admin
      .from("event_photos")
      .select("storage_path")
      .eq("profile_id", profileId);
    const paths = (photos ?? [])
      .map((p) => p.storage_path as string)
      .filter(Boolean);
    if (paths.length) await admin.storage.from("event-photos").remove(paths);
  } catch {
    // niet kritiek
  }
  // De verhalen voor /verhaal verdwijnen mee (0288, cascade); hun foto's hier.
  try {
    const { data: photos } = await admin
      .from("club_story_photos")
      .select("path, story:club_stories!inner(profile_id)")
      .eq("story.profile_id", profileId);
    const paths = (photos ?? []).map((p) => p.path as string).filter(Boolean);
    if (paths.length) await admin.storage.from("club-story-photos").remove(paths);
  } catch {
    // niet kritiek
  }

  // Strava's toestemming intrekken vóór de cascade. Zonder dit blijft de grant bij
  // Strava bestaan terwijl wij zeggen dat alles weg is: een AVG-hiaat, én de
  // atleet blijft een plek in onze athlete cap bezetten zonder dat we er nog bij
  // kunnen. Best-effort: een falende Strava-call mag een accountverwijdering niet
  // blokkeren, en de rij verdwijnt zo meteen toch.
  try {
    const { revokeStravaConnection } = await import("@/lib/strava/sweep");
    await revokeStravaConnection(admin, profileId, "account_deleted");
  } catch {
    // niet kritiek voor de verwijdering zelf
  }

  // Auth-gebruiker verwijderen → cascade ruimt profiel + gekoppelde data op.
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
