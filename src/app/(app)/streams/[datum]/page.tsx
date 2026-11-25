import { notFound, redirect } from "next/navigation";
import { BackLink, PageHeader } from "@/components/app-ui";
import { StreamCenter } from "@/components/livestream/stream-center";
import { amsterdamDateKey } from "@/lib/birthdays";
import { getClub } from "@/lib/club";
import { subEventLabel } from "@/lib/events/sub-events";
import { createClient } from "@/lib/supabase/server";
import { youtubeLiveConfigured } from "@/lib/youtube-live/oauth";
import { loadEventStreams } from "@/lib/youtube-live/streams";
import {
  streamCenterLinks,
  streamCenterOrder,
  streamCenterTiles,
  type StreamCenterTarget,
} from "@/lib/youtube-live/stream-center";

export const dynamic = "force-dynamic";

type RaceRow = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  team_id: string | null;
  zwift_event_id: number | string | null;
  external_url: string | null;
  parent_event_id: string | null;
  teams: { name: string } | { name: string }[] | null;
};

const COLUMNS = "id, title, type, start_at, team_id, zwift_event_id, external_url, parent_event_id, teams(name)";
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const teamName = (row: RaceRow) => (Array.isArray(row.teams) ? row.teams[0] : row.teams)?.name ?? null;

/**
 * Het streamcenter van een avond (2026-11-25): alle streams van de races die
 * die dag beginnen, zoals op de kalender, met de teamraces van een raceweek.
 * Zo staan ook losse races die overlappen samen, zoals vier Club Ladder-races.
 * Zonder streams terug naar de kalender.
 */
export default async function StreamCenterPage({ params }: { params: Promise<{ datum: string }> }) {
  const { datum } = await params;
  if (!DAY.test(datum) || Number.isNaN(Date.parse(`${datum}T12:00:00Z`))) notFound();
  if (!youtubeLiveConfigured() || !(await getClub()).isEnabled("livestream")) notFound();

  // Ruim om de dag heen, en dan precies op de dag in Amsterdam.
  const noon = Date.parse(`${datum}T12:00:00Z`);
  const supabase = await createClient();
  const { data: topRows } = await supabase
    .from("events")
    .select(COLUMNS)
    .is("parent_event_id", null)
    .gte("start_at", new Date(noon - 15 * 3600_000).toISOString())
    .lt("start_at", new Date(noon + 15 * 3600_000).toISOString());
  const tops = ((topRows ?? []) as RaceRow[]).filter(
    (row) => amsterdamDateKey(new Date(row.start_at)) === datum,
  );
  if (tops.length === 0) redirect("/kalender");
  const { data: childRows } = await supabase
    .from("events")
    .select(COLUMNS)
    .in(
      "parent_event_id",
      tops.map((top) => top.id),
    );
  const children = (childRows ?? []) as RaceRow[];
  const races = [...tops, ...children];

  const streams = await loadEventStreams(supabase, races.map((race) => race.id));
  // Een race zonder team en zonder raceweek krijgt zijn titel als label, maar
  // alleen als er die avond meer races met een stream zijn.
  const withStreams = new Set(streams.map((stream) => stream.eventId));
  const severalRaces = races.filter((race) => withStreams.has(race.id)).length > 1;
  const titleById = new Map(tops.map((top) => [top.id, top.title]));
  const labelOf = (race: RaceRow) =>
    race.parent_event_id
      ? subEventLabel(race.title, titleById.get(race.parent_event_id) ?? "")
      : teamName(race) ?? (severalRaces ? race.title : null);
  const order = streamCenterOrder(races.map((race) => ({ id: race.id, startAt: race.start_at, label: labelOf(race) })));
  const targets = new Map<string, StreamCenterTarget>(
    races.map((race) => [
      race.id,
      { startAt: race.start_at, label: labelOf(race), order: order.get(race.id) ?? 0, links: streamCenterLinks(race) },
    ]),
  );
  const tiles = streamCenterTiles(streams, targets, new Date());
  if (tiles.length === 0) redirect("/kalender");

  const label = tiles.some((tile) => tile.live)
    ? "Live"
    : tiles.every((tile) => tile.ended)
      ? "Terugkijken"
      : "Streams";
  const raceIds = new Set(
    streams.map((stream) => races.find((race) => race.id === stream.eventId)?.parent_event_id ?? stream.eventId),
  );
  const only = raceIds.size === 1 ? tops.find((top) => raceIds.has(top.id)) : undefined;
  const dayTitle = new Date(`${datum}T12:00:00Z`).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return (
    <div className="space-y-4">
      {only ? <BackLink href={`/events/${only.id}`} label="Event" /> : <BackLink href="/kalender" label="Kalender" />}
      <PageHeader eyebrow={label} title={only?.title ?? dayTitle.charAt(0).toUpperCase() + dayTitle.slice(1)} />
      <StreamCenter tiles={tiles} />
    </div>
  );
}
