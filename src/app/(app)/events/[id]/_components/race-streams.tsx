import type { SupabaseClient } from "@supabase/supabase-js";
import { Radio } from "lucide-react";
import { StreamPlayer } from "@/components/livestream/stream-player";
import { buttonVariants } from "@/components/ui/button";
import { getClub } from "@/lib/club";
import { cn } from "@/lib/utils";
import {
  eventTakesStreams,
  inPrepareWindow,
  streamEmbedUrl,
  streamsAreLive,
  streamWatchUrl,
  type StreamableEvent,
} from "@/lib/youtube-live/broadcast";
import { youtubeLiveConfigured } from "@/lib/youtube-live/oauth";
import { loadEventStreams, ridesInEvent } from "@/lib/youtube-live/streams";
import { PrepareStreamButton } from "./prepare-stream-button";

/**
 * Streams bij een race (livestreams, fase 1): de speler voor iedereen, en de
 * knop Stream klaarzetten voor wie meerijdt. Mag de racepagina nooit breken.
 */
export async function RaceStreams({
  supabase,
  event,
  hasSubEvents,
  userId,
  canManage,
}: {
  supabase: SupabaseClient;
  event: StreamableEvent & { id: string };
  hasSubEvents: boolean;
  userId: string | null;
  canManage: boolean;
}) {
  if (!youtubeLiveConfigured() || !(await getClub()).isEnabled("livestream")) return null;
  if (!eventTakesStreams(event, hasSubEvents)) return null;

  const now = new Date();
  let loaded: [
    Awaited<ReturnType<typeof loadEventStreams>>,
    boolean,
    { channel_title: string | null; needs_reconnect: boolean } | null,
  ];
  try {
    loaded = await Promise.all([
      loadEventStreams(supabase, [event.id]),
      userId && inPrepareWindow(event.start_at, now)
        ? ridesInEvent(supabase, userId, event)
        : Promise.resolve(false),
      userId
        ? supabase
            .from("youtube_connections")
            .select("channel_title, needs_reconnect")
            .eq("profile_id", userId)
            .maybeSingle()
            .then(({ data }) => data as { channel_title: string | null; needs_reconnect: boolean } | null)
        : Promise.resolve(null),
    ]);
  } catch (err) {
    console.error("[race-streams]", err);
    return null;
  }
  const [streams, mayPrepare, connection] = loaded;
  const ownStream = streams.find((stream) => stream.profileId === userId) ?? null;
  const showPrepare = mayPrepare && !ownStream;
  if (streams.length === 0 && !showPrepare) return null;

  const connected = Boolean(connection && !connection.needs_reconnect);
  const connectHref = `/api/youtube/connect?terug=${encodeURIComponent(`/events/${event.id}`)}`;

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {streamsAreLive(event.start_at, now) ? "Live" : "Terugkijken"}
      </h2>
      {streams.length > 0 && (
        <StreamPlayer
          streams={streams.map((stream) => ({
            id: stream.id,
            name: stream.name,
            embedUrl: streamEmbedUrl(stream.videoId),
            watchUrl: streamWatchUrl(stream.videoId),
          }))}
          removableIds={streams
            .filter((stream) => canManage || stream.profileId === userId)
            .map((stream) => stream.id)}
        />
      )}
      {showPrepare &&
        (connected ? (
          <PrepareStreamButton eventId={event.id} />
        ) : (
          // Een gewone link: next/link zou de koppelroute vooraf ophalen.
          <a href={connectHref} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            <Radio className="size-3.5" />
            {connection?.needs_reconnect ? "YouTube opnieuw koppelen" : "YouTube koppelen om te streamen"}
          </a>
        ))}
    </section>
  );
}
