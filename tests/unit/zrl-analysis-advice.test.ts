import { describe, expect, it } from "vitest";
import { ownAdvice, rideAdvice, riderRaceAdvice, teamAdvice } from "@/lib/zrl-analysis/advice";
import type { RaceAnalysis, RiderAnalysis, RiderSegment } from "@/lib/zrl-analysis/race";
import type { RideAnalysis, RidePhase } from "@/lib/zrl-analysis/ride";

function seg(index: number, name: string, elapsed: number, watts: number): RiderSegment {
  return { index, name, kind: /kom/i.test(name) ? "klim" : "sprint", elapsed, watts, wkg: watts / 80, rank: 1, of: 30 };
}

function rider(id: number, name: string, klim1: [number, number], klim2: [number, number], extra: Partial<RiderAnalysis> = {}): RiderAnalysis {
  return {
    athleteId: id,
    name,
    time: 2_600_000,
    rank: id,
    avgWatts: 250,
    wkg: 3.2,
    powerType: "POWER_METER",
    criticalPower: null,
    cp20Wkg: null,
    points: 0,
    dropped: false,
    segments: [seg(0, "Sprint", 30, 300), seg(1, "KOM 1", ...klim1), seg(2, "KOM 2", ...klim2)],
    ...extra,
  };
}

/** Vijf renners; Jeroen reed klim 1 mee met het meeste vermogen en loste op klim 2. */
function ttt(): RaceAnalysis {
  return {
    format: "ttt",
    subgroupLabel: "B",
    final: true,
    team: null,
    teams: [],
    rival: { team: "otr", label: "OTR" },
    gapTrace: [],
    sections: [
      { name: "Start → Sprint", kind: "sprint", versusRival: 3000, fastest: "ZWB" },
      { name: "Sprint → KOM 1", kind: "klim", versusRival: -900, fastest: "OTR" },
      { name: "KOM 1 → Sprint", kind: "sprint", versusRival: -5300, fastest: "OTR" },
      { name: "Sprint → KOM 2", kind: "klim", versusRival: 16000, fastest: "ZWB" },
    ],
    spread: 700,
    route: [
      { index: 0, name: "Sprint", kind: "sprint", lap: 1 },
      { index: 1, name: "KOM 1", kind: "klim", lap: 1 },
      { index: 2, name: "KOM 2", kind: "klim", lap: 1 },
    ],
    hasPower: true,
    findings: [],
    riders: [
      rider(1, "Koen", [266, 302], [154, 320]),
      rider(2, "Marc", [266, 273], [154, 296]),
      rider(3, "Wouter", [266, 261], [154, 294]),
      rider(4, "Stijn", [266, 285], [154, 324]),
      rider(5, "Jeroen", [266, 330], [422, 123], { dropped: true, time: 3_216_000 }),
    ],
  };
}

function phase(name: string, climb: boolean, wbalEnd: number | null): RidePhase {
  return { name, climb, from: 0, to: 100, avgWatts: 250, np: 260, intensity: 0.95, avgHeartRate: 170, maxHeartRate: 180, cadence: 80, wbalMin: wbalEnd, wbalEnd };
}

function ride(overrides: Partial<RideAnalysis> = {}): RideAnalysis {
  return {
    offset: 15,
    alignError: 0,
    missingStart: 15,
    avgWatts: 256,
    np: 269,
    intensity: 0.98,
    variability: 1.05,
    kilojoules: 662,
    avgHeartRate: 174,
    maxHeartRate: 190,
    cadence: 72,
    phases: [phase("Vlak 1", false, 50), phase("KOM 1", true, 17), phase("Vlak 2", false, 60), phase("KOM 2", true, 4), phase("Vlak 3", false, 30)],
    best: [
      { seconds: 600, watts: 279, at: 15, season: 301, share: 93 },
      { seconds: 2400, watts: 256, at: 199, season: 273, share: 94 },
    ],
    cp: { cp: 275, wPrime: 13000 },
    wbalMin: { share: -4, at: 594 },
    drift: { first: 1.61, last: 1.38, change: -15 },
    halves: { first: 265, second: 247 },
    cadenceAboveFtp: [
      { from: 60, seconds: 212 },
      { from: 70, seconds: 563 },
      { from: 80, seconds: 294 },
    ],
    series: [],
    ...overrides,
  };
}

