export type InstagramMedia = {
  id: string;
  caption?: string;
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  username?: string;
  children?: {
    data?: Array<{
      id: string;
      media_type?: "IMAGE" | "VIDEO";
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
    }>;
  };
};

type InstagramMediaResponse = {
  data?: InstagramMedia[];
  error?: { message?: string; type?: string; code?: number };
};

export const ZWB_INSTAGRAM_URL = "https://www.instagram.com/zwb_cycling/";

function apiVersion() {
  return process.env.INSTAGRAM_GRAPH_API_VERSION?.trim() || "v24.0";
}

function coverFor(item: InstagramMedia) {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.media_type === "IMAGE" && item.media_url) return item.media_url;
  const firstChild = item.children?.data?.find((child) => child.thumbnail_url || child.media_url);
  return firstChild?.thumbnail_url ?? firstChild?.media_url ?? null;
}

export function instagramCoverUrl(item: InstagramMedia) {
  return coverFor(item);
}

export async function fetchInstagramMedia({
  accessToken,
  userId,
  limit = 12,
}: {
  accessToken: string;
  userId: string;
  limit?: number;
}) {
  const fields = [
    "id",
    "caption",
    "media_type",
    "media_url",
    "thumbnail_url",
    "permalink",
    "timestamp",
    "username",
    "children{media_type,media_url,thumbnail_url,permalink}",
  ].join(",");
  const url = new URL(`https://graph.facebook.com/${apiVersion()}/${userId}/media`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => ({}))) as InstagramMediaResponse;
  if (!res.ok || json.error) {
    const message = json.error?.message || `Instagram Graph API ${res.status}`;
    throw new Error(message);
  }
  return json.data ?? [];
}
