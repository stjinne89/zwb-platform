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
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
  error?: { code: number; message: string };
};

type PlaylistItemsResp = {
  nextPageToken?: string;
  items?: Array<{
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      resourceId?: { videoId?: string };
      thumbnails?: {
        maxres?: { url?: string };
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
  error?: { code: number; message: string };
};

async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    throw new Error(
      `YouTube netwerkfout: ${err instanceof Error ? err.message : "onbekend"}`,
    );
  }
  let body: string;
  try {
    body = await res.text();
  } catch {
    body = "";
  }
  if (!res.ok) {
    // YouTube geeft fouten als JSON terug; haal de echte message eruit.
    let detail = body.slice(0, 300);
    try {
      const parsed = JSON.parse(body);
      if (parsed?.error?.message) detail = parsed.error.message;
    } catch {
      // body was geen JSON
    }
    throw new Error(`YouTube API ${res.status}: ${detail}`);
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error("YouTube API gaf geen geldige JSON terug.");
  }
}

// Zoek het uploads-playlist-ID van een channel via handle of channel-ID.
// Probeert meerdere routes voor robuustheid.
export async function resolveUploadsPlaylistId(
  apiKey: string,
  handleOrId: string,
): Promise<string> {
  const raw = handleOrId.trim();
  const handle = raw.replace(/^@/, "");

  // Volgorde: forHandle zonder @, forHandle met @, forUsername (legacy), id.
  const candidates: string[] = [
    `${API_BASE}/channels?part=contentDetails&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`,
    `${API_BASE}/channels?part=contentDetails&forHandle=${encodeURIComponent(`@${handle}`)}&key=${apiKey}`,
    `${API_BASE}/channels?part=contentDetails&forUsername=${encodeURIComponent(handle)}&key=${apiKey}`,
    `${API_BASE}/channels?part=contentDetails&id=${encodeURIComponent(raw)}&key=${apiKey}`,
  ];

  const errors: string[] = [];
  for (const url of candidates) {
    try {
      const data = await getJson<ChannelResp>(url);
      const uploads = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (uploads) return uploads;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "?");
    }
  }

  throw new Error(
    `YouTube-kanaal "${handleOrId}" niet gevonden via Data API. ` +
      `Controleer de handle/ID en of YouTube Data API v3 enabled is. ` +
      `Errors: ${errors.join(" | ")}`,
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
      const videoId = sn?.resourceId?.videoId;
      if (!videoId) continue;
      const thumb =
        sn?.thumbnails?.maxres?.url ??
        sn?.thumbnails?.high?.url ??
        sn?.thumbnails?.medium?.url ??
        sn?.thumbnails?.default?.url ??
        null;
      videos.push({
        videoId,
        title: sn?.title ?? "(zonder titel)",
        description: sn?.description ?? "",
        publishedAt: sn?.publishedAt ?? new Date().toISOString(),
        thumbnailUrl: thumb,
      });
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return videos;
}
