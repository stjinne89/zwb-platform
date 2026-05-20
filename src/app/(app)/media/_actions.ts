"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MEDIA_KINDS } from "@/lib/media-kinds";
import {
  listChannelVideos,
  resolveUploadsPlaylistId,
  type YouTubeVideo,
} from "@/lib/youtube";

const KINDS = MEDIA_KINDS.map((k) => k.value);

const ZWB_YOUTUBE_HANDLE = "zwbcycling";

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

export async function syncYouTubeChannel(handle: string = ZWB_YOUTUBE_HANDLE) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return {
      ok: false as const,
      error:
        "YOUTUBE_API_KEY ontbreekt in de server-env. Maak gratis een key aan op console.cloud.google.com en zet 'm in .env.local (lokaal) of Netlify env (productie).",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin)
    return { ok: false as const, error: "Alleen admins kunnen YouTube syncen." };

  let videos: YouTubeVideo[];
  try {
    const uploads = await resolveUploadsPlaylistId(apiKey, handle);
    videos = await listChannelVideos(apiKey, uploads);
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Onbekende YouTube-fout.",
    };
  }

  let inserted = 0;
  let updated = 0;

  for (const v of videos) {
    const youtube_url = `https://www.youtube.com/watch?v=${v.videoId}`;
    // Body: korte beschrijving (max 600 tekens om de UI niet vol te zetten).
    const body = v.description.trim().slice(0, 600);

    // Idempotent upsert op (source, external_id).
    const { data: existing } = await supabase
      .from("media_items")
      .select("id")
      .eq("source", "youtube")
      .eq("external_id", v.videoId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("media_items")
        .update({
          title: v.title,
          body_md: body || null,
          youtube_url,
          cover_url: v.thumbnailUrl,
          published_at: v.publishedAt,
        })
        .eq("id", existing.id);
      if (!error) updated++;
    } else {
      const { error } = await supabase.from("media_items").insert({
        kind: "video",
        title: v.title,
        body_md: body || null,
        youtube_url,
        cover_url: v.thumbnailUrl,
        published_at: v.publishedAt,
        source: "youtube",
        external_id: v.videoId,
        author_id: user.id,
      });
      if (!error) inserted++;
    }
  }

  revalidatePath("/media");
  revalidatePath("/dashboard");

  return {
    ok: true as const,
    total: videos.length,
    inserted,
    updated,
  };
}
