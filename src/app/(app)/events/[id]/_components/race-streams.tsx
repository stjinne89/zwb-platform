import type { SupabaseClient } from "@supabase/supabase-js";
import { Radio } from "lucide-react";
import { StreamPlayer } from "@/components/livestream/stream-player";
import { HelperControls, type HelperState } from "@/components/livestream/helper-controls";
import { helperOnline } from "@/lib/youtube-live/helper";
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
import { OverlayLinkButton, OverlayStandToggle, PrepareStreamButton, ThumbnailButton } from "./prepare-stream-button";

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
  event: StreamableEvent & { id: string; zwift_event_id?: number | string | null };
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
    { obs_state: HelperState["obsState"]; last_seen_at: string | null } | null,
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
      // De stream-hulp (0340); zonder die tabel gewoon geen knoppen.
      userId
        ? supabase
            .from("stream_helpers")
            .select("obs_state, last_seen_at")
            .eq("profile_id", userId)
            .maybeSingle()
            .then(({ data }) => data as { obs_state: HelperState["obsState"]; last_seen_at: string | null } | null)
        : Promise.resolve(null),
    ]);
  } catch (err) {
    console.error("[race-streams]", err);
    return null;
  }
  const [streams, mayPrepare, connection, helper] = loaded;
  const ownStream = streams.find((stream) => stream.profileId === userId) ?? null;
  const showPrepare = mayPrepare && !ownStream;
  if (streams.length === 0 && !showPrepare) return null;

  const connected = Boolean(connection && !connection.needs_reconnect);
  // De status komt van de cron (0339); zonder die cron beslist de klok.
  const anyLive = streams.some((stream) => stream.status === "live");
  const allEnded = streams.length > 0 && streams.every((stream) => stream.status === "afgelopen");
  const label = anyLive || (!allEnded && streamsAreLive(event.start_at, now)) ? "Live" : "Terugkijken";
  // Overlay voor in OBS bij je eigen stream (0341): logo en sponsors altijd, de
  // live stand alleen in een ZRL-race en met de schakelaar aan.
  const overlayPath = ownStream ? `/live/stream/${ownStream.id}/overlay` : null;
  const hasLiveStand = event.type === "zrl" && Boolean(event.team_id && event.zwift_event_id);
  const connectHref = `/api/youtube/connect?terug=${encodeURIComponent(`/events/${event.id}`)}`;

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h2>
      {streams.length > 0 && (
        <StreamPlayer
          streams={streams.map((stream) => ({
            id: stream.id,
            name: stream.name,
            embedUrl: streamEmbedUrl(stream.videoId),
            watchUrl: streamWatchUrl(stream.videoId),
            live: stream.status === "live",
          }))}
          removableIds={streams
            .filter((stream) => canManage || stream.profileId === userId)
            .map((stream) => stream.id)}
        />
      )}
      {ownStream && helper && (
        <HelperControls
          state={{ online: helperOnline(helper.last_seen_at, now), obsState: helper.obs_state }}
        />
      )}
      {ownStream && overlayPath && (
        <div className="flex flex-wrap items-center gap-2">
          <OverlayLinkButton path={overlayPath} />
          <ThumbnailButton streamId={ownStream.id} eventId={event.id} />
        </div>
      )}
      {ownStream && hasLiveStand && (
        <OverlayStandToggle streamId={ownStream.id} initial={ownStream.overlayStand} />
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
