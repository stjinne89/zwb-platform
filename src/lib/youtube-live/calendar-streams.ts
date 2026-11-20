// De streams per kalenderregel (2026-11-20). Puur, voor de tests. Een regel is
// een race of een raceweek; de streams hangen aan de race zelf of aan de
// teamraces eronder (ZRL). Zie components/livestream/calendar-streams.tsx.

import { streamsAreLive } from "./broadcast";

export type CalendarStreamInput = {
  id: string;
  eventId: string;
  name: string;
  status: "gepland" | "live" | "afgelopen";
};

/** Per race: onder welke kalenderregel hij staat, en het label van de teamrace. */
export type CalendarTarget = { rowId: string; startAt: string; label: string | null };

export type CalendarRowStreams = {
  state: "live" | "gepland" | "afgelopen";
  streams: { id: string; href: string; label: string; live: boolean }[];
};

export function calendarStreams(
  streams: CalendarStreamInput[],
  targets: Map<string, CalendarTarget>,
  now: Date,
): Map<string, CalendarRowStreams> {
  const rows = new Map<string, CalendarRowStreams & { ended: boolean[] }>();
  for (const stream of streams) {
    const target = targets.get(stream.eventId);
    if (!target) continue;
    const row = rows.get(target.rowId) ?? { state: "gepland", streams: [], ended: [] };
    const live = stream.status === "live";
    // Zonder status van YouTube beslist de klok, net als op de racepagina.
    row.ended.push(stream.status === "afgelopen" || (!live && !streamsAreLive(target.startAt, now)));
    row.streams.push({
      id: stream.id,
      href: `/events/${stream.eventId}?stream=${stream.id}#stream`,
      label: [target.label, stream.name].filter(Boolean).join(" · "),
      live,
    });
    rows.set(target.rowId, row);
  }
  const out = new Map<string, CalendarRowStreams>();
  for (const [rowId, row] of rows) {
    const state = row.streams.some((s) => s.live) ? "live" : row.ended.every(Boolean) ? "afgelopen" : "gepland";
    // Wie live is eerst; verder in de volgorde van klaarzetten.
    const streamsSorted = [...row.streams].sort((a, b) => Number(b.live) - Number(a.live));
    out.set(rowId, { state, streams: streamsSorted });
  }
  return out;
}
