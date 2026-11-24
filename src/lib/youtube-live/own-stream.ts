// Een eigen YouTube-stream aan een race koppelen (2026-11-24, migratie 0360).
// Het lid plakt een link; ZWB maakt geen uitzending en zet er niets op. Eén
// `videos.list` met de API-sleutel (1 eenheid) controleert de video.

import { isVideoId } from "./broadcast";
import { videoStatus, type StreamStatus, type VideoItem } from "./status";

const API = "https://www.googleapis.com/youtube/v3/videos";
const TIMEOUT_MS = 10_000;
const HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);

/**
 * Het video-ID uit een YouTube-link: watch?v=, youtu.be/, /live/, /embed/.
 * Geen kanaallink: daar hoort geen vaste video bij.
 */
export function parseYouTubeVideoId(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (host === "youtu.be") id = parts[0] ?? null;
  else if (HOSTS.has(host)) {
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["live", "embed"].includes(parts[0] ?? "")) id = parts[1] ?? null;
  }
  return id && isVideoId(id) ? id : null;
}

export type OwnVideoItem = VideoItem & {
  snippet?: VideoItem["snippet"] & { channelTitle?: string };
  status?: { privacyStatus?: string; embeddable?: boolean };
  liveStreamingDetails?: VideoItem["liveStreamingDetails"] & { scheduledStartTime?: string };
};

export type OwnVideoCheck =
  | { ok: true; channelTitle: string | null; status: Exclude<StreamStatus, "weg"> }
  | { ok: false; error: string };

/** Mag deze video bij een race? Openbaar, in te sluiten en een livestream. Puur. */
export function checkOwnVideo(item: OwnVideoItem | undefined): OwnVideoCheck {
  if (!item) return { ok: false, error: "YouTube kent deze video niet, of hij is privé." };
  if (item.status?.privacyStatus !== "public") return { ok: false, error: "Zet de stream op openbaar." };
  if (item.status?.embeddable === false) return { ok: false, error: "Sta insluiten toe bij de stream op YouTube." };
  if (!item.liveStreamingDetails) return { ok: false, error: "Dit is geen livestream." };
  const status = videoStatus(item);
  if (status === "weg") return { ok: false, error: "YouTube kent deze video niet, of hij is privé." };
  return { ok: true, channelTitle: item.snippet?.channelTitle?.slice(0, 200) || null, status };
}

export async function fetchOwnVideo(apiKey: string, videoId: string): Promise<OwnVideoItem | undefined> {
  const url = new URL(API);
  url.searchParams.set("part", "snippet,status,liveStreamingDetails");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", apiKey);
  url.searchParams.set(
    "fields",
    "items(id,snippet/liveBroadcastContent,snippet/channelTitle,status/privacyStatus,status/embeddable,liveStreamingDetails)",
  );
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`YouTube videos.list ${res.status}`);
  const data = (await res.json()) as { items?: OwnVideoItem[] };
  return data.items?.find((item) => item.id === videoId);
}
