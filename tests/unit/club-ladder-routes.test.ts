import { describe, expect, it } from "vitest";
import { buildLadderAdvice, classRecords } from "@/lib/club-ladder/advice";
import { parseLadderResultPage } from "@/lib/club-ladder/result-page";
import { climbSeconds, durationWeights, effortMix, findLadderRouteSlug, ladderRouteOptions, lapsWithinRule, routeClassFor } from "@/lib/club-ladder/routes";
import { challengeableTeams } from "@/lib/club-ladder/rules";
import { parseClubLadderSummary, type ClubLadderStanding } from "@/lib/club-ladder/summary";
import { matchZwiftResults, teamPowerFromMatches, type StoredMatch } from "@/lib/club-ladder/team-power";
import { ladderRow, ladderSection, resultDay, resultPage, resultRow, summaryPage } from "../fixtures/club-ladder";

const stay = { cls: "staticMove" } as const;

function standing(position: number, name: string, region = "EMEA"): ClubLadderStanding {
  return { position, name, ladderTeamId: position, region, form: [], move: null };
}

describe("Club Ladder summary: team-ID en uitslagen", () => {
  const html = summaryPage(
    [],
    [ladderSection("EMEA", [ladderRow(4, "ZWBeauties", ["WIN"], stay)])],
    [
      resultDay("2026-11-02", [resultRow(17855, "07:00", "Tick Tock", "EVO Borealis", 17, 38, "Galaxy Velorum")]),
      resultDay("2026-11-01", [resultRow(17853, "18:00", "Twilight Crit", "OTR Hooligals", 23, 22, "SZ Måne")]),
    ],
  );
  const summary = parseClubLadderSummary(html, new Date("2026-11-02T12:00:00Z"));

  it("leest het ladder-team-ID", () => {
    expect(summary.standings[0]).toMatchObject({ name: "ZWBeauties", ladderTeamId: 4 });
  });

  it("leest de uitslagen met uitdager links", () => {
    expect(summary.results).toEqual([
      { resultId: 17855, date: "2026-11-02", time: "07:00", route: "Tick Tock", challenger: "EVO Borealis", challengerScore: 17, opponent: "Galaxy Velorum", opponentScore: 38, stage: "Final" },
      { resultId: 17853, date: "2026-11-01", time: "18:00", route: "Twilight Crit", challenger: "OTR Hooligals", challengerScore: 23, opponent: "SZ Måne", opponentScore: 22, stage: "Final" },
    ]);
  });
});

describe("challengeableTeams", () => {
  const standings = [...Array.from({ length: 12 }, (_, i) => standing(i + 1, `Team ${i + 1}`)), standing(3, "US", "AMER")];

  it("geeft tot zeven plekken hoger in dezelfde regio", () => {
    expect(challengeableTeams(standings, standings[9]).map((row) => row.position)).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });

  it("geeft niets voor de nummer één", () => {
    expect(challengeableTeams(standings, standings[0])).toEqual([]);
  });
});

