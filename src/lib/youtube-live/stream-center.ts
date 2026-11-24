// Het streamcenter (2026-11-24): alle streams van een race of raceweek
// tegelijk. Puur, voor de tests. Zie app/(app)/events/[id]/streams.

import { streamsAreLive } from "./broadcast";

export type StreamCenterInput = {
  id: string;
  eventId: string;
  videoId: string;
  name: string;
  status: "gepland" | "live" | "afgelopen";
};

/** Per race: de start, het label van de teamrace en de plek in de rij. */
export type StreamCenterTarget = { startAt: string; label: string | null; order: number };

export type StreamCenterTile = {
  id: string;
  videoId: string;
  /** "ZRL A · Stijn" */
  label: string;
  /** De speler op de racepagina, met deze stream gekozen. */
  href: string;
  live: boolean;
  /** Voorbij: terugkijken, dus niet vanzelf starten. */
  ended: boolean;
};

/**
 * Vaste volgorde: de race zelf, dan teamrace A, B, C…, en daarbinnen wie het
 * eerst klaarzette (zo komen ze uit loadEventStreams). Live gaan verschuift
 * niets, anders springt een tegel weg terwijl je kijkt.
 */
export function streamCenterTiles(
  streams: StreamCenterInput[],
  targets: Map<string, StreamCenterTarget>,
  now: Date,
): StreamCenterTile[] {
  return streams
    .flatMap((stream, index) => {
      const target = targets.get(stream.eventId);
      if (!target) return [];
      const live = stream.status === "live";
      return [
        {
          order: target.order,
          index,
          tile: {
            id: stream.id,
            videoId: stream.videoId,
            label: [target.label, stream.name].filter(Boolean).join(" · "),
            href: `/events/${stream.eventId}?stream=${stream.id}#stream`,
            live,
            // Zonder status van YouTube beslist de klok, net als op de kalender.
            ended: stream.status === "afgelopen" || (!live && !streamsAreLive(target.startAt, now)),
          },
        },
      ];
    })
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map((item) => item.tile);
}

/** Teamraces op titel, met getallen als getal: ZRL A, ZRL B, … ZRL 10. */
export function streamCenterOrder(titles: { id: string; title: string }[]): Map<string, number> {
  const sorted = [...titles].sort((a, b) => a.title.localeCompare(b.title, "nl", { numeric: true }));
  return new Map(sorted.map((item, index) => [item.id, index + 1]));
}
