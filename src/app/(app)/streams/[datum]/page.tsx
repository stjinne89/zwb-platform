import { notFound, redirect } from "next/navigation";
import { BackLink, PageHeader } from "@/components/app-ui";
import { StreamCenter } from "@/components/livestream/stream-center";
import { getClub } from "@/lib/club";
import { createClient } from "@/lib/supabase/server";
import { eventTakesStreams, inPrepareWindow } from "@/lib/youtube-live/broadcast";
import { isDayKey, loadDayStreams } from "@/lib/youtube-live/day-streams";
import { youtubeLiveConfigured } from "@/lib/youtube-live/oauth";

export const dynamic = "force-dynamic";

/**
 * Het streamcenter van een avond (2026-11-25): alle streams van de races die
 * die dag beginnen, zoals op de kalender, met de teamraces van een raceweek
 * (lib/youtube-live/day-streams). Zonder streams terug naar de kalender.
 */
export default async function StreamCenterPage({ params }: { params: Promise<{ datum: string }> }) {
  const { datum } = await params;
  if (!isDayKey(datum)) notFound();
  if (!youtubeLiveConfigured() || !(await getClub()).isEnabled("livestream")) notFound();

  const supabase = await createClient();
  const now = new Date();
  const { tops, children, streams, tiles, order, labelOf } = await loadDayStreams(supabase, datum, now);
  if (tiles.length === 0) redirect("/kalender");
  const races = [...tops, ...children];

  // Een extra stream toevoegen (0370): bij elke race die een stream kan
  // krijgen en nog in het venster zit, in de volgorde van de tegels.
  const parents = new Set(children.map((child) => child.parent_event_id));
  const addRaces = races
    .filter((race) => eventTakesStreams(race, parents.has(race.id)) && inPrepareWindow(race.start_at, now))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map((race) => ({ id: race.id, label: labelOf(race) ?? race.title }));

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
      <StreamCenter tiles={tiles} addRaces={addRaces} />
    </div>
  );
}
