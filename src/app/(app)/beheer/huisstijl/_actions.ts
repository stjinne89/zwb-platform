"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { CLUB_TAG, getClub } from "@/lib/club";
import {
  CLUB_FONTS,
  DEFAULT_FONT,
  PALETTE_KEYS,
  normalizeHex,
  type ClubFont,
  type PaletteInput,
} from "@/lib/club-theme";

type Result = { ok: true } | { ok: false; error: string };

const BUCKET = "club-assets";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg" };

/** De ingelogde gebruiker, als die de huisstijl mag wijzigen. */
async function requireOwner(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false, error: "Niet ingelogd." };
  if (!access.has("roles.manage_permissions")) {
    return { ok: false, error: "Geen recht om de huisstijl te wijzigen." };
  }
  return { ok: true, userId: access.user.id };
}

/**
 * Werkt kolommen van club_settings bij; de naam en de rest van de rij blijven
 * staan. Een installatie zonder rij krijgt er een, met de neutrale naam.
 * Schrijven met de service role na de rechtencheck; club_settings heeft geen
 * schrijfpolicy (0313).
 */
async function writeSettings(userId: string, columns: Record<string, string | null>): Promise<Result> {
  const admin = createAdminClient();
  const changes = { ...columns, updated_at: new Date().toISOString(), updated_by: userId };
  const { data, error } = await admin.from("club_settings").update(changes).eq("id", true).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) {
    const { settings } = await getClub();
    const { error: insertError } = await admin
      .from("club_settings")
      .insert({ id: true, name: settings.name, short_name: settings.shortName, ...changes });
    if (insertError) return { ok: false, error: insertError.message };
  }
  updateTag(CLUB_TAG);
  // De huisstijl staat in de root layout van elke pagina.
  revalidatePath("/", "layout");
  return { ok: true };
}

/** De vijf kleuren (0314), of null: weer de standaard huisstijl. */
export async function updateClubColors(input: PaletteInput | null): Promise<Result> {
  const guard = await requireOwner();
  if (!guard.ok) return guard;

  const colors: Record<string, string | null> = {};
  for (const key of PALETTE_KEYS) {
    const raw = input?.[key];
    const hex = normalizeHex(raw);
    if (raw && !hex) return { ok: false, error: `Geen geldige kleur: ${raw}` };
    colors[`color_${key}`] = hex;
  }
  return writeSettings(guard.userId, colors);
}

/** De letter uit de vaste lijst (0315); de standaard slaat als leeg op. */
export async function updateClubFont(font: ClubFont): Promise<Result> {
  const guard = await requireOwner();
  if (!guard.ok) return guard;
  if (!CLUB_FONTS.some((f) => f.key === font)) return { ok: false, error: "Onbekend lettertype." };
  return writeSettings(guard.userId, { font: font === DEFAULT_FONT ? null : font });
}

/** Het pad in de bucket uit een publieke URL van die bucket. */
function storagePath(url: string | null): string | null {
  const match = url?.match(new RegExp(`/storage/v1/object/public/${BUCKET}/(.+?)(?:\\?|$)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Een nieuw logo of beeldmerk (0315). Het oude bestand wordt opgeruimd. */
export async function uploadClubImage(kind: "logo" | "mark", formData: FormData): Promise<Result> {
  const guard = await requireOwner();
  if (!guard.ok) return guard;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Geen bestand ontvangen." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Bestand is te groot (max 2 MB)." };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { ok: false, error: "Alleen PNG of JPG." };

  const admin = createAdminClient();
  // Een nieuwe naam per upload: browsers en WhatsApp bewaren iconen lang.
  const path = `${kind}-${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  const before = (await getClub()).settings[kind === "logo" ? "logoUrl" : "markUrl"];
  const result = await writeSettings(guard.userId, { [`${kind}_url`]: data.publicUrl });
  if (!result.ok) {
    await admin.storage.from(BUCKET).remove([path]);
    return result;
  }
  const old = storagePath(before);
  if (old) await admin.storage.from(BUCKET).remove([old]);
  return result;
}

/** Logo of beeldmerk weg: dan weer de vaste ZWB-bestanden. */
export async function removeClubImage(kind: "logo" | "mark"): Promise<Result> {
  const guard = await requireOwner();
  if (!guard.ok) return guard;
  const before = (await getClub()).settings[kind === "logo" ? "logoUrl" : "markUrl"];
  const result = await writeSettings(guard.userId, { [`${kind}_url`]: null });
  const old = storagePath(before);
  if (result.ok && old) await createAdminClient().storage.from(BUCKET).remove([old]);
  return result;
}
