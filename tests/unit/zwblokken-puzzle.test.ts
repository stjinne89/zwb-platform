import { describe, expect, it } from "vitest";
import { piecePath, puzzlePieces, ZWIFT_LANDSCAPE } from "@/lib/zwblokken/puzzle";
import { titlesByMember } from "@/lib/zwblokken/honours";
import { addBlock, type RegionStandings } from "@/lib/zwblokken/titles";
import { knownRoadCounts, knownRoadKeys } from "@/lib/zwblokken/zwift-query";
import { ZWIFT_WORLDS } from "@/lib/zwblokken/zwift";

describe("puzzlePieces", () => {
  const worlds = [
    { slug: "crit-city", name: "Crit City", known: ["10/20", "11/20", "10/21", "11/21"] },
    { slug: "bologna", name: "Bologna", known: ["5/5", "6/5"] },
    { slug: "leeg", name: "Leeg", known: [] },
  ];

  it("is af als elk bekend wegblok gereden is", () => {
    const [crit, bologna] = puzzlePieces(worlds, {
      "crit-city": new Set(["10/20", "11/20", "10/21", "11/21"]),
      bologna: new Set(["5/5"]),
    });
    expect(crit).toMatchObject({ done: true, own: 4, known: 4, pct: 100, width: 2, height: 2 });
    expect(bologna).toMatchObject({ done: false, own: 1, pct: 50 });
  });

  it("rondt naar beneden af, zodat bijna af nooit 100% leest", () => {
    const known = Array.from({ length: 300 }, (_, i) => `${i}/0`);
    const [piece] = puzzlePieces([{ slug: "watopia", name: "Watopia", known }], {
      watopia: new Set(known.slice(1)),
    });
    expect(piece.pct).toBe(99);
    expect(piece.done).toBe(false);
  });

  it("laat een wereld zonder bekende blokken weg en legt de vorm vanaf de hoek", () => {
    const pieces = puzzlePieces(worlds, {});
    expect(pieces.map((p) => p.slug)).toEqual(["crit-city", "bologna"]);
    expect(pieces[0].blocks).toContainEqual([0, 0, false]);
    expect(pieces[0].blocks).toContainEqual([1, 1, false]);
  });

  it("geeft elke Zwift-wereld een soort", () => {
    for (const world of ZWIFT_WORLDS) expect(ZWIFT_LANDSCAPE[world.slug]).toBeDefined();
  });
});

describe("piecePath", () => {
  const knob = { neck: 4, head: 8, d1: 4, d2: 7 };
  const coords = (d: string) =>
    d.replace(/^M|Z$/g, "").split("L").map((p) => p.split(",").map(Number) as [number, number]);

  it("houdt de buitenrand recht", () => {
    for (let col = 0; col < 12; col++) {
      for (const [x, y] of coords(piecePath(0, col, 12, 1, 52, knob))) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(12 * 52);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(52);
      }
    }
  });

  it("laat buren in elkaar grijpen: een nok aan de ene kant, een gat aan de andere", () => {
    // Tussen kolom 0 en 1 ligt de rand op x = 52; de nok steekt 11 diep.
    const left = coords(piecePath(0, 0, 12, 1, 52, knob)).map(([x]) => x);
    const right = coords(piecePath(0, 1, 12, 1, 52, knob)).map(([x]) => x);
    expect(Math.min(...left.filter((x) => x > 26))).toBe(41);
    expect(Math.min(...right)).toBe(41);
    // In twee rijen grijpen ook boven en onder in elkaar.
    const top = coords(piecePath(0, 0, 6, 2, 52, knob)).map(([, y]) => y);
    // Alleen de bovenrand van het onderste stuk, niet de nok rechts.
    const bottom = coords(piecePath(1, 0, 6, 2, 52, knob))
      .filter(([x]) => x < 41)
      .map(([, y]) => y);
    expect(Math.max(...top)).toBe(63);
    expect(Math.max(...bottom.filter((y) => y < 104))).toBe(63);
  });
});

describe("knownRoadKeys", () => {
  it("telt dezelfde blokken als knownRoadCounts", () => {
    const roads = new Map([["paris", new Set(["1/1", "1/2"])]]);
    const club = { paris: { "1": [[2, 3]] as [number, number][], "4": [[4, 1]] as [number, number][] } };
    expect([...(knownRoadKeys(roads, club).get("paris") ?? [])].sort()).toEqual(["1/1", "1/2", "4/4"]);
    expect(knownRoadCounts(roads, club)).toEqual({ paris: 3 });
  });
});

describe("titlesByMember", () => {
  const seen = (profile_id: string, country: string | null, province: string | null, day: number) => ({
    profile_id,
    country,
    province,
    first_seen_at: new Date(Date.UTC(2026, 0, day)).toISOString(),
  });

  it("geeft landen, provincies en werelden met de titel bij het geslacht", () => {
    const standings: RegionStandings = new Map();
    addBlock(standings, seen("anna", "NL", "NL-UT", 1));
    addBlock(standings, seen("anna", "NL", "NL-UT", 2));
    addBlock(standings, seen("bram", "NL", "NL-GE", 3));
    const zwift: RegionStandings = new Map();
    addBlock(zwift, seen("bram", "zwift:watopia", null, 1));
    addBlock(zwift, seen("anna", "zwift:watopia", null, 2));
    // Gelijk in Watopia: de meeste kilometers beslissen.
    const meters = new Map([["watopia", new Map([["anna", 9000], ["bram", 100]])]]);
    const titles = titlesByMember(
      [
        { id: "anna", sex: "vrouw", privacy_accepted_version: "2026-10-01" },
        { id: "bram", sex: "man", privacy_accepted_version: null },
      ],
      standings,
      zwift,
      meters,
    );
    expect(titles.anna).toEqual([
      { title: "Koningin", region: "Nederland", kind: "country" },
      { title: "Gouverneur", region: "Utrecht", kind: "province" },
      { title: "Koningin", region: "Watopia", kind: "zwift" },
    ]);
    // Zonder toestemming voor het geslacht blijft het Vorst; Bram heeft alleen Gelderland.
    expect(titles.bram).toEqual([{ title: "Gouverneur", region: "Gelderland", kind: "province" }]);
  });

  it("geeft een lid buiten de lijst geen titel", () => {
    const standings: RegionStandings = new Map();
    addBlock(standings, seen("test", "NL", null, 1));
    expect(titlesByMember([], standings, new Map(), new Map())).toEqual({});
  });
});
