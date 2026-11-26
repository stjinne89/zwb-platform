import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { amsterdamDateKey } from "@/lib/birthdays";
import { subEventLabel } from "@/lib/events/sub-events";
import { loadEventStreams, type EventStream } from "./streams";
import {
  streamCenterLinks,
  streamCenterOrder,
  streamCenterTiles,
  type StreamCenterTarget,
  type StreamCenterTile,
} from "./stream-center";

// De streams van één avond (2026-11-25): alle races die die dag in Amsterdam
// beginnen, zoals op de kalender, met de teamraces van een raceweek. Zo staan
// ook losse races die overlappen samen, zoals vier Club Ladder-races. Voor het
// streamcenter (/streams/[datum], als lid) en de tv (/tv, met de service-rol:
// die leest dezelfde races en streams als een goedgekeurd lid).

export type DayRace = {
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

export type DayStreams = {
  /** De races zonder raceweek, en de raceweken, die die dag beginnen. */
  tops: DayRace[];
  /** De teamraces van die raceweken. */
  children: DayRace[];
  streams: EventStream[];
  tiles: StreamCenterTile[];
  order: Map<string, number>;
  labelOf: (race: DayRace) => string | null;
};

const COLUMNS = "id, title, type, start_at, team_id, zwift_event_id, external_url, parent_event_id, teams(name)";
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const teamName = (row: DayRace) => (Array.isArray(row.teams) ? row.teams[0] : row.teams)?.name ?? null;

/** JJJJ-MM-DD en een echte datum. */
export function isDayKey(datum: string): boolean {
  return DAY.test(datum) && !Number.isNaN(Date.parse(`${datum}T12:00:00Z`));
}

/** De races en streams van die dag; zonder races leeg. */
export async function loadDayStreams(supabase: SupabaseClient, datum: string, now: Date): Promise<DayStreams> {
  // Ruim om de dag heen, en dan precies op de dag in Amsterdam.
  const noon = Date.parse(`${datum}T12:00:00Z`);
  const { data: topRows } = await supabase
    .from("events")
    .select(COLUMNS)
    .is("parent_event_id", null)
    .gte("start_at", new Date(noon - 15 * 3600_000).toISOString())
    .lt("start_at", new Date(noon + 15 * 3600_000).toISOString());
  const tops = ((topRows ?? []) as DayRace[]).filter((row) => amsterdamDateKey(new Date(row.start_at)) === datum);
  if (tops.length === 0) {
    return { tops, children: [], streams: [], tiles: [], order: new Map(), labelOf: () => null };
  }
  const { data: childRows } = await supabase
    .from("events")
    .select(COLUMNS)
    .in(
      "parent_event_id",
      tops.map((top) => top.id),
    );
  const children = (childRows ?? []) as DayRace[];
  const races = [...tops, ...children];

  const streams = await loadEventStreams(supabase, races.map((race) => race.id));
  // Een race zonder team en zonder raceweek krijgt zijn titel als label, maar
  // alleen als er die avond meer races met een stream zijn.
  const withStreams = new Set(streams.map((stream) => stream.eventId));
  const severalRaces = races.filter((race) => withStreams.has(race.id)).length > 1;
  const titleById = new Map(tops.map((top) => [top.id, top.title]));
  const labelOf = (race: DayRace) =>
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
  return { tops, children, streams, tiles: streamCenterTiles(streams, targets, now), order, labelOf };
}
