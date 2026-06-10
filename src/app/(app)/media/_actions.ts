"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { MEDIA_KINDS } from "@/lib/media-kinds";
import {
  listChannelVideos,
  resolveUploadsPlaylistId,
  type YouTubeVideo,
} from "@/lib/youtube";
import { fetchRssFeed } from "@/lib/rss";
import {
  fetchInstagramMedia,
  instagramCoverUrl,
  resolveInstagramUserId,
  ZWB_INSTAGRAM_URL,
} from "@/lib/instagram";

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
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("media.manage")) {
    return { ok: false as const, error: "Geen recht om media te beheren." };
  }

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
    author_id: access.user.id,
    ...(published_at ? { published_at } : {}),
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/media");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function updateMediaItem(id: string, formData: FormData) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("media.manage")) {
    return { ok: false as const, error: "Geen recht om media te beheren." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const body_md = String(formData.get("body_md") ?? "").trim() || null;
  const pinned = formData.get("pinned") === "on";
  const publishedAtRaw = String(formData.get("published_at") ?? "").trim();

  if (!title) return { ok: false as const, error: "Titel is verplicht." };
  if (!KINDS.includes(kind as (typeof KINDS)[number])) {
    return { ok: false as const, error: "Ongeldige soort." };
  }

  let published_at: string | undefined;
  if (publishedAtRaw) {
    const parsed = new Date(publishedAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false as const, error: "Ongeldige publicatiedatum." };
    }
    published_at = parsed.toISOString();
  }

  const { error } = await supabase
    .from("media_items")
    .update({
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
      ...(published_at ? { published_at } : {}),
    })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/media");
  revalidatePath("/dashboard");
  revalidatePath(`/media/${id}/bewerk`);
  return { ok: true as const };
}

export async function togglePinMedia(id: string, pinned: boolean) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("media.manage")) {
    return { ok: false as const, error: "Geen recht om media te beheren." };
  }

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
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("media.manage")) {
    return { ok: false as const, error: "Geen recht om media te beheren." };
  }

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
      error: "YouTube kon niet worden opgehaald.",
    };
  }
}

async function syncYouTubeChannelInner(handle: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return {
      ok: false as const,
      error:
        "YouTube ophalen is niet beschikbaar.",
    };
  }

  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("media.manage")) {
    return { ok: false as const, error: "Geen recht om media te syncen." };
  }

  let videos: YouTubeVideo[];
  try {
    const uploads = await resolveUploadsPlaylistId(apiKey, handle);
    videos = await listChannelVideos(apiKey, uploads);
  } catch {
    return {
      ok: false as const,
      error: "YouTube kon niet worden opgehaald.",
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
        author_id: access.user.id,
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
      error: "Geen video's geimporteerd.",
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
      error: "Geen podcastfeed opgegeven.",
    };
  }
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false as const, error: "Podcastfeed moet een geldige web-link zijn." };
  }

  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("media.manage")) {
    return { ok: false as const, error: "Geen recht om media te syncen." };
  }

  let feed;
  try {
    feed = await fetchRssFeed(url);
  } catch {
    return {
      ok: false as const,
      error: "Podcastfeed kon niet worden geladen.",
    };
  }

  if (feed.episodes.length === 0) {
    return {
      ok: false as const,
      error: "Geen afleveringen gevonden.",
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
        author_id: access.user.id,
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

export async function syncInstagramFeed() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  let userId = process.env.INSTAGRAM_USER_ID?.trim();
  if (!accessToken) {
    return {
      ok: false as const,
      error: "Instagram ophalen is niet beschikbaar.",
    };
  }

  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("media.manage")) {
    return { ok: false as const, error: "Geen recht om media te syncen." };
  }

  let posts;
  try {
    userId = userId || (await resolveInstagramUserId(accessToken));
    posts = await fetchInstagramMedia({ accessToken, userId, limit: 12 });
  } catch {
    return {
      ok: false as const,
      error: "Instagram kon niet worden opgehaald.",
    };
  }

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const post of posts) {
    const caption = (post.caption ?? "").trim();
    const firstLine = caption.split(/\r?\n/).find(Boolean)?.trim();
    const title = firstLine ? firstLine.slice(0, 120) : "Instagram-post van ZWB Cycling";
    const publishedAt = post.timestamp ? new Date(post.timestamp).toISOString() : new Date().toISOString();
    const permalink = post.permalink ?? ZWB_INSTAGRAM_URL;
    const cover = instagramCoverUrl(post);

    const { data: existing } = await supabase
      .from("media_items")
      .select("id")
      .eq("source", "instagram")
      .eq("external_id", post.id)
      .maybeSingle();

    const values = {
      kind: "instagram",
      title,
      body_md: caption.slice(0, 1200) || null,
      web_url: permalink,
      cover_url: cover,
      published_at: publishedAt,
      source: "instagram",
      external_id: post.id,
    };

    if (existing) {
      const { error } = await supabase.from("media_items").update(values).eq("id", existing.id);
      if (error) errors.push(`update ${post.id}: ${error.message}`);
      else updated++;
    } else {
      const { error } = await supabase.from("media_items").insert({
        ...values,
        author_id: access.user.id,
      });
      if (error) errors.push(`insert ${post.id}: ${error.message}`);
      else inserted++;
    }
  }

  revalidatePath("/media");
  revalidatePath("/dashboard");

  if (posts.length > 0 && inserted === 0 && updated === 0) {
    return {
      ok: false as const,
      error: "Geen Instagram-berichten geimporteerd.",
    };
  }

  return {
    ok: true as const,
    total: posts.length,
    inserted,
    updated,
  };
}
