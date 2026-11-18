// De aanroepen van de YouTube Data API voor livestreams (fase 1). Alleen fetch,
// zonder SDK, net als lib/youtube.ts voor de kanaalsync van Media.
//
// Quota per aanroep (standaard 10.000 eenheden per dag voor het hele project):
// insert en bind ongeveer 50, list 1. Een stream klaarzetten kost dus rond de
// 100 eenheden; niet bevestigd tegen de quotacalculator van Google.

const API = "https://www.googleapis.com/youtube/v3";
const TIMEOUT_MS = 10_000;

/** De vaste stream die de app per kanaal aanmaakt en daarna steeds hergebruikt. */
export const STREAM_TITLE = "Zwift-races (via de clubapp)";

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly reason: string | null,
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

type ApiErrorBody = {
  error?: { code?: number; message?: string; errors?: Array<{ reason?: string }> };
};

async function call<T>(
  accessToken: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Record<string, string>,
  body?: unknown,
): Promise<T> {
  const url = new URL(`${API}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!res.ok) {
    let parsed: ApiErrorBody = {};
    try {
      parsed = JSON.parse(text) as ApiErrorBody;
    } catch {
      // geen JSON
    }
    const reason = parsed.error?.errors?.[0]?.reason ?? null;
    throw new YouTubeApiError(
      `YouTube API ${res.status}${reason ? ` (${reason})` : ""}: ${parsed.error?.message ?? text.slice(0, 200)}`,
      res.status,
      reason,
    );
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Een korte, Nederlandse uitleg bij een fout, voor in het scherm. */
export function youtubeErrorMessage(err: unknown): string {
  if (err instanceof YouTubeApiError) {
    switch (err.reason) {
      case "liveStreamingNotEnabled":
      case "livePermissionBlocked":
      case "insufficientLivePermissions":
        return "Livestreamen staat nog niet aan op je YouTube-kanaal.";
      case "quotaExceeded":
      case "rateLimitExceeded":
      case "userRequestsExceedRateLimit":
        return "YouTube laat de app vandaag niets meer aanmaken. Probeer het morgen opnieuw.";
      case "invalidScheduledStartTime":
        return "YouTube weigert de starttijd van deze race.";
      default:
        if (err.status === 401) return "Koppel YouTube opnieuw.";
        return "YouTube gaf een fout. Probeer het zo opnieuw.";
    }
  }
  return "YouTube is nu niet bereikbaar.";
}

export type YouTubeChannel = { id: string; title: string };

export async function getMyChannel(accessToken: string): Promise<YouTubeChannel | null> {
  const data = await call<{ items?: Array<{ id: string; snippet?: { title?: string } }> }>(
    accessToken,
    "GET",
    "channels",
    { part: "snippet", mine: "true" },
  );
  const item = data.items?.[0];
  return item ? { id: item.id, title: item.snippet?.title ?? "" } : null;
}

export type StreamIngestion = {
  streamId: string;
  /** rtmps://a.rtmps.youtube.com/live2 */
  serverUrl: string;
  /** De streamsleutel. Wordt niet bewaard. */
  streamKey: string;
};

type LiveStreamItem = {
  id: string;
  snippet?: { title?: string };
  cdn?: {
    ingestionInfo?: {
      ingestionAddress?: string;
      rtmpsIngestionAddress?: string;
      streamName?: string;
    };
  };
};

function toIngestion(item: LiveStreamItem): StreamIngestion | null {
  const info = item.cdn?.ingestionInfo;
  const serverUrl = info?.rtmpsIngestionAddress || info?.ingestionAddress;
  if (!serverUrl || !info?.streamName) return null;
  return { streamId: item.id, serverUrl, streamKey: info.streamName };
}

export async function getStreamIngestion(
  accessToken: string,
  streamId: string,
): Promise<StreamIngestion | null> {
  const data = await call<{ items?: LiveStreamItem[] }>(accessToken, "GET", "liveStreams", {
    part: "id,cdn",
    id: streamId,
  });
  const item = data.items?.[0];
  return item ? toIngestion(item) : null;
}

/**
 * De vaste stream van dit kanaal: de bewaarde, anders een eerder door de app
 * aangemaakte met dezelfde titel, anders een nieuwe. Zo blijft de sleutel in OBS
 * geldig als een lid opnieuw koppelt.
 */
export async function ensureReusableStream(
  accessToken: string,
  knownStreamId: string | null,
): Promise<string> {
  if (knownStreamId) {
    const known = await getStreamIngestion(accessToken, knownStreamId).catch(() => null);
    if (known) return known.streamId;
  }
  const mine = await call<{ items?: LiveStreamItem[] }>(accessToken, "GET", "liveStreams", {
    part: "id,snippet",
    mine: "true",
    maxResults: "50",
  });
  const existing = mine.items?.find((item) => item.snippet?.title === STREAM_TITLE);
  if (existing) return existing.id;
  const created = await call<LiveStreamItem>(
    accessToken,
    "POST",
    "liveStreams",
    { part: "snippet,cdn,contentDetails" },
    {
      snippet: { title: STREAM_TITLE },
      cdn: { ingestionType: "rtmp", resolution: "variable", frameRate: "variable" },
      contentDetails: { isReusable: true },
    },
  );
  return created.id;
}

export type BroadcastInput = {
  title: string;
  description: string;
  scheduledStart: Date;
  privacy: "public" | "unlisted";
};

/** Maakt de uitzending aan en koppelt hem aan de vaste stream. Geeft het video-ID. */
export async function createBoundBroadcast(
  accessToken: string,
  streamId: string,
  input: BroadcastInput,
): Promise<string> {
  const broadcast = await call<{ id: string }>(
    accessToken,
    "POST",
    "liveBroadcasts",
    { part: "snippet,status,contentDetails" },
    {
      snippet: {
        title: input.title,
        description: input.description,
        scheduledStartTime: input.scheduledStart.toISOString(),
      },
      status: { privacyStatus: input.privacy, selfDeclaredMadeForKids: false },
      contentDetails: {
        // Live zodra OBS beeld stuurt, klaar zodra het stopt.
        enableAutoStart: true,
        enableAutoStop: true,
        enableEmbed: true,
        enableDvr: true,
        latencyPreference: "normal",
      },
    },
  );
  try {
    await call(accessToken, "POST", "liveBroadcasts/bind", {
      id: broadcast.id,
      part: "id,contentDetails",
      streamId,
    });
  } catch (err) {
    // Een losse uitzending zonder stream gaat nooit live; ruim hem op.
    await deleteBroadcast(accessToken, broadcast.id).catch(() => undefined);
    throw err;
  }
  return broadcast.id;
}

export async function deleteBroadcast(accessToken: string, videoId: string): Promise<void> {
  await call(accessToken, "DELETE", "liveBroadcasts", { id: videoId });
}
