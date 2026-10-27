import { describe, expect, it } from "vitest";
import fixture from "../fixtures/zwift/green-to-screen-100m.json";
import type { PacingAccent, PacingSegment } from "@/lib/pacing/route-profile";
import { climbSeconds, routeKeyPoints, segmentLabel, withoutTunnelSteps } from "@/lib/race-briefing/route";
import { pacingRouteFromZwift } from "@/lib/pacing/route-profile";
import { expandLapSegments } from "@/lib/pacing/route-loader";
import spiral from "../fixtures/zwift/spiral-summit-100m.json";
import { briefingFormatOf, checkLimits, cheatRules, divisionLimits, divisionOf, limitWatts, powerupsFromTags } from "@/lib/race-briefing/rules";
import { cleanRiderName, projectField, suggestRoles, watchList, type FieldRider } from "@/lib/race-briefing/field";
import { briefingMoments, briefingTips } from "@/lib/race-briefing/tips";
import { defaultSheet, diffOverride, effectiveSheet, sanitizeOverride } from "@/lib/race-briefing/sheet";

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

  it("rekent de grenzen om naar watt met het gewicht van WTRL, naar beneden afgerond", () => {
    // BDEV: zFTP 280 W bij 3,68 W/kg is 76,1 kg; 3,74 × 76,1 = 284,6 en 4,53 × 76,1 = 344,7.
    expect(limitWatts({ zftpWkg: 3.74, zmapWkg: 4.53 }, 280, 3.68)).toEqual({ zftp: 284, zmap: 344 });
    expect(limitWatts(null, 280, 3.68)).toBeNull();
    expect(limitWatts({ zftpWkg: 3.74, zmapWkg: 4.53 }, null, 3.68)).toBeNull();
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

describe("racebriefje", () => {
  it("omcirkelt per format de hoofdregel", () => {
    expect(cheatRules("scratch", 5)[0]).toEqual({ value: "alle 5 voorin", text: "elke plek is 1 punt, voor elke renner", key: true });
    expect(cheatRules("scratch", 3)[0].value).toBe("iedereen voorin");
    expect(cheatRules("ttt", 5)[0]).toMatchObject({ value: "4e renner", key: true });
    expect(cheatRules("points", 5).filter((r) => r.key)).toHaveLength(1);
  });

  it("zet de route om in momenten per kilometer", () => {
    const route = routeKeyPoints({ segments, accents, totalKm: 28.5, laps: 1 });
    const moments = briefingMoments({
      format: "scratch",
      category: "B",
      route,
      powerups: powerupsFromTags(['powerup_percent="0,34,1,33,5,33"']),
      own: [{ zwiftId: 1, name: "Stijn Martens(ZWB)", role: "positie", limits: { zftpShare: 0.88, zmapShare: 0.83, status: "ok" } }],
    });
    expect(moments.map((m) => m.km)).toEqual([...moments.map((m) => m.km)].sort((a, b) => a - b));
    expect(moments.find((m) => m.km === 21)).toMatchObject({ what: "afdaling 20 m", key: true });
    expect(moments.find((m) => m.km === 21)?.todo).toContain("(Stijn)");
    expect(moments.find((m) => m.what.startsWith("Brooklyn Bridge 51 m"))?.todo).toBe("het lint breekt: lossen doe je niet");
    expect(moments.find((m) => m.what === "laatste boog")?.km).toBe(23.14);
    expect(moments.find((m) => m.what.startsWith("slotklim"))?.todo).toBe("voluit tot de top, veer aan");
    expect(moments.at(-1)?.todo).toBe("sprint uit het wiel, helm op ±200 m");
  });
});

describe("racebriefje aanpassen", () => {
  const route = routeKeyPoints({ segments, accents, totalKm: 28.5, laps: 1 });
  const defaults = defaultSheet({
    format: "scratch",
    category: "B",
    route,
    powerups: powerupsFromTags(['powerup_percent="0,34,1,33,5,33"']),
    own: [{ zwiftId: 1, name: "Stijn Martens(ZWB)", role: "positie", limits: { zftpShare: 0.88, zmapShare: 0.83, status: "ok" } }],
    watch: [{ name: "Bastie RCC", teamLabel: "Rapha_RCC", reason: "won", wonAt: "W2" }],
    warnings: ["Koen Jansen staat ook in de opstelling van B2."],
  });

  it("stelt het profiel voor met lint, slotklim, boog en de andere klimmen", () => {
    expect(defaults.sketch.map((m) => [m.style, m.text])).toEqual([
      ["label", "The Hill"],
      ["markeer", "lint → Brooklyn Bridge"],
      ["boog", "laatste boog"],
      ["cirkel", "voluit!"],
    ]);
    expect(defaults.watch).toEqual([{ name: "Bastie RCC", note: "Rapha_RCC · won W2" }]);
    expect(defaults.notes).toEqual(["Koen Jansen staat ook in de opstelling van B2."]);
  });

  it("bewaart alleen wat afwijkt van het voorstel", () => {
    const unchanged = sanitizeOverride(defaults);
    expect(diffOverride(unchanged, defaults)).toEqual({});
    const escalator = {
      ...defaults,
      moments: defaults.moments.map((m) => (m.what.startsWith("slotklim") ? { km: m.km, what: "escalator Flatbush", todo: "duw ±1200 W: positie houden, niet aanvallen", key: true } : m)),
    };
    const diff = diffOverride(sanitizeOverride(escalator), defaults);
    expect(Object.keys(diff)).toEqual(["moments"]);
    const sheet = effectiveSheet(defaults, diff);
    expect(sheet.edited).toEqual(["moments"]);
    expect(sheet.moments.find((m) => m.what === "escalator Flatbush")?.todo).toContain("1200 W");
    expect(sheet.rules).toBe(defaults.rules);
  });

  it("schoont op: kilometers met komma, lege regels weg, grenzen aan lengte", () => {
    const clean = sanitizeOverride({
      moments: [{ km: "27,4", what: "escalator", todo: "", key: 1 }, { km: "", what: "zonder km", todo: "x" }, { km: "3", what: "", todo: "" }],
      sketch: [{ fromKm: "27,5", toKm: "26,9", text: "escalator", style: "onbekend" }],
      notes: ["  ", "x".repeat(300)],
    });
    expect(clean.moments).toEqual([{ km: 27.4, what: "escalator", todo: "", key: true }]);
    expect(clean.sketch).toEqual([{ fromKm: 26.9, toKm: 27.5, text: "escalator", style: "label" }]);
    expect(clean.notes).toEqual(["x".repeat(120)]);
    expect(clean.rules).toBeUndefined();
  });
});

describe("sprints en KOM's", () => {
  const route = routeKeyPoints({ segments, accents, totalKm: 28.5, laps: 1 });
  const own = [{ zwiftId: 1, name: "Stijn Martens(ZWB)", role: "positie" as const, limits: { zftpShare: 0.88, zmapShare: 0.83, status: "ok" as const } }];
  const powerups = powerupsFromTags(['powerup_percent="0,34,1,33,5,33"']);

  it("haalt de sprints en KOM's uit de Zwift-segmenten van de route", () => {
    expect(route.segments.map((s) => [s.startKm, segmentLabel(s)])).toEqual([
      [2.28, "sprint Peristyle"],
      [4.19, "KOM Hill"],
      [9.92, "sprint Manhattan"],
      [21.14, "KOM Brooklyn Bridge"],
    ]);
  });

  it("nummert een sprint die vaker op de route ligt", () => {
    const laps = routeKeyPoints({
      segments,
      accents: [accent("Manhattan Sprint", "sprint", 9.92, 10.17), accent("Manhattan Sprint", "sprint", 19.92, 20.17)],
      totalKm: 28.5,
      laps: 1,
    });
    expect(laps.segments.map((s) => segmentLabel(s))).toEqual(["sprint Manhattan (1e)", "sprint Manhattan (2e)"]);
    expect(segmentLabel(laps.segments[1], false)).toBe("sprint Manhattan");
  });

  it("zet de sprints op het briefje van een puntenrace, niet op dat van een scratch", () => {
    const points = defaultSheet({ format: "points", category: "B", route, powerups, own, watch: [], warnings: [] });
    expect(points.sketch.filter((m) => m.style === "sprint").map((m) => [m.fromKm, m.text])).toEqual([
      [2.28, "sprint Peristyle"],
      [9.92, "sprint Manhattan"],
    ]);
    expect(points.moments.find((m) => m.what === "sprint Manhattan")).toEqual({ km: 9.92, what: "sprint Manhattan", todo: "sprinters erop, de rest in het wiel" });
    expect(points.moments.map((m) => m.km)).toEqual([...points.moments.map((m) => m.km)].sort((a, b) => a - b));

    const scratch = defaultSheet({ format: "scratch", category: "B", route, powerups, own, watch: [], warnings: [] });
    expect(scratch.sketch.some((m) => m.style === "sprint")).toBe(false);
    expect(scratch.moments.some((m) => m.what.startsWith("sprint"))).toBe(false);
  });

  it("zet op Spiral Summit de Jarvis Lap en de KOM's van Jarvis erbij, maar niet Volcano: die eindigt op de streep", () => {
    // zwift-data 2.1, Spiral Summit: segmentsOnRoute, lead-in 0,15 km.
    const zwiftAccent = (name: string, kind: "climb" | "sprint", startKm: number, endKm: number) => ({ slug: name, name, kind, startKm, endKm, avgInclinePct: null });
    const pacing = pacingRouteFromZwift({
      profile: { distanceM: spiral.altitudeM.map((_, i) => i * 100), altitudeM: spiral.altitudeM },
      accents: [
        zwiftAccent("Jarvis KOM", "climb", 10.838, 12.644),
        zwiftAccent("Jarvis Sprint", "sprint", 13.984, 14.181),
        zwiftAccent("Jarvis KOM", "climb", 15.685, 17.479),
        zwiftAccent("Jarvis Sprint", "sprint", 18.817, 19.019),
        zwiftAccent("Volcano KOM", "climb", 20.228, 23.956),
      ],
      leadInKm: 0.15,
      leadInElevationM: 0,
      lapKm: 23.869,
      laps: 1,
    });
    const lapSegments = expandLapSegments([{ slug: "jarvis-lap", name: "Jarvis Lap", startKm: 10.174, endKm: 15.021 }], { leadInKm: 0.15, lapKm: 23.869, laps: 1 });
    const spiralRoute = routeKeyPoints({ segments: pacing.segments, accents: pacing.accents, totalKm: pacing.totalKm, laps: 1, lapSegments });
    const sheet = defaultSheet({ format: "points", category: "B", route: spiralRoute, powerups: [], own, watch: [], warnings: [] });
    expect(sheet.moments.map((m) => [m.what.replace(/ ·.*/, ""), m.todo])).toEqual([
      ["ronde Jarvis 4,8 km", "rondetijd telt voor FTS: in de kopgroep blijven"],
      ["KOM Jarvis (1e) 36 m", "klimmers erop, de rest in het wiel"],
      ["sprint Jarvis (1e)", "sprinters erop, de rest in het wiel"],
      ["eind ronde Jarvis", "eerste over de streep: FAL"],
      ["KOM Jarvis (2e) 36 m", "klimmers erop, de rest in het wiel"],
      ["sprint Jarvis (2e)", "sprinters erop, de rest in het wiel"],
      ["laatste boog", "powerup vóór de boog op"],
      ["Volcano 126 m", "voluit tot de top"],
    ]);
    expect(sheet.sketch.filter((m) => m.style === "sprint").map((m) => m.text)).toEqual(["sprint Jarvis", "sprint Jarvis"]);
    expect(sheet.sketch.filter((m) => m.style === "ronde").map((m) => [m.fromKm, m.toKm, m.text])).toEqual([[10.324, 15.171, "ronde Jarvis"]]);
    expect(spiralRoute.segments.find((s) => s.kind === "lap")).toMatchObject({ slug: "jarvis-lap", pass: 1, passes: 1 });
  });

  it("noemt een rondesegment naar de ronde, en houdt de naam als er geen ronde in staat", () => {
    const lap = (name: string, pass = 1, passes = 1) => ({ kind: "lap" as const, slug: "x", startKm: 1, endKm: 5, name, pass, passes });
    expect(segmentLabel(lap("Jarvis Lap"))).toBe("ronde Jarvis");
    expect(segmentLabel(lap("Volcano Circuit Rev.", 2, 3))).toBe("ronde Volcano Rev. (2e)");
    expect(segmentLabel(lap("Fuego Flats Rev."))).toBe("Fuego Flats Rev.");
  });

  it("legt een rondesegment per ronde op de juiste kilometer", () => {
    const laps = expandLapSegments([{ slug: "jarvis-lap", name: "Jarvis Lap", startKm: 0, endKm: 4.84 }], { leadInKm: 0.5, lapKm: 4.836, laps: 2 });
    expect(laps.map((l) => [l.id, l.lap, Math.round(l.startKm * 1000)])).toEqual([
      ["jarvis-lap-1", 1, 500],
      ["jarvis-lap-2", 2, 5336],
    ]);
  });

  it("noemt een KOM niet apart als de klim al een moment heeft", () => {
    const points = defaultSheet({ format: "points", category: "B", route, powerups, own, watch: [], warnings: [] });
    expect(points.moments.some((m) => m.what.startsWith("KOM"))).toBe(false);
    expect(points.moments.find((m) => m.what.startsWith("The Hill"))?.todo).toBe("voorste derde, eerste selectie");
  });
});
