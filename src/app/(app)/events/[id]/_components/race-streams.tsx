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
import { loadEventStreams, mayStreamInEvent } from "@/lib/youtube-live/streams";
import {
  OverlayLinkButton,
  OverlaySizeSelect,
  OverlayStandToggle,
  LinkOwnStreamForm,
  OverlayLookPicker,
  PrepareStreamButton,
  ThumbnailButton,
} from "./prepare-stream-button";
import { overlaySize } from "@/lib/youtube-live/overlay-size";
import { CalendarStreams } from "@/components/livestream/calendar-streams";
import { AddExtraStreamForm } from "@/components/livestream/add-extra-stream";
import { amsterdamDateKey } from "@/lib/birthdays";
import { calendarStreams, type CalendarRowStreams, type CalendarTarget } from "@/lib/youtube-live/calendar-streams";

/**
 * Streams bij een race (livestreams, fase 1): de speler voor iedereen, en de
 * knop Stream klaarzetten voor wie meerijdt. Mag de racepagina nooit breken.
 */
export async function RaceStreams({
  supabase,
  event,
  hasSubEvents,
  subEvents = [],
  userId,
  canManage,
  selectedStreamId = null,
}: {
  supabase: SupabaseClient;
  event: StreamableEvent & { id: string; zwift_event_id?: number | string | null };
  hasSubEvents: boolean;
  /** De teamraces van een raceweek: hun streams staan in het streamcenter. */
  subEvents?: { id: string; startAt: string }[];
  userId: string | null;
  canManage: boolean;
  /** Vanaf de kalender: deze stream eerst (?stream=). */
  selectedStreamId?: string | null;
}) {
  const club = await getClub();
  if (!youtubeLiveConfigured() || !club.isEnabled("livestream")) return null;
  if (hasSubEvents) {
    return <RaceWeekStreams supabase={supabase} eventId={event.id} startAt={event.start_at} subEvents={subEvents} />;
  }
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
        ? mayStreamInEvent(supabase, userId, event)
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
  // Een extra stream die het lid toevoegde (0370), is niet de zijne.
  const ownStream = streams.find((stream) => stream.profileId === userId && stream.source !== "extra") ?? null;
  const showPrepare = mayPrepare && !ownStream;
  // Klaarzetten begint op de resolutie van de vorige stream van het lid (0348).
  const lastSize =
    showPrepare && userId
      ? await supabase
          .from("event_streams")
          .select("*")
          .eq("profile_id", userId)
          .neq("source", "extra")
          .order("scheduled_start_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => overlaySize((data as { overlay_size?: string | null } | null)?.overlay_size))
      : overlaySize(null);
  // Een extra stream (0370) toevoegen mag elk lid, binnen hetzelfde venster.
  const showExtra = Boolean(userId) && inPrepareWindow(event.start_at, now);
  if (streams.length === 0 && !showPrepare && !showExtra) return null;

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
    <section id="stream" className="scroll-mt-20 space-y-3 rounded-lg border bg-card p-4">
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
          initialId={selectedStreamId}
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
          {ownStream.source !== "eigen" && <ThumbnailButton streamId={ownStream.id} eventId={event.id} />}
          <OverlaySizeSelect streamId={ownStream.id} initial={ownStream.overlaySize} />
        </div>
      )}
      {ownStream && overlayPath && (
        <OverlayLookPicker
          streamId={ownStream.id}
          initialStyle={ownStream.overlayStyle}
          initialTheme={ownStream.overlayTheme}
        />
      )}
      {ownStream && hasLiveStand && (
        <OverlayStandToggle streamId={ownStream.id} initial={ownStream.overlayStand} />
      )}
      {showPrepare &&
        (connected ? (
          <PrepareStreamButton eventId={event.id} initialSize={lastSize} />
        ) : (
          // Een gewone link: next/link zou de koppelroute vooraf ophalen.
          <a href={connectHref} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            <Radio className="size-3.5" />
            {connection?.needs_reconnect ? "YouTube opnieuw koppelen" : "YouTube koppelen om te streamen"}
          </a>
        ))}
      {/* Of een eigen stream koppelen met een link (0360). */}
      {showPrepare && <LinkOwnStreamForm eventId={event.id} />}
      {showExtra && <AddExtraStreamForm races={[{ id: event.id, label: "Race" }]} />}
    </section>
  );
}

/**
 * Een raceweek heeft zelf geen speler (2026-11-24): de knop van de kalender, die
 * met meer streams naar het streamcenter gaat en met één naar die teamrace.
 */
async function RaceWeekStreams({
  supabase,
  eventId,
  startAt,
  subEvents,
}: {
  supabase: SupabaseClient;
  eventId: string;
  startAt: string;
  subEvents: { id: string; startAt: string }[];
}) {
  // De dag van de raceweek, net als op de kalender.
  const dayKey = amsterdamDateKey(new Date(startAt));
  const targets = new Map<string, CalendarTarget>(
    subEvents.map((sub) => [sub.id, { rowId: eventId, startAt: sub.startAt, label: null, dayKey }]),
  );
  let row: CalendarRowStreams | undefined;
  try {
    row = calendarStreams(await loadEventStreams(supabase, [...targets.keys()]), targets, new Date()).get(eventId);
  } catch (err) {
    console.error("[race-streams]", err);
    return null;
  }
  if (!row) return null;
  return (
    <section id="stream" className="scroll-mt-20 rounded-lg border bg-card p-4">
      <CalendarStreams streams={row.streams} state={row.state} centerHref={row.centerHref} />
    </section>
  );
}
