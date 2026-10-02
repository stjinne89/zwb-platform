import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchInstagramMedia,
  fetchInstagramStories,
  instagramCoverUrl,
  resolveInstagramUserId,
  ZWB_INSTAGRAM_URL,
  type InstagramMedia,
} from "@/lib/instagram";

// Posts en stories van @zwb_cycling naar media_items. Posts blijven staan
// (source 'instagram'); stories (source 'instagram_story') bestaan alleen zolang
// Instagram ze teruggeeft en worden daarna weer verwijderd.

export const INSTAGRAM_STORY_SOURCE = "instagram_story";
export const INSTAGRAM_STORY_TTL_MS = 24 * 3600_000;

export type InstagramSyncResult =
  | { ok: false; error: string }
  | {
      ok: true;
      total: number;
      inserted: number;
      updated: number;
      stories: number;
      storiesRemoved: number;
      /** Posts zijn wel opgehaald, stories niet: de reden van Meta. */
      storyError: string | null;
      errors: string[];
    };

function reasonOf(err: unknown) {
  return err instanceof Error ? err.message.slice(0, 200) : "";
}

export async function syncInstagramToMedia(
  supabase: SupabaseClient,
  { authorId }: { authorId?: string } = {},
): Promise<InstagramSyncResult> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  let userId = process.env.INSTAGRAM_USER_ID?.trim();
  if (!accessToken) return { ok: false, error: "Instagram ophalen is niet beschikbaar." };

  let posts: InstagramMedia[];
  try {
    userId = userId || (await resolveInstagramUserId(accessToken));
    posts = await fetchInstagramMedia({ accessToken, userId, limit: 12 });
  } catch (err) {
    // De melding van Meta zegt wat er mis is (verlopen token, verkeerd account).
    console.error("[syncInstagramToMedia]", err);
    const reason = reasonOf(err);
    return {
      ok: false,
      error: reason
        ? `Instagram kon niet worden opgehaald: ${reason}`
        : "Instagram kon niet worden opgehaald.",
    };
  }

  let stories: InstagramMedia[] | null = null;
  let storyError: string | null = null;
  try {
    stories = await fetchInstagramStories({ accessToken, userId });
  } catch (err) {
    console.error("[syncInstagramToMedia] stories", err);
    storyError = reasonOf(err) || "onbekende fout";
  }

  // media_items.author_id is verplicht. De cron heeft geen ingelogd lid en neemt
  // de maker van het laatste Instagram-item over.
  let author = authorId ?? null;
  if (!author) {
    const { data } = await supabase
      .from("media_items")
      .select("author_id")
      .eq("kind", "instagram")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    author = (data?.author_id as string | undefined) ?? null;
  }
  if (!author) {
    return { ok: false, error: "Haal Instagram eerst één keer op via /media." };
  }

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  async function upsert(source: string, item: InstagramMedia, title: string, body: string | null) {
    const values = {
      kind: "instagram",
      title,
      body_md: body,
      web_url: item.permalink ?? ZWB_INSTAGRAM_URL,
      cover_url: instagramCoverUrl(item),
      published_at: item.timestamp
        ? new Date(item.timestamp).toISOString()
        : new Date().toISOString(),
      source,
      external_id: item.id,
    };
    const { data: existing } = await supabase
      .from("media_items")
      .select("id")
      .eq("source", source)
      .eq("external_id", item.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("media_items").update(values).eq("id", existing.id);
      if (error) errors.push(`update ${item.id}: ${error.message}`);
      else updated++;
    } else {
      const { error } = await supabase
        .from("media_items")
        .insert({ ...values, author_id: author });
      if (error) errors.push(`insert ${item.id}: ${error.message}`);
      else inserted++;
    }
  }

  for (const post of posts) {
    const caption = (post.caption ?? "").trim();
    const firstLine = caption.split(/\r?\n/).find(Boolean)?.trim();
    await upsert(
      "instagram",
      post,
      firstLine ? firstLine.slice(0, 120) : "Instagram-post van ZWB Cycling",
      caption.slice(0, 1200) || null,
    );
  }
  for (const story of stories ?? []) {
    await upsert(INSTAGRAM_STORY_SOURCE, story, "Instagram-story van ZWB Cycling", null);
  }

  // Verlopen stories weg: alles ouder dan 24 uur, en (als Instagram antwoordde)
  // alles wat niet meer live staat, bijvoorbeeld omdat het is verwijderd.
  let storiesRemoved = 0;
  const { data: storedStories } = await supabase
    .from("media_items")
    .select("id, external_id, published_at")
    .eq("source", INSTAGRAM_STORY_SOURCE);
  const liveIds = stories ? new Set(stories.map((s) => s.id)) : null;
  const cutoff = Date.now() - INSTAGRAM_STORY_TTL_MS;
  const staleIds = (
    (storedStories ?? []) as Array<{
      id: string;
      external_id: string | null;
      published_at: string;
    }>
  )
    .filter(
      (row) =>
        new Date(row.published_at).getTime() < cutoff ||
        (liveIds !== null && !liveIds.has(row.external_id ?? "")),
    )
    .map((row) => row.id);
  if (staleIds.length > 0) {
    const { error } = await supabase.from("media_items").delete().in("id", staleIds);
    if (error) errors.push(`stories opruimen: ${error.message}`);
    else storiesRemoved = staleIds.length;
  }

  if (posts.length > 0 && inserted === 0 && updated === 0) {
    return { ok: false, error: "Geen Instagram-berichten geimporteerd." };
  }

  return {
    ok: true,
    total: posts.length,
    inserted,
    updated,
    stories: stories?.length ?? 0,
    storiesRemoved,
    storyError,
    errors,
  };
}
