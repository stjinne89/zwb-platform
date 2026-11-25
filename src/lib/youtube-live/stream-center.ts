// Het streamcenter (2026-11-24): alle streams van een avond tegelijk, sinds
// 2026-11-25 per dag in plaats van per raceweek, zodat ook losse races die
// overlappen (vier Club Ladder-races op één avond) samen te zien zijn. Puur,
// voor de tests. Zie app/(app)/streams/[datum].

import { derivedZwiftLinks, normalizeLinkUrl } from "@/lib/events/race-links";
import { streamsAreLive } from "./broadcast";

export type StreamCenterInput = {
  id: string;
  eventId: string;
  videoId: string;
  name: string;
  status: "gepland" | "live" | "afgelopen";
};

/** Een link van het event van een stream: de Ladder-site, Zwift, de live stand. */
export type StreamCenterLink = { key: string; label: string; href: string; external: boolean };

/** Per race: de start, het label (team of teamrace), de plek in de rij en de links. */
export type StreamCenterTarget = {
  startAt: string;
  label: string | null;
  order: number;
  links: StreamCenterLink[];
};

export type StreamCenterTile = {
  id: string;
  videoId: string;
  /** "ZWBullets · Stijn" */
  label: string;
  /** De speler op de racepagina, met deze stream gekozen. */
  href: string;
  links: StreamCenterLink[];
  live: boolean;
  /** Voorbij: terugkijken, dus niet vanzelf starten. */
  ended: boolean;
};

/**
 * Vaste volgorde: op de plek van de race, daarbinnen wie het eerst klaarzette
 * (zo komen ze uit loadEventStreams). Live gaan verschuift niets, anders
 * springt een tegel weg terwijl je kijkt.
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
            links: target.links,
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

/** De races op starttijd, dan op label met getallen als getal: ZRL A, ZRL B, … ZRL 10. */
export function streamCenterOrder(races: { id: string; startAt: string; label: string | null }[]): Map<string, number> {
  const sorted = [...races].sort(
    (a, b) =>
      Date.parse(a.startAt) - Date.parse(b.startAt) ||
      (a.label ?? "").localeCompare(b.label ?? "", "nl", { numeric: true }),
  );
  return new Map(sorted.map((race, index) => [race.id, index]));
}

/**
 * De links van een race bij zijn streams: de Ladder-site, de live stand van een
 * ZRL-teamrace of ladderrace, en Zwift, ZwiftPower en ZwiftRacing.
 */
export function streamCenterLinks(event: {
  id: string;
  type: string;
  team_id: string | null;
  zwift_event_id: number | string | null;
  external_url: string | null;
}): StreamCenterLink[] {
  const links: StreamCenterLink[] = [];
  const ladderSite = event.type === "ladder" ? normalizeLinkUrl(event.external_url) : null;
  if (ladderSite) links.push({ key: "ladder", label: "Ladder-site", href: ladderSite, external: true });
  if (event.type === "zrl" && event.team_id && event.zwift_event_id) {
    links.push({ key: "stand", label: "Live stand", href: `/live/zrl/${event.id}`, external: false });
  }
  if (event.type === "ladder" && event.team_id && event.zwift_event_id) {
    links.push({ key: "stand", label: "Live stand", href: `/events/${event.id}/live`, external: false });
  }
  for (const link of derivedZwiftLinks(event.zwift_event_id)) {
    links.push({ key: link.key, label: link.label, href: link.url, external: true });
  }
  return links;
}