describe("ladderparcoursen", () => {
  it("telt rondes binnen 15–25 km, afgerond op 0,1 km", () => {
    expect(lapsWithinRule(0.194, 12.416, true).map((lap) => lap.laps)).toEqual([2]);
    expect(lapsWithinRule(1.501, 3.47, true).map((lap) => lap.laps)).toEqual([4, 5, 6]);
    expect(lapsWithinRule(0, 30, false)).toEqual([]);
    expect(lapsWithinRule(0, 10, false)).toEqual([]);
  });

  it("laat parcoursen van meer dan 45 minuten weg, ook al vallen ze binnen 15–25 km", () => {
    const slugs = new Set(ladderRouteOptions().map((option) => option.slug));
    for (const slug of ["ven-top", "road-to-sky", "lutscher", "la-reine"]) expect(slugs.has(slug), slug).toBe(false);
    // 20 km vlak (30 min) mag, 20 km met 1500 hm (66 min) niet.
    expect(lapsWithinRule(0, 20, false, 50)).toHaveLength(1);
    expect(lapsWithinRule(0, 20, false, 1500)).toEqual([]);
  });

  it("bevat alle startfavorieten uit de sheet, ook event-only", () => {
    const slugs = new Set(ladderRouteOptions().map((option) => option.slug));
    for (const slug of [
      "the-highline", "neokyo-all-nighter", "castle-to-castle", "countryside-tour", "flat-route-rev",
      "sukis-playground", "handful-of-gravel", "castle-crit", "loop-de-loop", "rolling-highlands",
      "the-classic", "loopin-lava", "cobbled-climbs", "queens-highway-after-party",
    ]) {
      expect(slugs.has(slug), slug).toBe(true);
    }
    expect(ladderRouteOptions().find((option) => option.slug === "flat-route-rev")?.eventOnly).toBe(true);
  });

  it("laat hardlooproutes weg", () => {
    expect(ladderRouteOptions().some((option) => option.slug === "castle-crit-run")).toBe(false);
  });

  it("deelt routes in naar klasse", () => {
    expect(routeClassFor(2, 0, 0, false)).toBe("vlak");
    expect(routeClassFor(7, 0, 0, false)).toBe("punch");
    expect(routeClassFor(4, 0.5, 3, true)).toBe("punch");
    expect(routeClassFor(12, 0, 0, false)).toBe("heuvel");
    expect(routeClassFor(8, 3.5, 6, false)).toBe("klim");
  });

  it("legt op een klimroute meer gewicht op 20 minuten dan op een vlakke", () => {
    const flat = durationWeights(2, [], null);
    const climb = durationWeights(30, [{ km: 7.4, pct: 6 }], null);
    expect(flat.s15).toBeGreaterThan(climb.s15);
    expect(climb.m20).toBeGreaterThan(flat.m20);
    expect(flat.s15 + flat.m1 + flat.m5 + flat.m20).toBeCloseTo(1);
  });

  it("schat de klimtijd: een steil muurtje rond een minuut, de Innsbruck-klim ruim twintig", () => {
    expect(climbSeconds(0.3, 10)).toBeGreaterThan(60);
    expect(climbSeconds(0.3, 10)).toBeLessThan(120);
    expect(climbSeconds(7.4, 6)).toBeGreaterThan(1200);
    expect(effortMix(60)).toEqual({ s15: 0, m1: 1, m5: 0, m20: 0 });
    expect(effortMix(5000).m20).toBe(1);
  });

  it("laat korte steile klimmen bij 1 minuut wegen, niet bij 20 minuten", () => {
    const richmond = ladderRouteOptions().find((option) => option.slug === "2015-uci-worlds-course")!;
    expect(richmond.weights.m1).toBeGreaterThan(richmond.weights.m5);
    expect(richmond.weights.m1).toBeGreaterThan(richmond.weights.m20);
    // Een flauwe klim scheelt door het wiel weinig: minder gewicht dan een steile van dezelfde lengte.
    const gentle = durationWeights(8, [{ km: 0.6, pct: 2 }], null);
    const steep = durationWeights(8, [{ km: 0.6, pct: 7 }], null);
    expect(steep.m1 + steep.m5).toBeGreaterThan(gentle.m1 + gentle.m5);
  });

  it("vindt een route op Zwift-routeId of naam", () => {
    expect(findLadderRouteSlug(null, 3366225080)).toBe("tick-tock");
    expect(findLadderRouteSlug("Loop de Loop")).toBe("loop-de-loop");
    expect(findLadderRouteSlug("Bestaat niet")).toBeNull();
  });
});

describe("openbare uitslagpagina", () => {
  const html = resultPage({
    eventId: 5770692,
    routeId: 3366225080,
    route: "Tick Tock",
    laps: 1,
    riders: [
      { name: "Jonathan Howe [GXY]", points: 10, win: true, time: 1549.72, wkg: 4.55 },
      { name: "3 SandrO[EVO]", points: 9, win: false, time: 1674, wkg: 3.57 },
    ],
  });

  it("leest event, route en renners met hun team", () => {
    const page = parseLadderResultPage(html, { challenger: "EVO Borealis", opponent: "Galaxy Velorum", challengerScore: 9, opponentScore: 10 });
    expect(page).toMatchObject({ zwiftEventId: 5770692, zwiftRouteId: 3366225080, routeName: "Tick Tock", laps: 1 });
    expect(page.riders).toEqual([
      { name: "Jonathan Howe [GXY]", position: 1, points: 10, timeS: 1549.72, avgWkg: 4.55, team: "Galaxy Velorum" },
      { name: "3 SandrO[EVO]", position: 2, points: 9, timeS: 1674, avgWkg: 3.57, team: "EVO Borealis" },
    ]);
  });

  it("geeft bij gelijke stand de winst aan de tegenstander", () => {
    const page = parseLadderResultPage(html, { challenger: "EVO Borealis", opponent: "Galaxy Velorum", challengerScore: 10, opponentScore: 10 });
    expect(page.riders[0].team).toBe("Galaxy Velorum");
  });
});

describe("koppeling met de Zwift-uitslag", () => {
  const riders = [
    { name: "A", position: 1, points: 10, timeS: 1500, avgWkg: 4, team: "X" },
    { name: "B", position: 2, points: 9, timeS: 1510, avgWkg: 3.9, team: "Y" },
  ];

  it("koppelt op rijtijd en rekent W/kg uit", () => {
    const matched = matchZwiftResults(riders, [
      { profileId: 22, rank: 2, durationMs: 1_510_400, weightKg: 70, criticalPower: { s15: 700, m1: 420, m5: 300, m20: 260 }, scoreBefore: 500 },
      { profileId: 11, rank: 1, durationMs: 1_500_200, weightKg: 80, criticalPower: { s15: 800, m1: 480, m5: 360, m20: 320 } },
    ]);
    expect(matched[0]).toMatchObject({ zwiftId: 11, weightKg: 80, powerWkg: { s15: 10, m1: 6, m5: 4.5, m20: 4 } });
    expect(matched[1]).toMatchObject({ zwiftId: 22, racingScore: 500 });
  });

  it("valt terug op finishplek bij even lange lijsten", () => {
    const matched = matchZwiftResults(riders, [
      { profileId: 11, rank: 1, durationMs: null, weightKg: 80, criticalPower: null },
      { profileId: 22, rank: 2, durationMs: null, weightKg: 70, criticalPower: null },
    ]);
    expect(matched.map((rider) => rider.zwiftId)).toEqual([11, 22]);
  });
});

