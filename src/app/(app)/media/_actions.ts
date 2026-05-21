"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MEDIA_KINDS } from "@/lib/media-kinds";
import {
  listChannelVideos,
  resolveUploadsPlaylistId,
  type YouTubeVideo,
} from "@/lib/youtube";
import { fetchRssFeed } from "@/lib/rss";

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
  const publishedAtRaw = String(formData.get("published_at") ?? "").trim();

  if (!title) return { ok: false as const, error: "Titel is verplicht." };
  if (!KINDS.includes(kind as (typeof KINDS)[number])) {
    return { ok: false as const, error: "Ongeldige soort." };
  }

  // Wanneer de admin een publicatiedatum invult, gebruiken we die i.p.v.
  // de placeholder NOW(). Anders laten we de DB default doen.
  let published_at: string | undefined;
  if (publishedAtRaw) {
    const parsed = new Date(publishedAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false as const, error: "Ongeldige publicatiedatum." };
    }
    published_at = parsed.toISOString();
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
    ...(published_at ? { published_at } : {}),
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
  try {
    return await syncYouTubeChannelInner(handle);
  } catch (err) {
    console.error("[syncYouTubeChannel] uncaught error:", err);
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Onbekende fout bij YouTube-sync.",
    };
  }
}

async function syncYouTubeChannelInner(handle: string) {
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
  const insertErrors: string[] = [];

  for (const v of videos) {
    const youtube_url = `https://www.youtube.com/watch?v=${v.videoId}`;
    const body = (v.description ?? "").trim().slice(0, 600);

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
      if (error) insertErrors.push(`update ${v.videoId}: ${error.message}`);
      else updated++;
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
      if (error) insertErrors.push(`insert ${v.videoId}: ${error.message}`);
      else inserted++;
    }
  }

  revalidatePath("/media");
  revalidatePath("/dashboard");

  // Als geen enkele insert/update lukte, geef de eerste fout terug zodat
  // de admin het kan zien.
  if (videos.length > 0 && inserted === 0 && updated === 0) {
    return {
      ok: false as const,
      error:
        insertErrors[0] ??
        "Geen video's geïmporteerd. Mogelijk ontbreekt migratie 0016.",
    };
  }

  return {
    ok: true as const,
    total: videos.length,
    inserted,
    updated,
  };
}

export async function syncPodcastRss(rssUrl?: string) {
  const url = (rssUrl ?? process.env.PODCAST_RSS_URL ?? "").trim();
  if (!url) {
    return {
      ok: false as const,
      error:
        "Geen RSS-URL opgegeven. Plak de feed-URL in het veld, of zet PODCAST_RSS_URL in env.",
    };
  }
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false as const, error: "RSS-URL moet beginnen met http:// of https://" };
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
    return { ok: false as const, error: "Alleen admins kunnen syncen." };

  let feed;
  try {
    feed = await fetchRssFeed(url);
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Onbekende RSS-fout.",
    };
  }

  if (feed.episodes.length === 0) {
    return {
      ok: false as const,
      error: "Geen episodes gevonden in deze feed. Controleer of het wel een podcast-RSS is.",
    };
  }

  let inserted = 0;
  let updated = 0;

  for (const ep of feed.episodes) {
    const body = ep.description.slice(0, 1000);
    const cover = ep.imageUrl ?? feed.imageUrl;
    const webUrl = ep.webUrl ?? ep.audioUrl;

    const { data: existing } = await supabase
      .from("media_items")
      .select("id")
      .eq("source", "rss")
      .eq("external_id", ep.guid)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("media_items")
        .update({
          title: ep.title,
          body_md: body || null,
          web_url: webUrl,
          rss_url: url,
          cover_url: cover,
          published_at: ep.pubDate,
        })
        .eq("id", existing.id);
      if (!error) updated++;
    } else {
      const { error } = await supabase.from("media_items").insert({
        kind: "podcast",
        title: ep.title,
        body_md: body || null,
        web_url: webUrl,
        rss_url: url,
        cover_url: cover,
        published_at: ep.pubDate,
        source: "rss",
        external_id: ep.guid,
        author_id: user.id,
      });
      if (!error) inserted++;
    }
  }

  revalidatePath("/media");
  revalidatePath("/dashboard");

  return {
    ok: true as const,
    feedTitle: feed.title,
    total: feed.episodes.length,
    inserted,
    updated,
  };
}
