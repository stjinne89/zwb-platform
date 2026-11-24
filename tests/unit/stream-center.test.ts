import { describe, expect, it } from "vitest";
import {
  streamCenterOrder,
  streamCenterTiles,
  type StreamCenterTarget,
} from "@/lib/youtube-live/stream-center";

// Het streamcenter (2026-11-24): alle streams van een raceweek tegelijk.

const now = new Date("2026-11-24T19:00:00Z");
const order = streamCenterOrder([
  { id: "zrl-b", title: "ZRL · ZWB B" },
  { id: "zrl-10", title: "ZRL · ZWB 10" },
  { id: "zrl-a", title: "ZRL · ZWB A" },
  { id: "zrl-2", title: "ZRL · ZWB 2" },
]);
const target = (id: string, label: string | null, startAt = "2026-11-24T18:30:00Z"): [string, StreamCenterTarget] => [
  id,
  { startAt, label, order: order.get(id) ?? 0 },
];
const targets = new Map<string, StreamCenterTarget>([
  target("week", null),
  target("zrl-a", "ZRL A"),
  target("zrl-b", "ZRL B"),
  target("oud", null, "2026-11-01T18:30:00Z"),
]);
const stream = (id: string, eventId: string, name: string, status: "gepland" | "live" | "afgelopen" = "gepland") => ({
  id,
  eventId,
  videoId: `v-${id}`,
  name,
  status,
});

describe("streamCenterOrder", () => {
  it("zet teamraces op titel, getallen als getal", () => {
    expect([...order.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)).toEqual([
      "zrl-2",
      "zrl-10",
      "zrl-a",
      "zrl-b",
    ]);
  });
});

describe("streamCenterTiles", () => {
  it("houdt een vaste volgorde: teamrace, dan wie het eerst klaarzette; live springt niet voor", () => {
    const tiles = streamCenterTiles(
      [
        stream("s1", "zrl-b", "Kees", "live"),
        stream("s2", "zrl-a", "Stijn"),
        stream("s3", "zrl-a", "Anna", "live"),
        stream("s4", "week", "Club"),
      ],
      targets,
      now,
    );
    expect(tiles.map((tile) => tile.label)).toEqual(["Club", "ZRL A · Stijn", "ZRL A · Anna", "ZRL B · Kees"]);
    expect(tiles[3]).toMatchObject({ href: "/events/zrl-b?stream=s1#stream", live: true, ended: false, videoId: "v-s1" });
  });

  it("een voorbije race is terugkijken, ook zonder status van YouTube", () => {
    const [tile] = streamCenterTiles([stream("s5", "oud", "Stijn")], targets, now);
    expect(tile.ended).toBe(true);
  });

  it("laat streams van andere races weg", () => {
    expect(streamCenterTiles([stream("s6", "elders", "X", "live")], targets, now)).toEqual([]);
  });
});
