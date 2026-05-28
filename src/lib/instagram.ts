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

type InstagramMeResponse = {
  id?: string;
  username?: string;
  error?: { message?: string; type?: string; code?: number };
};

export const ZWB_INSTAGRAM_URL = "https://www.instagram.com/zwb_cycling/";
export const ZWB_INSTAGRAM_USERNAME = "zwb_cycling";

function apiVersion() {
  return process.env.INSTAGRAM_GRAPH_API_VERSION?.trim() || "v24.0";
}

function apiBase() {
  return process.env.INSTAGRAM_GRAPH_API_BASE_URL?.trim() || "https://graph.instagram.com";
}

function apiUrl(path: string) {
  return new URL(`${apiBase().replace(/\/$/, "")}/${apiVersion()}/${path.replace(/^\//, "")}`);
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

export async function resolveInstagramUserId(accessToken: string) {
  const url = apiUrl("/me");
  url.searchParams.set("fields", "id,username");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => ({}))) as InstagramMeResponse;
  if (!res.ok || json.error) {
    const message = json.error?.message || `Instagram Graph API ${res.status}`;
    throw new Error(message);
  }
  if (!json.id) throw new Error("Meta Instagram API gaf geen Instagram User ID terug.");
  if (json.username && json.username !== ZWB_INSTAGRAM_USERNAME) {
    throw new Error(
      `De Instagram-token hoort bij @${json.username}, niet bij @${ZWB_INSTAGRAM_USERNAME}.`,
    );
  }
  return json.id;
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
  const url = apiUrl(`/${userId}/media`);
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
