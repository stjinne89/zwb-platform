import { notFound, redirect } from "next/navigation";
import { BackLink, PageHeader } from "@/components/app-ui";
import { StreamCenter } from "@/components/livestream/stream-center";
import { getClub } from "@/lib/club";
import { subEventLabel } from "@/lib/events/sub-events";
import { createClient } from "@/lib/supabase/server";
import { youtubeLiveConfigured } from "@/lib/youtube-live/oauth";
import { loadEventStreams } from "@/lib/youtube-live/streams";
import {
  streamCenterOrder,
  streamCenterTiles,
  type StreamCenterTarget,
} from "@/lib/youtube-live/stream-center";

export const dynamic = "force-dynamic";

/**
 * Het streamcenter (2026-11-24): alle streams van een race tegelijk; bij een
 * raceweek ook die van de teamraces eronder (ZRL A, B, …). Zonder streams terug
 * naar de race.
 */
export default async function StreamCenterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!youtubeLiveConfigured() || !(await getClub()).isEnabled("livestream")) notFound();

  const supabase = await createClient();
  const [{ data: event }, { data: children }] = await Promise.all([
    supabase.from("events").select("id, title, start_at").eq("id", id).maybeSingle(),
    supabase.from("events").select("id, title, start_at").eq("parent_event_id", id),
  ]);
  if (!event) notFound();

  const subEvents = (children ?? []) as { id: string; title: string; start_at: string }[];
  const order = streamCenterOrder(subEvents);
  const targets = new Map<string, StreamCenterTarget>([
    [event.id, { startAt: event.start_at, label: null, order: 0 }],
    ...subEvents.map(
      (sub) =>
        [
          sub.id,
          { startAt: sub.start_at, label: subEventLabel(sub.title, event.title), order: order.get(sub.id) ?? 0 },
        ] as const,
    ),
  ]);
  const tiles = streamCenterTiles(await loadEventStreams(supabase, [...targets.keys()]), targets, new Date());
  if (tiles.length === 0) redirect(`/events/${id}`);

  const label = tiles.some((tile) => tile.live)
    ? "Live"
    : tiles.every((tile) => tile.ended)
      ? "Terugkijken"
      : "Streams";

  return (
    <div className="space-y-4">
      <BackLink href={`/events/${id}`} label="Event" />
      <PageHeader eyebrow={label} title={event.title} />
      <StreamCenter tiles={tiles} />
    </div>
  );
}