describe("riderRaceAdvice", () => {
  it("noemt waar een geloste renner los kwam, en dat hij op een eerdere klim het meest trapte", () => {
    const a = ttt();
    const tips = riderRaceAdvice(a, a.riders[4]);
    expect(tips[0].finding).toBe("Op KOM 2 kwam je los van de ploeg.");
    expect(tips[0].tip).toContain("kortere beurten in het halfuur voor KOM 2");
    // Op klim 1 reed Jeroen nog mee, met het meeste vermogen.
    expect(tips[1].finding).toBe("Op KOM 1 had je 330 W nodig om bij te blijven, het meeste van de ploeg.");
  });

  it("telt een gelost renner niet mee op de klim waar hij al los was", () => {
    const a = ttt();
    expect(riderRaceAdvice(a, a.riders[3])[0].finding).toBe("Op KOM 2 had je 324 W nodig om bij te blijven, het meeste van de ploeg.");
    expect(riderRaceAdvice(a, a.riders[1])).toEqual([]);
  });

  it("wijst in een puntenrace naar het beste segment en meldt geschat vermogen", () => {
    const a = { ...ttt(), format: "points" as const };
    const r = { ...a.riders[0], powerType: "VIRTUAL", segments: [{ ...seg(1, "KOM 1", 266, 302), rank: 3, of: 30 }] };
    const tips = riderRaceAdvice(a, r);
    expect(tips[0].finding).toBe("Je beste segment was KOM 1: 3e van 30 op 3,78 W/kg.");
    expect(tips[0].tip).toContain("de klimmen");
    expect(tips[1].finding).toBe("Zwift rekende met geschat vermogen.");
  });
});

describe("rideAdvice", () => {
  it("ziet een harde start, een lege W′ boven op een klim, drift en een lage cadans", () => {
    const tips = rideAdvice(ride({ cadenceAboveFtp: [{ from: 60, seconds: 300 }, { from: 80, seconds: 300 }] }), 274);
    expect(tips.map((t) => t.finding)).toEqual([
      "Je hardste 10 minuten waren de eerste 10: 279 W, 102% van je FTP.",
      "Boven op KOM 2 (4%) was je W′ op.",
      "Je hartslag liep op: aan het eind 15% minder watt per slag dan aan het begin.",
      "Boven je FTP trapte je 50% van de tijd onder 70 rpm.",
    ]);
  });

  it("noemt een klim niet als je bovenaan weer hersteld was, ook al was je onderweg leeg", () => {
    const tips = rideAdvice(ride({ phases: [phase("KOM 1", true, 17), phase("Vlak", false, 60)] }), 274);
    expect(tips.some((t) => t.finding.includes("W′ op"))).toBe(false);
  });

  it("zegt of je op je maximum reed of reserve had", () => {
    const max = rideAdvice(ride({ best: [{ seconds: 2400, watts: 260, at: 0, season: 270, share: 96 }] }), 274);
    expect(max.map((t) => t.finding)).toContain("Je reed op je maximum: je beste 40 min was 96% van je beste in 90 dagen.");
    const reserve = rideAdvice(ride({ best: [{ seconds: 2400, watts: 220, at: 0, season: 270, share: 81 }] }), 274);
    expect(reserve.map((t) => t.tip)).toContain("Er bleef reserve over: je kunt langere of hardere beurten aan.");
  });

  it("geeft geen start-tip zonder FTP of als het hardste blok later kwam", () => {
    expect(rideAdvice(ride(), null).some((t) => t.finding.startsWith("Je hardste 10"))).toBe(false);
    const later = ride({ best: [{ seconds: 600, watts: 279, at: 900, season: 301, share: 93 }] });
    expect(rideAdvice(later, 274).some((t) => t.finding.startsWith("Je hardste 10"))).toBe(false);
  });
});

describe("ownAdvice", () => {
  it("zet de eigen rit voor de race en houdt het bij vier", () => {
    const a = ttt();
    const tips = ownAdvice(a, a.riders[3], ride(), 274);
    expect(tips).toHaveLength(4);
    expect(tips[0].finding).toContain("hardste 10 minuten");
    expect(tips[3].finding).toBe("Op KOM 2 had je 324 W nodig om bij te blijven, het meeste van de ploeg.");
  });
});

describe("teamAdvice", () => {
  it("noemt het grootste verlies en de grootste winst, en wie loste", () => {
    const tips = teamAdvice(ttt());
    expect(tips[0].finding).toBe("Op het vlakke stuk naar Sprint verloor de ploeg 5,3 s op OTR.");
    expect(tips[0].tip).toContain("rotatie");
    expect(tips[1].finding).toBe("Op het stuk naar KOM 2 won de ploeg 16,0 s op OTR.");
    expect(tips[2].finding).toBe("Jeroen kwam op KOM 2 los van de ploeg; daarna mocht niemand meer lossen.");
  });

  it("geeft in een puntenrace een tip als één renner de meeste punten pakte", () => {
    const a = { ...ttt(), format: "points" as const, sections: [], team: { team: "zwb", total: 100, riders: 5, finishers: 5, time: null, rank: 2, league: 5, label: "ZWB" } };
    a.riders = a.riders.map((r, i) => ({ ...r, dropped: false, points: i === 0 ? 60 : 10 }));
    expect(teamAdvice(a)[0].finding).toBe("Koen pakte 60% van de punten van de ploeg.");
  });
});
