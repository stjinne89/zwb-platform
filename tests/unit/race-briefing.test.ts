import { describe, expect, it } from "vitest";
import fixture from "../fixtures/zwift/green-to-screen-100m.json";
import type { PacingAccent, PacingSegment } from "@/lib/pacing/route-profile";
import { climbSeconds, routeKeyPoints, withoutTunnelSteps } from "@/lib/race-briefing/route";
import { briefingFormatOf, checkLimits, divisionLimits, divisionOf, powerupsFromTags } from "@/lib/race-briefing/rules";
import { cleanRiderName, projectField, suggestRoles, watchList, type FieldRider } from "@/lib/race-briefing/field";
import { briefingTips } from "@/lib/race-briefing/tips";

const altitude = fixture.altitudeM;
const segments: PacingSegment[] = altitude.slice(1).map((m, i) => ({ distanceM: 100, gradient: (m - altitude[i]) / 100, accentIndex: null }));
const accent = (name: string, kind: "climb" | "sprint", startKm: number, endKm: number): PacingAccent => ({
  id: name,
  name,
  kind,
  startKm,
  endKm,
  avgGradient: 0,
  lap: 1,
});
// zwift-data, Green to Screen: segmentsOnRoute plus de lead-in van 72 m.
const accents = [
  accent("The Peristyle Sprint", "sprint", 2.28, 2.68),
  accent("The Hill KOM", "climb", 4.19, 4.71),
  accent("Manhattan Sprint", "sprint", 9.92, 10.17),
  accent("Brooklyn Bridge KOM", "climb", 21.14, 23.14),
];

describe("routeKeyPoints op Green to Screen (ZRL scratch 20 oktober 2026)", () => {
  const points = routeKeyPoints({ segments, accents, totalKm: 28.5, laps: 1 });

  it("vindt The Hill, de Manhattan Bridge, de Brooklyn Bridge en Flatbush", () => {
    expect(points.climbs.map((c) => [c.startKm, c.endKm, c.gainM])).toEqual([
      [3.4, 4.7, 26],
      [9, 10, 27],
      [21.6, 23, 51],
      [26.9, 27.4, 27],
    ]);
    expect(points.climbs[0].name).toBe("The Hill KOM");
    expect(points.climbs[2].name).toBe("Brooklyn Bridge KOM");
  });

  it("ziet de afdaling die direct in de Brooklyn Bridge overgaat", () => {
    expect(points.descentsIntoClimbs).toHaveLength(1);
    expect(points.descentsIntoClimbs[0].descent).toEqual({ startKm: 21, endKm: 21.6, dropM: 20 });
    expect(points.descentsIntoClimbs[0].climb.name).toBe("Brooklyn Bridge KOM");
  });

  it("noemt Flatbush de finale, met 1,1 km tot de streep", () => {
    expect(points.finale).toMatchObject({ kind: "climb", runInKm: 1.1 });
    expect(points.hardestClimb?.name).toBe("Brooklyn Bridge KOM");
    expect(points.earlyClimb?.name).toBe("The Hill KOM");
    expect(points.lastArchKm).toBe(23.14);
  });

  it("schat de brug voor de kop van groep B op ongeveer drie minuten", () => {
    const seconds = climbSeconds(points.climbs[2], "B");
    expect(seconds).toBeGreaterThan(150);
    expect(seconds).toBeLessThan(210);
  });
});