function match(id: number, routeSlug: string, challenger: string, cs: number, opponent: string, os: number, riders: StoredMatch["riders"] = []): StoredMatch {
  return { resultId: id, racedOn: "2026-11-01", routeName: null, routeSlug, challenger, challengerScore: cs, opponent, opponentScore: os, riders };
}

function rider(team: string, name: string, wkg: [number, number, number, number]): StoredMatch["riders"][number] {
  return {
    name, team, position: 1, points: 5, timeS: null, avgWkg: null, zwiftId: null, weightKg: null, racingScore: null,
    powerWkg: { s15: wkg[0], m1: wkg[1], m5: wkg[2], m20: wkg[3] },
  };
}

describe("route-advies", () => {
  it("maakt een krachtprofiel uit de vijf besten", () => {
    const power = teamPowerFromMatches(["Ons"], [
      match(1, "tick-tock", "Ons", 30, "Zij", 25, [
        rider("Ons", "a", [10, 6, 4.5, 4]),
        rider("Ons", "b", [8, 5, 4, 3.6]),
        rider("Zij", "c", [12, 7, 5, 4.5]),
      ]),
    ]);
    expect(power).toEqual({ wkg: { s15: 9, m1: 5.5, m5: 4.25, m20: 3.8 }, riders: 2, races: 1 });
  });

  it("telt gewonnen races per klasse; gelijk is verlies voor de uitdager", () => {
    const records = classRecords(["Ons"], [match(1, "tempus-fugit", "Ons", 27, "Zij", 28), match(2, "tempus-fugit", "Zij", 27, "Ons", 27)]);
    expect(records.get("vlak")).toMatchObject({ races: 2, wins: 1 });
  });

  it("zet een klimroute bovenaan als wij op 20 minuten sterker zijn en op 15 s zwakker", () => {
    const options = ladderRouteOptions();
    const advice = buildLadderAdvice({
      options,
      favorites: new Set(["the-highline"]),
      ourNames: ["Ons"],
      ourPower: { wkg: { s15: 9, m1: 6, m5: 4.8, m20: 4.3 }, riders: 5 },
      theirName: "Zij",
      theirPower: { wkg: { s15: 11, m1: 6.5, m5: 4.5, m20: 3.8 }, riders: 5 },
      matches: [],
    })!;
    expect(advice.routes).toHaveLength(3);
    expect(advice.routes[0].routeClass).toBe("klim");
    expect(advice.edge.m20).toBeGreaterThan(0);
    expect(advice.edge.s15).toBeLessThan(0);
    expect(advice.bestFavorite?.slug).toBe("the-highline");
  });

  it("telt het vermogen niet mee met minder dan drie renners aan een kant", () => {
    const advice = buildLadderAdvice({
      options: ladderRouteOptions(),
      favorites: new Set(),
      ourNames: ["Ons"],
      ourPower: { wkg: { s15: 9, m1: 6, m5: 4.8, m20: 4.3 }, riders: 2 },
      theirName: "Zij",
      theirPower: { wkg: { s15: 11, m1: 6.5, m5: 4.5, m20: 3.8 }, riders: 5 },
      matches: [],
    });
    expect(advice).toBeNull();
  });

  it("geeft geen advies zonder kracht en zonder uitslagen", () => {
    expect(
      buildLadderAdvice({ options: ladderRouteOptions(), favorites: new Set(), ourNames: ["Ons"], ourPower: null, theirName: "Zij", theirPower: null, matches: [] }),
    ).toBeNull();
  });

  it("trekt een route af die de tegenstander zelf koos", () => {
    const options = ladderRouteOptions().filter((option) => option.slug === "tempus-fugit" || option.slug === "flat-route-rev");
    const advice = buildLadderAdvice({
      options,
      favorites: new Set(),
      ourNames: ["Ons"],
      ourPower: null,
      theirName: "Zij",
      theirPower: null,
      matches: [match(1, "tempus-fugit", "Zij", 30, "Ander", 25)],
    })!;
    expect(advice.routes[0].slug).toBe("flat-route-rev");
    expect(advice.routes[1].reasons).toContain("Koos Zij zelf (1×)");
  });
});
