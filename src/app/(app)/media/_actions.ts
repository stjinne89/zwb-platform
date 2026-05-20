"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MEDIA_KINDS } from "@/lib/media-kinds";

const KINDS = MEDIA_KINDS.map((k) => k.value);

function optionalUrl(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

export async function addMediaItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const body_md = String(formData.get("body_md") ?? "").trim() || null;
  const pinned = formData.get("pinned") === "on";

  if (!title) return { ok: false as const, error: "Titel is verplicht." };
  if (!KINDS.includes(kind as (typeof KINDS)[number])) {
    return { ok: false as const, error: "Ongeldige soort." };
  }

  const { error } = await supabase.from("media_items").insert({
    kind,
    title,
    body_md,
    apple_url: optionalUrl(formData.get("apple_url")),
    spotify_url: optionalUrl(formData.get("spotify_url")),
    rss_url: optionalUrl(formData.get("rss_url")),
    youtube_url: optionalUrl(formData.get("youtube_url")),
    web_url: optionalUrl(formData.get("web_url")),
    cover_url: optionalUrl(formData.get("cover_url")),
    pinned,
    author_id: user.id,
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/media");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function togglePinMedia(id: string, pinned: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("media_items")
    .update({ pinned })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/media");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function deleteMediaItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("media_items").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/media");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