describe("withoutTunnelSteps", () => {
  it("haalt een sprong tussen twee vlakke stukken weg", () => {
    expect(withoutTunnelSteps([0, 0, 0, 0.064, 0.104, 0, 0, 0])).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
  it("laat een klim staan die na de sprong doorloopt", () => {
    const g = [0, 0, 0, 0.096, 0.11, 0.023, 0.025, 0.015];
    expect(withoutTunnelSteps(g)).toEqual(g);
  });
});

describe("regels", () => {
  it("leest het format uit de tags", () => {
    expect(briefingFormatOf({ tags: ["zrl", "zrl_scr"] })).toBe("scratch");
    expect(briefingFormatOf({ tags: ["ttt"] })).toBe("ttt");
    expect(briefingFormatOf({ tags: ["rot"] })).toBe("rot");
    expect(briefingFormatOf({ description: "Race: 2 of 5 (SCRATCH RACE)" })).toBe("scratch");
    expect(briefingFormatOf(null)).toBe("points");
  });

  it("kent de divisie en de BDEV-grenzen", () => {
    const division = divisionOf("Zwift Racing League 26/27: Fast & Fresh : Open Dev Aqua League Division 3 - Race 4", "B");
    expect(division).toMatchObject({ development: true, women: false, category: "B", label: "BDEV" });
    expect(divisionLimits(division)).toEqual({ zftpWkg: 3.74, zmapWkg: 4.53 });
    expect(divisionLimits(divisionOf("… Women's Mint League Division 1", "C"))).toEqual({ zftpWkg: 3.36, zmapWkg: 4.1 });
    expect(divisionLimits(divisionOf("… Open Aqua League Division 1", "A"))).toBeNull();
  });

  it("waarschuwt vanaf 97 % van de grens", () => {
    const limits = { zftpWkg: 3.74, zmapWkg: 4.53 };
    expect(checkLimits(limits, 3.71, 4.23).status).toBe("near");
    expect(checkLimits(limits, 3.18, 3.93).status).toBe("ok");
    expect(checkLimits(limits, 3.75, 4.0).status).toBe("over");
  });

  it("leest de powerups van het event", () => {
    expect(powerupsFromTags(['powerup_percent="0,34,1,33,5,33"'])).toEqual([
      { powerup: "veer", percent: 34 },
      { powerup: "draft boost", percent: 33 },
      { powerup: "aerohelm", percent: 33 },
    ]);
  });
});

const rider = (zwiftId: number, team: string, racingScore: number | null, own = false, history: Array<number | null> = []): FieldRider => ({
  zwiftId,
  name: `Renner ${zwiftId} (${team})`,
  team,
  own,
  racingScore,
  velo: null,
  power: null,
  history,
});

describe("verwachting van het veld", () => {
  const riders = [
    rider(1, "zwb", 600, true),
    rider(2, "zwb", 500, true),
    rider(3, "zwb", 450, true),
    rider(4, "zwb", 300, true),
    rider(5, "rcc", 550, false, [12, 1]),
    rider(6, "rcc", 400),
    rider(7, "rcc", 350),
    rider(8, "otr", 520),
    rider(9, "otr", null),
  ];

  it("sorteert op ZRS en telt FIN en podium per ploeg", () => {
    const projection = projectField(riders, "scratch");
    expect(projection.basis).toBe("zrs");
    expect(projection.order.map((r) => r.zwiftId)).toEqual([1, 5, 8, 2, 3, 6, 7, 4, 9]);
    const zwb = projection.teams.find((t) => t.team === "zwb");
    // 9 starters: plek 1, 4, 5, 8 → 9+6+5+2 en podium 10+4+2.
    expect(zwb?.points).toBe(9 + 6 + 5 + 2 + 10 + 4 + 2);
    // Ploegen met vier of meer starters eerst.
    expect(projection.teams[0].team).toBe("zwb");
  });

  it("geeft geen verwachting zonder waarden voor het grootste deel van het veld", () => {
    const projection = projectField(riders.map((r) => ({ ...r, racingScore: r.zwiftId < 4 ? 500 : null })), "scratch");
    expect(projection.basis).toBeNull();
    expect(projection.teams.every((t) => t.points === null)).toBe(true);
  });

  it("zet de winnaar van een eerdere race bovenaan de lijst om te volgen", () => {
    const watch = watchList(projectField(riders, "scratch"));
    expect(watch[0]).toMatchObject({ reason: "won", place: 2 });
    expect(watch.some((w) => w.rider.own)).toBe(false);
  });

  it("stelt rollen voor: kopmannen, tempo en positie", () => {
    const roles = suggestRoles([
      { zwiftId: 1, rating: 600, fiveMinWkg: 4.23 },
      { zwiftId: 2, rating: 550, fiveMinWkg: 3.93 },
      { zwiftId: 3, rating: 500, fiveMinWkg: 4.21 },
      { zwiftId: 4, rating: 450, fiveMinWkg: 4.16 },
      { zwiftId: 5, rating: 420, fiveMinWkg: 3.78 },
    ]);
    expect(roles.get(1)).toBe("kopman");
    expect(roles.get(2)).toBe("kopman");
    expect(roles.get(3)).toBe("tempo");
    expect(roles.get(4)).toBe("tempo");
    expect(roles.get(5)).toBe("positie");
  });
});

describe("tips", () => {
  it("noemt de afdaling naar de brug en wie er vooraan moet zitten", () => {
    const route = routeKeyPoints({ segments, accents, totalKm: 28.5, laps: 1 });
    const tips = briefingTips({
      format: "scratch",
      category: "B",
      route,
      powerups: powerupsFromTags(['powerup_percent="0,34,1,33,5,33"']),
      projection: projectField([], "scratch"),
      watch: [],
      own: [
        { zwiftId: 1, name: "Jeroen Janssen (ZWB)", role: "positie", limits: { zftpShare: 0.9, zmapShare: 0.86, status: "ok" } },
        { zwiftId: 2, name: "Han Vaessen [ZWB]", role: "kopman", limits: { zftpShare: 0.99, zmapShare: 0.93, status: "near" } },
      ],
    });
    const bridge = tips.find((t) => t.finding.includes("Brooklyn Bridge KOM") && t.slug === "klimmen-in-de-groep");
    expect(bridge?.tip).toContain("vooral Jeroen");
    expect(tips.some((t) => t.finding.startsWith("Finale:"))).toBe(true);
    expect(tips.find((t) => t.slug === "zwift-spelregels")?.tip).toContain("veer voor de slotklim");
    expect(tips.some((t) => t.finding.startsWith("Han zit dicht bij de grens"))).toBe(true);
  });
});

describe("cleanRiderName", () => {
  it("haalt teamtags en rangnummers weg", () => {
    expect(cleanRiderName("1  Harmen 1 Reinders (ZWB)")).toBe("Harmen Reinders");
    expect(cleanRiderName("5. Han Vaessen [ZWB]")).toBe("Han Vaessen");
    expect(cleanRiderName("1. Brett Mulqueen-Ducker | RCC")).toBe("Brett Mulqueen-Ducker");
    expect(cleanRiderName("Daniel [#_lonecyclist] Bojdo")).toBe("Daniel Bojdo");
    expect(cleanRiderName("Barney Whiting - WSJCC RT")).toBe("Barney Whiting");
    expect(cleanRiderName("[ZWB]")).toBe("[ZWB]");
  });
});
