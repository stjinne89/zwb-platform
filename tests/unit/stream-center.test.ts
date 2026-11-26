import { describe, expect, it } from "vitest";
import {
  streamCenterLinks,
  streamCenterOrder,
  streamCenterTiles,
  type StreamCenterTarget,
} from "@/lib/youtube-live/stream-center";
import {
  DEFAULT_STREAM_CENTER_PREFS,
  parseStreamCenterPrefs,
  streamCenterView,
  toggleStreamCenterTile,
  type StreamCenterPrefs,
} from "@/lib/youtube-live/stream-center-view";

// Het streamcenter (2026-11-24), sinds 2026-11-25 per avond: ook losse races
// die overlappen, zoals vier Club Ladder-races.

const now = new Date("2026-11-26T19:00:00Z");
const races = [
  { id: "bullets", startAt: "2026-11-26T18:45:00Z", label: "ZWBullets" },
  { id: "beasts", startAt: "2026-11-26T18:32:00Z", label: "ZWBeasts" },
  { id: "zrl-10", startAt: "2026-11-26T18:30:00Z", label: "ZRL 10" },
  { id: "zrl-2", startAt: "2026-11-26T18:30:00Z", label: "ZRL 2" },
  { id: "oud", startAt: "2026-11-01T18:30:00Z", label: null },
];
const order = streamCenterOrder(races);
const link = { key: "ladder", label: "Ladder-site", href: "https://ladder.example/fixture/1", external: true };
const targets = new Map<string, StreamCenterTarget>(
  races.map((race) => [
    race.id,
    { startAt: race.startAt, label: race.label, order: order.get(race.id) ?? 0, links: race.id === "bullets" ? [link] : [] },
  ]),
);
const stream = (id: string, eventId: string, name: string, status: "gepland" | "live" | "afgelopen" = "gepland") => ({
  id,
  eventId,
  videoId: `v-${id}`,
  name,
  status,
});

describe("streamCenterOrder", () => {
  it("zet races op starttijd, dan op label met getallen als getal", () => {
    expect([...order.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)).toEqual([
      "oud",
      "zrl-2",
      "zrl-10",
      "beasts",
      "bullets",
    ]);
  });
});

describe("streamCenterTiles", () => {
  it("houdt een vaste volgorde: race, dan wie het eerst klaarzette; live springt niet voor", () => {
    const tiles = streamCenterTiles(
      [
        stream("s1", "bullets", "Kees", "live"),
        stream("s2", "beasts", "Stijn"),
        stream("s3", "beasts", "Anna", "live"),
        stream("s4", "zrl-2", "Bart"),
      ],
      targets,
      now,
    );
    expect(tiles.map((tile) => tile.label)).toEqual([
      "ZRL 2 · Bart",
      "ZWBeasts · Stijn",
      "ZWBeasts · Anna",
      "ZWBullets · Kees",
    ]);
    expect(tiles[3]).toMatchObject({
      href: "/events/bullets?stream=s1#stream",
      links: [link],
      live: true,
      ended: false,
      videoId: "v-s1",
    });
  });

  it("een voorbije race is terugkijken, ook zonder status van YouTube", () => {
    const [tile] = streamCenterTiles([stream("s5", "oud", "Stijn")], targets, now);
    expect(tile).toMatchObject({ ended: true, label: "Stijn" });
  });

  it("laat streams van andere races weg", () => {
    expect(streamCenterTiles([stream("s6", "elders", "X", "live")], targets, now)).toEqual([]);
  });
});

describe("streamCenterLinks", () => {
  it("geeft een Ladder-race de Ladder-site, de live stand en de Zwift-links", () => {
    const links = streamCenterLinks({
      id: "bullets",
      type: "ladder",
      team_id: "t1",
      zwift_event_id: 5123456,
      external_url: "ladder.example/fixture/1",
    });
    expect(links.map((l) => l.label)).toEqual(["Ladder-site", "Live stand", "Zwift", "ZwiftPower", "ZwiftRacing"]);
    expect(links[0]).toMatchObject({ href: "https://ladder.example/fixture/1", external: true });
    expect(links[1]).toEqual({ key: "stand", label: "Live stand", href: "/events/bullets/live", external: false });
  });

  it("geeft een ZRL-teamrace de live stand, en niets zonder Zwift-event", () => {
    expect(
      streamCenterLinks({ id: "zrl-a", type: "zrl", team_id: "t1", zwift_event_id: 5, external_url: null })[0],
    ).toEqual({ key: "stand", label: "Live stand", href: "/live/zrl/zrl-a", external: false });
    expect(streamCenterLinks({ id: "x", type: "zrl", team_id: "t1", zwift_event_id: null, external_url: null })).toEqual([]);
    expect(
      streamCenterLinks({ id: "x", type: "zrl", team_id: null, zwift_event_id: null, external_url: "https://a.example" }),
    ).toEqual([]);
  });
});

describe("streamCenterView en toggleStreamCenterTile", () => {
  const ids = ["a", "b", "c", "d"];
  const prefs = (over: Partial<StreamCenterPrefs> = {}): StreamCenterPrefs => ({
    ...DEFAULT_STREAM_CENTER_PREFS,
    ...over,
  });

  it("toont alles zonder keuze, en een nieuwe stream komt in beeld", () => {
    expect(streamCenterView(ids, prefs())).toEqual({ visible: ids, big: null });
    expect(streamCenterView([...ids, "e"], prefs({ hidden: ["b"] })).visible).toEqual(["a", "c", "d", "e"]);
  });

  it("verbergt en toont, maar de laatste blijft in beeld", () => {
    let next = toggleStreamCenterTile(ids, prefs(), "b");
    expect(next.hidden).toEqual(["b"]);
    next = toggleStreamCenterTile(ids, next, "b");
    expect(next.hidden).toEqual([]);
    const one = prefs({ hidden: ["a", "b", "c"] });
    expect(toggleStreamCenterTile(ids, one, "d")).toBe(one);
  });

  it("vergeet verborgen streams die er niet meer zijn", () => {
    expect(toggleStreamCenterTile(ids, prefs({ hidden: ["weg"] }), "a").hidden).toEqual(["a"]);
  });

  it("valt terug op alles als alles verborgen is", () => {
    expect(streamCenterView(["a", "b"], prefs({ hidden: ["a", "b"] })).visible).toEqual(["a", "b"]);
  });

  it("zet in Groot de gekozen stream groot, of anders de eerste in beeld", () => {
    expect(streamCenterView(ids, prefs({ layout: "groot", big: "c" })).big).toBe("c");
    expect(streamCenterView(ids, prefs({ layout: "groot", big: "c", hidden: ["c", "a"] })).big).toBe("b");
    expect(streamCenterView(ids, prefs({ layout: "groot", hidden: ["a", "b", "c"] })).big).toBeNull();
    expect(streamCenterView(ids, prefs({ big: "c" })).big).toBeNull();
  });

  it("leest een bewaarde keuze en negeert rommel", () => {
    expect(parseStreamCenterPrefs('{"hidden":["a",3],"layout":"groot","big":"b"}')).toEqual({
      hidden: ["a"],
      layout: "groot",
      big: "b",
    });
    expect(parseStreamCenterPrefs("{kapot")).toEqual(DEFAULT_STREAM_CENTER_PREFS);
    expect(parseStreamCenterPrefs(null)).toEqual(DEFAULT_STREAM_CENTER_PREFS);
  });
});
