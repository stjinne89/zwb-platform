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

/**
 * Per race: onder welke kalenderregel hij staat, het label van de teamrace, en
 * de dag van die regel (Amsterdam, JJJJ-MM-DD) voor het streamcenter.
 */
export type CalendarTarget = { rowId: string; startAt: string; label: string | null; dayKey: string };

export type CalendarRowStreams = {
  state: "live" | "gepland" | "afgelopen";
  /**
   * Het streamcenter van de avond (2026-11-25): alle streams van die dag
   * tegelijk, ook van andere races. Alleen bij 2 of meer streams die dag.
   */
  centerHref: string | null;
  streams: { id: string; href: string; label: string; live: boolean }[];
};

export function calendarStreams(
  streams: CalendarStreamInput[],
  targets: Map<string, CalendarTarget>,
  now: Date,
): Map<string, CalendarRowStreams> {
  type Row = { dayKey: string; streams: CalendarRowStreams["streams"]; ended: boolean[] };
  const rows = new Map<string, Row>();
  for (const stream of streams) {
    const target = targets.get(stream.eventId);
    if (!target) continue;
    const row: Row = rows.get(target.rowId) ?? { dayKey: target.dayKey, streams: [], ended: [] };
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
  // Streams per dag: vanaf 2 gaat de knop naar het streamcenter van die avond.
  const perDay = new Map<string, number>();
  for (const row of rows.values()) perDay.set(row.dayKey, (perDay.get(row.dayKey) ?? 0) + row.streams.length);
  const out = new Map<string, CalendarRowStreams>();
  for (const [rowId, row] of rows) {
    const state = row.streams.some((s) => s.live) ? "live" : row.ended.every(Boolean) ? "afgelopen" : "gepland";
    // Wie live is eerst; verder in de volgorde van klaarzetten.
    const streamsSorted = [...row.streams].sort((a, b) => Number(b.live) - Number(a.live));
    out.set(rowId, {
      state,
      centerHref: (perDay.get(row.dayKey) ?? 0) >= 2 ? `/streams/${row.dayKey}` : null,
      streams: streamsSorted,
    });
  }
  return out;
}
