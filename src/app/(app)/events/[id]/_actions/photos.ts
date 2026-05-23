"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteEventPhoto(
  photoId: string,
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd." };

  // Haal de foto op om de storage_path te kennen.
  const { data: photo, error: readErr } = await supabase
    .from("event_photos")
    .select("id, storage_path, profile_id, event_id")
    .eq("id", photoId)
    .single();
  if (readErr || !photo) {
    return { ok: false, error: "Foto niet gevonden." };
  }
  if (photo.event_id !== eventId) {
    return { ok: false, error: "Foto hoort niet bij dit event." };
  }

  // RLS handelt eigendom/admin-check af; we proberen de DB-delete eerst.
  const { error: dbErr } = await supabase
    .from("event_photos")
    .delete()
    .eq("id", photoId);
  if (dbErr) return { ok: false, error: dbErr.message };

  // Storage op-ruimen via admin (RLS op storage.objects voor delete is
  // beperkter dan voor de DB-row, dus we doen 't via service-role).
  try {
    const admin = createAdminClient();
    await admin.storage.from("event-photos").remove([photo.storage_path]);
  } catch {
    // niet kritiek — foto-row is al weg, file is hooguit weeshuis
  }

  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}
