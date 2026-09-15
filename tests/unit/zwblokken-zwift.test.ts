import { describe, expect, it } from "vitest";
import { blockKey, lonLatToBlock } from "@/lib/zwblokken/grid";
import { addBlock, pickRulers, type RegionStandings } from "@/lib/zwblokken/titles";
import {
  ZWIFT_BLOCK_ZOOM,
  ZWIFT_WORLDS,
  isZwiftRide,
  zwiftBlocksForRide,
  zwiftRegionCode,
  zwiftWorldAt,
} from "@/lib/zwblokken/zwift";
import { knownRoadCounts, roadBlocksFromShapes } from "@/lib/zwblokken/zwift-query";
import { groupByWorld } from "@/lib/zwblokken/zwift-sync";

/** Een rechte lijn van a naar b in n punten. */
function line(a: [number, number], b: [number, number], n = 20) {
  return Array.from({ length: n }, (_, i) => ({
    lat: a[0] + ((b[0] - a[0]) * i) / (n - 1),
    lon: a[1] + ((b[1] - a[1]) * i) / (n - 1),
  }));
}

describe("zwiftWorldAt", () => {
  it("kent de twaalf werelden uit zwift-data, elk met een minimap van Zwifts eigen CDN", () => {
    expect(ZWIFT_WORLDS).toHaveLength(12);
    for (const world of ZWIFT_WORLDS) {
      expect(world.imageUrl).toMatch(/^https:\/\/cdn\.zwift\.com\//);
    }
  });

  it("herkent werelden aan coördinaten uit echte clubritten", () => {
    // Startpunten van VirtualRide-routelijnen in productie (2026-09-15).
    expect(zwiftWorldAt(-11.64, 166.95)?.slug).toBe("watopia");
    expect(zwiftWorldAt(-10.8, 165.83)?.slug).toBe("makuri-islands");
    expect(zwiftWorldAt(-21.7, 166.2)?.slug).toBe("france");
    expect(zwiftWorldAt(-10.384, 165.8)?.slug).toBe("crit-city");
    expect(zwiftWorldAt(51.49, -0.1)?.slug).toBe("london");
    expect(zwiftWorldAt(40.77, -73.97)?.slug).toBe("new-york");
    expect(zwiftWorldAt(55.645, -5.23)?.slug).toBe("scotland");
  });

  it("laat plekken buiten de werelden liggen", () => {
    expect(zwiftWorldAt(52.09, 5.12)).toBeNull(); // Utrecht
    expect(zwiftWorldAt(24.1, 54.7)).toBeNull(); // MyWhoosh, Abu Dhabi
  });
});

describe("isZwiftRide", () => {
  it("vertrouwt op apparaat, external-id of naam", () => {
    expect(isZwiftRide({ deviceName: "Zwift" })).toBe(true);
    expect(isZwiftRide({ externalId: "zwift-activity-123.fit" })).toBe(true);
    expect(isZwiftRide({ name: "Zwift - Group Ride in Watopia" })).toBe(true);
  });

  it("laat andere platforms erbuiten, ook als hun route in een Zwift-stad ligt", () => {
    expect(isZwiftRide({ deviceName: "MyWhoosh", name: "Race 2" })).toBe(false);
    expect(isZwiftRide({ deviceName: "Rouvy", name: "Paris Champs-Élysées" })).toBe(false);
    expect(isZwiftRide({ deviceName: "FulGaz", name: "Passo di Gavia from Bormio" })).toBe(false);
  });
});

describe("zwiftBlocksForRide", () => {
  const watopia = line([-11.64, 166.93], [-11.66, 166.97]);

  it("geeft de wereld en blokken op zoom 16, zonder start of einde weg te laten", () => {
    const ride = zwiftBlocksForRide({ points: watopia, deviceName: "Zwift" });
    expect(ride?.world.slug).toBe("watopia");
    const start = lonLatToBlock(watopia[0].lat, watopia[0].lon, ZWIFT_BLOCK_ZOOM);
    const end = lonLatToBlock(watopia.at(-1)!.lat, watopia.at(-1)!.lon, ZWIFT_BLOCK_ZOOM);
    expect(ride?.blocks.has(blockKey(start.x, start.y))).toBe(true);
    expect(ride?.blocks.has(blockKey(end.x, end.y))).toBe(true);
    // ~4,8 km diagonaal op ~600 m-blokken: ruim meer dan een handvol.
    expect(ride!.blocks.size).toBeGreaterThan(8);
  });

  it("negeert ritten die niet van Zwift komen of buiten een wereld starten", () => {
    expect(zwiftBlocksForRide({ points: watopia, deviceName: "MyWhoosh" })).toBeNull();
    expect(zwiftBlocksForRide({ points: line([52.0, 5.0], [52.02, 5.04]), deviceName: "Zwift" })).toBeNull();
    expect(zwiftBlocksForRide({ points: watopia.slice(0, 1), deviceName: "Zwift" })).toBeNull();
  });
});

describe("bekende wegblokken", () => {
  it("telt routevormen en club-blokken samen, zonder dubbel te tellen", () => {
    const shape = line([-11.64, 166.93], [-11.64, 166.96], 10);
    const roads = roadBlocksFromShapes([
      { world: "watopia", shape: { lat: shape.map((p) => p.lat), lon: shape.map((p) => p.lon) } },
      { world: null, shape: { lat: [1, 2], lon: [1, 2] } },
      { world: "london", shape: null },
    ]);
    const roadKeys = [...roads.get("watopia")!];
    const [x, y] = roadKeys[0].split("/").map(Number);

    const club = {
      // Eén blok dat al in de routevorm zit, en één daarbuiten.
      watopia: { [x]: [[y, 3] as [number, number]], [x + 50]: [[y, 1] as [number, number]] },
      london: { 1: [[2, 1] as [number, number]] },
    };
    const known = knownRoadCounts(roads, club);
    expect(known.watopia).toBe(roadKeys.length + 1);
    expect(known.london).toBe(1);
  });
});

describe("titels per wereld", () => {
  it("gebruikt dezelfde regels als buiten, per wereld apart", () => {
    const standings: RegionStandings = new Map();
    const add = (profile_id: string, world: string, first_seen_at: string) =>
      addBlock(standings, { profile_id, country: zwiftRegionCode(world), province: null, first_seen_at });
    add("anna", "watopia", "2026-01-01T10:00:00Z");
    add("bram", "watopia", "2026-01-02T10:00:00Z");
    add("bram", "watopia", "2026-01-03T10:00:00Z");
    add("anna", "london", "2026-01-01T10:00:00Z");

    const rulers = pickRulers(standings, new Set(["anna", "bram"]));
    expect(rulers.get("zwift:watopia")?.profileId).toBe("bram");
    expect(rulers.get("zwift:london")?.profileId).toBe("anna");
    expect(rulers.has("NL")).toBe(false);
  });

  it("laat bij gelijke blokken de meeste kilometers in die wereld winnen", () => {
    const standings: RegionStandings = new Map();
    const add = (profile_id: string, first_seen_at: string) =>
      addBlock(standings, { profile_id, country: "zwift:innsbruck", province: null, first_seen_at });
    // Beiden alle (twee) blokken; Anna had ze het eerst.
    add("anna", "2026-01-01T10:00:00Z");
    add("anna", "2026-01-02T10:00:00Z");
    add("bram", "2026-03-01T10:00:00Z");
    add("bram", "2026-03-02T10:00:00Z");
    const eligible = new Set(["anna", "bram"]);
    const meters: Record<string, number> = { anna: 400_000, bram: 650_000 };

    expect(pickRulers(standings, eligible).get("zwift:innsbruck")?.profileId).toBe("anna");
    expect(
      pickRulers(standings, eligible, { tieBreak: (_c, id) => meters[id] }).get("zwift:innsbruck")
        ?.profileId,
    ).toBe("bram");
    // Gelijke kilometers: dan weer wie het eerst had.
    expect(
      pickRulers(standings, eligible, { tieBreak: () => 1 }).get("zwift:innsbruck")?.profileId,
    ).toBe("anna");
  });

  it("laat kilometers niet winnen van meer blokken", () => {
    const standings: RegionStandings = new Map();
    const add = (profile_id: string, first_seen_at: string) =>
      addBlock(standings, { profile_id, country: "zwift:watopia", province: null, first_seen_at });
    add("anna", "2026-01-01T10:00:00Z");
    add("anna", "2026-01-02T10:00:00Z");
    add("bram", "2026-01-01T10:00:00Z");
    const rulers = pickRulers(standings, new Set(["anna", "bram"]), {
      tieBreak: (_c, id) => (id === "bram" ? 1_000_000 : 1),
    });
    expect(rulers.get("zwift:watopia")?.profileId).toBe("anna");
  });
});

describe("groupByWorld", () => {
  it("groepeert ritten per wereld, met niet-Zwift-ritten apart", () => {
    const groups = groupByWorld(new Map([[1, "watopia"], [2, null], [3, "watopia"], [4, "london"]]));
    expect(groups.get("watopia")).toEqual([1, 3]);
    expect(groups.get("london")).toEqual([4]);
    expect(groups.get(null)).toEqual([2]);
  });
});
