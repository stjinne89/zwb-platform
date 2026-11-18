import { StreamPlayer } from "@/components/livestream/stream-player";
import { getClub } from "@/lib/club";
import { createClient } from "@/lib/supabase/server";
import { streamEmbedUrl, streamWatchUrl } from "@/lib/youtube-live/broadcast";
import { youtubeLiveConfigured } from "@/lib/youtube-live/oauth";
import { loadEventStreams } from "@/lib/youtube-live/streams";

/**
 * De streams van een race naast de live stand. Alleen voor ingelogde leden: de
 * stand is openbaar, wie er streamt niet. Mag de pagina nooit breken.
 */
export async function LivePageStreams({ eventId }: { eventId: string }) {
  if (!youtubeLiveConfigured() || !(await getClub()).isEnabled("livestream")) return null;
  let streams: Awaited<ReturnType<typeof loadEventStreams>>;
  try {
    streams = await loadEventStreams(await createClient(), [eventId]);
  } catch (err) {
    console.error("[live-page-streams]", err);
    return null;
  }
  if (streams.length === 0) return null;
  return (
    <section className="rounded-lg border bg-card p-4">
      <StreamPlayer
        streams={streams.map((stream) => ({
          id: stream.id,
          name: stream.name,
          embedUrl: streamEmbedUrl(stream.videoId),
          watchUrl: streamWatchUrl(stream.videoId),
          live: stream.status === "live",
        }))}
      />
    </section>
  );
}
