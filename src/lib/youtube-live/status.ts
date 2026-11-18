// Live-status van de streams bij races (livestreams, fase 2, migratie 0339).
//
// Eén `videos.list` met de API-sleutel voor tot 50 video's tegelijk (1 eenheid):
// de streams zijn openbaar, dus er zijn geen tokens van leden voor nodig. De cron
// kijkt alleen rond races met een geplande stream; daarbuiten doet hij niets.

export type StreamStatus = "gepland" | "live" | "afgelopen" | "weg";

const API = "https://www.googleapis.com/youtube/v3/videos";
const TIMEOUT_MS = 10_000;
const BATCH = 50;

/** Vanaf een half uur voor de geplande start kijken. */
export const CHECK_BEFORE_MS = 30 * 60 * 1000;
/** Tot vier uur erna; een stream die dan nog niet klaar is, telt als afgelopen. */
export const CHECK_AFTER_MS = 4 * 60 * 60 * 1000;

export type VideoItem = {
  id: string;
  snippet?: { liveBroadcastContent?: string };
  liveStreamingDetails?: { actualStartTime?: string; actualEndTime?: string };
};

/** Wat YouTube over één video zegt; geen item = de video is weg of privé. */
export function videoStatus(item: VideoItem | undefined): StreamStatus {
  if (!item) return "weg";
  const content = item.snippet?.liveBroadcastContent;
  const details = item.liveStreamingDetails;
  if (content === "live") return "live";
  if (details?.actualEndTime) return "afgelopen";
  if (content === "upcoming") return "gepland";
  // "none": een gewone video, of een uitzending die voorbij is.
  return details?.actualStartTime ? "afgelopen" : "gepland";
}

export async function fetchVideoStatuses(
  apiKey: string,
  videoIds: string[],
): Promise<Map<string, StreamStatus>> {
  const result = new Map<string, StreamStatus>();
  for (let i = 0; i < videoIds.length; i += BATCH) {
    const ids = videoIds.slice(i, i + BATCH);
    const url = new URL(API);
    url.searchParams.set("part", "snippet,liveStreamingDetails");
    url.searchParams.set("id", ids.join(","));
    url.searchParams.set("key", apiKey);
    url.searchParams.set("fields", "items(id,snippet/liveBroadcastContent,liveStreamingDetails)");
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`YouTube videos.list ${res.status}`);
    const data = (await res.json()) as { items?: VideoItem[] };
    const byId = new Map((data.items ?? []).map((item) => [item.id, item]));
    for (const id of ids) result.set(id, videoStatus(byId.get(id)));
  }
  return result;
}

export type OpenStream = {
  id: string;
  event_id: string;
  profile_id: string;
  youtube_video_id: string;
  scheduled_start_at: string;
  status: StreamStatus;
  live_notified_at: string | null;
};

export type StatusPlan = {
  /** Stream-id → nieuwe status, alleen wat verandert. */
  updates: Map<string, StreamStatus>;
  /** Races waarvan nu de eerste stream live ging: hier gaat één melding heen. */
  notifyEvents: string[];
};

/**
 * Welke status verandert, en welke races een melding krijgen. `alreadyNotified`
 * zijn races waarvan eerder al een stream een melding gaf. Puur, voor de tests.
 */
export function planStatusChanges(
  streams: OpenStream[],
  fetched: Map<string, StreamStatus>,
  alreadyNotified: Set<string>,
  now: Date,
): StatusPlan {
  const updates = new Map<string, StreamStatus>();
  const liveByEvent = new Set<string>();
  for (const stream of streams) {
    let next = fetched.get(stream.youtube_video_id) ?? stream.status;
    // Te lang na de geplande start en nooit afgerond: afgelopen.
    if (
      (next === "gepland" || next === "live") &&
      now.getTime() > Date.parse(stream.scheduled_start_at) + CHECK_AFTER_MS
    ) {
      next = "afgelopen";
    }
    if (next !== stream.status) updates.set(stream.id, next);
    if (next === "live") liveByEvent.add(stream.event_id);
  }
  const notifyEvents = [...liveByEvent].filter(
    (eventId) =>
      !alreadyNotified.has(eventId) &&
      !streams.some((stream) => stream.event_id === eventId && stream.live_notified_at),
  );
  return { updates, notifyEvents };
}

/** De tekst van de melding: wie er live is bij welke race. */
export function liveNotificationText(eventTitle: string, names: string[]): { title: string; body: string } {
  const unique = [...new Set(names.filter(Boolean))];
  const who =
    unique.length === 0
      ? "Een lid"
      : unique.length === 1
        ? unique[0]
        : `${unique.slice(0, -1).join(", ")} en ${unique.at(-1)}`;
  return {
    title: `${eventTitle} is live`,
    body: unique.length > 1 ? `${who} streamen de race.` : `${who} streamt de race.`,
  };
}
