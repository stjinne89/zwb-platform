// YouTube Data API v3 helper. Vereist YOUTUBE_API_KEY env var.
// Gratis quota: 10.000 units/dag — een channel-sync verbruikt ~5-10 units.

const API_BASE = "https://www.googleapis.com/youtube/v3";

export type YouTubeVideo = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string; // ISO
  thumbnailUrl: string | null;
};

type ChannelResp = {
  items?: Array<{
    id: string;
    contentDetails: { relatedPlaylists: { uploads: string } };
  }>;
};

type PlaylistItemsResp = {
  nextPageToken?: string;
  items?: Array<{
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      resourceId: { videoId: string };
      thumbnails?: {
        maxres?: { url: string };
        high?: { url: string };
        medium?: { url: string };
        default?: { url: string };
      };
    };
  }>;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

// Zoek het uploads-playlist-ID op van een channel via handle (@name) of channelId.
export async function resolveUploadsPlaylistId(
  apiKey: string,
  handleOrId: string,
): Promise<string> {
  // Probeer eerst als handle, dan als channel-id.
  const handle = handleOrId.replace(/^@/, "");
  const tryHandle = await getJson<ChannelResp>(
    `${API_BASE}/channels?part=contentDetails&forHandle=@${encodeURIComponent(handle)}&key=${apiKey}`,
  );
  if (tryHandle.items?.[0]?.contentDetails.relatedPlaylists.uploads) {
    return tryHandle.items[0].contentDetails.relatedPlaylists.uploads;
  }

  const tryId = await getJson<ChannelResp>(
    `${API_BASE}/channels?part=contentDetails&id=${encodeURIComponent(handleOrId)}&key=${apiKey}`,
  );
  if (tryId.items?.[0]?.contentDetails.relatedPlaylists.uploads) {
    return tryId.items[0].contentDetails.relatedPlaylists.uploads;
  }

  throw new Error(
    `YouTube-kanaal "${handleOrId}" niet gevonden. Controleer de handle/ID.`,
  );
}

// Lijst alle video's van een uploads-playlist (paginatie via nextPageToken).
export async function listChannelVideos(
  apiKey: string,
  uploadsPlaylistId: string,
  options: { maxPages?: number } = {},
): Promise<YouTubeVideo[]> {
  const maxPages = options.maxPages ?? 10; // ~500 video's max per sync
  const videos: YouTubeVideo[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const url =
      `${API_BASE}/playlistItems?part=snippet&maxResults=50` +
      `&playlistId=${encodeURIComponent(uploadsPlaylistId)}` +
      `&key=${apiKey}` +
      (pageToken ? `&pageToken=${pageToken}` : "");

    const data = await getJson<PlaylistItemsResp>(url);
    for (const it of data.items ?? []) {
      const sn = it.snippet;
      const thumb =
        sn.thumbnails?.maxres?.url ??
        sn.thumbnails?.high?.url ??
        sn.thumbnails?.medium?.url ??
        sn.thumbnails?.default?.url ??
        null;
      videos.push({
        videoId: sn.resourceId.videoId,
        title: sn.title,
        description: sn.description,
        publishedAt: sn.publishedAt,
        thumbnailUrl: thumb,
      });
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return videos;
}
