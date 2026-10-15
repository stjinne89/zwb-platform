import { describe, expect, it } from "vitest";
import { ownAdvice, rideAdvice, riderRaceAdvice, teamAdvice, tttPlanAdvice, type PlanRider } from "@/lib/zrl-analysis/advice";
import type { RaceAnalysis, RiderAnalysis, RiderSegment } from "@/lib/zrl-analysis/race";
import type { RideAnalysis, RidePhase } from "@/lib/zrl-analysis/ride";

function seg(index: number, name: string, elapsed: number, watts: number): RiderSegment {
  return { index, name, kind: /kom/i.test(name) ? "klim" : "sprint", elapsed, watts, wkg: watts / 80, rank: 1, of: 30, falRank: 1 };
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
    aheadWkg: null,
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
    noDraft: false,
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

function phase(name: string, climb: boolean, extra: Partial<RidePhase> = {}): RidePhase {
  return {
    name,
    climb,
    from: 0,
    to: 266,
    avgWatts: 280,
    np: 290,
    intensity: 1.05,
    avgHeartRate: 175,
    maxHeartRate: 182,
    cadence: 80,
    wbalMin: 40,
    wbalEnd: 40,
    wbalStart: 80,
    halves: { first: 290, second: 285 },
    emptyBeforeEnd: null,
    recoveryAfter: null,
    seasonBest: climb ? 330 : null,
    ...extra,
  };
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
    phases: [phase("Vlak 1", false), phase("KOM 1", true), phase("Vlak 2", false)],
    best: [
      { seconds: 600, watts: 250, at: 400, season: 301, share: 83 },
      { seconds: 2400, watts: 256, at: 199, season: 273, share: 94 },
    ],
    cp: { cp: 275, wPrime: 13000 },
    wbalMin: { share: 0, at: 594 },
    drift: { first: 1.61, last: 1.38, change: -15 },
    halves: { first: 265, second: 260 },
    startShare: null,
    cadenceAboveFtp: [
      { from: 60, seconds: 400 },
      { from: 80, seconds: 100 },
    ],
    series: [],
    ...overrides,
  };
}

const withClimb = (climb: Partial<RidePhase>, extra: Partial<RideAnalysis> = {}) =>
  ride({ phases: [phase("Vlak 1", false), phase("KOM 1", true, climb), phase("Vlak 2", false)], ...extra });

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

  it("noemt in een puntenrace het beste segment niet los meer, wel geschat vermogen", () => {
    const a = { ...ttt(), format: "points" as const };
    const r = { ...a.riders[0], powerType: "VIRTUAL", segments: [{ ...seg(1, "KOM 1", 266, 302), rank: 3, of: 30 }] };
    // Een los compliment voor het beste segment ging naar de helft van alle renners (getoetst 2026-10-15).
    expect(riderRaceAdvice(a, r).map((t) => t.finding)).toEqual(["Zwift rekende met geschat vermogen."]);
  });
});

describe("rideAdvice", () => {
  it("geeft geen tip voor een lege W′ op een klim die gelijkmatig gereden is", () => {
    const empty = withClimb({ wbalEnd: 2, wbalMin: 0, emptyBeforeEnd: 10 });
    for (const kind of ["race", "tt", "ttt"] as const) expect(rideAdvice(empty, 274, kind)).toEqual([]);
  });

  it("geeft geen tips meer over hartslagdrift of cadans", () => {
    expect(rideAdvice(ride(), 274, "race")).toEqual([]);
  });

  it("ziet een klim die te hard begon en ver voor de top leeg was, met een tip per soort race", () => {
    const hard = withClimb({ halves: { first: 318, second: 251 }, emptyBeforeEnd: 146, wbalEnd: 0 });
    const race = rideAdvice(hard, 274, "race");
    expect(race[0].finding).toBe("Op KOM 1 ging je er te hard in: eerste helft 318 W, tweede helft 251 W, en 146 s voor de top was je W′ op.");
    expect(race[0].tip).toBe("Begin de klim rond 285 W en zet pas aan op het laatste stuk; zo ben je boven nog bij de groep.");
    expect(rideAdvice(hard, 274, "tt")[0].tip).toContain("gelijkmatig, rond 285 W");
    expect(rideAdvice(hard, 274, "ttt")[0].tip).toContain("tempo van de ploeg, rond 285 W");
  });

  it("noemt een harde tweede helft of een korte lege fase niet als te hard begonnen", () => {
    expect(rideAdvice(withClimb({ halves: { first: 300, second: 340 }, emptyBeforeEnd: 60 }), 274, "race")).toEqual([]);
    expect(rideAdvice(withClimb({ halves: { first: 318, second: 251 }, emptyBeforeEnd: 15 }), 274, "race")).toEqual([]);
  });

  it("noemt een harde start alleen als je met weinig W′ aan de eerste klim begon", () => {
    const start = { best: [{ seconds: 600, watts: 279, at: 15, season: 301, share: 93 }] };
    const costly = rideAdvice(withClimb({ wbalStart: 47 }, start), 274, "ttt");
    expect(costly[0].finding).toBe("Je begon op 102% van je FTP (279 W over de eerste 10 minuten) en kwam met 47% W′ aan de voet van KOM 1.");
    expect(costly[0].tip).toContain("tempo van de ploeg");
    expect(costly[0].rule).toBe("start");
    expect(rideAdvice(withClimb({ wbalStart: 80 }, start), 274, "ttt")).toEqual([]);
    expect(rideAdvice(withClimb({ wbalStart: 47 }, start), null, "ttt")).toEqual([]);
  });

  it("ziet in een ploegentijdrit lang herstel na een klim", () => {
    const slow = withClimb({ recoveryAfter: 150 });
    expect(rideAdvice(slow, 274, "ttt")[0]).toEqual({
      finding: "Na KOM 1 duurde het 2:30 voor je W′ weer boven 25% stond.",
      tip: "Spreek af dat je na KOM 1 één beurt overslaat en dat hardop meldt; een halve beurt kost de ploeg meer.",
    });
    expect(rideAdvice(slow, 274, "race")).toEqual([]);
    expect(rideAdvice(withClimb({ recoveryAfter: 60 }), 274, "ttt")).toEqual([]);
  });

  it("ziet in een tijdrit een klim onder je eigen kunnen, maar alleen als je boven nog W′ had", () => {
    const easy = withClimb({ np: 280, seasonBest: 330, wbalEnd: 40 });
    expect(rideAdvice(easy, 274, "tt")[0].finding).toBe("Op KOM 1 reed je 280 W, 85% van je beste 4 min (330 W).");
    expect(rideAdvice(easy, 274, "tt")[0].tip).toContain("richting 314 W");
    expect(rideAdvice(easy, 274, "race")).toEqual([]);
    expect(rideAdvice(withClimb({ np: 280, seasonBest: 330, wbalEnd: 10 }), 274, "tt")).toEqual([]);
    expect(rideAdvice(withClimb({ np: 280, seasonBest: 330, emptyBeforeEnd: 30 }), 274, "tt")).toEqual([]);
  });

  it("noemt reserve alleen in een tijdrit of ploegentijdrit, met een doel uit de eigen curve", () => {
    const reserve = ride({ best: [{ seconds: 2400, watts: 220, at: 0, season: 270, share: 81 }] });
    expect(rideAdvice(reserve, 274, "tt").map((t) => t.tip)).toContain("Er zat meer in: mik op rond 257 W gemiddeld.");
    expect(rideAdvice(reserve, 274, "ttt")[0].tip).toContain("richting 257 W");
    expect(rideAdvice(reserve, 274, "race")).toEqual([]);
  });
});

describe("ownAdvice", () => {
  it("zet de eigen rit voor de race en kiest de woorden van een ploegentijdrit", () => {
    const a = ttt();
    const hard = withClimb({ halves: { first: 318, second: 251 }, emptyBeforeEnd: 146 });
    const tips = ownAdvice(a, a.riders[3], hard, 274);
    expect(tips[0].tip).toContain("tempo van de ploeg");
    expect(tips[1].finding).toBe("Op KOM 2 had je 324 W nodig om bij te blijven, het meeste van de ploeg.");
  });
});

describe("teamAdvice", () => {
  it("noemt het grootste verlies en wie loste, en geen winst zonder iets om te doen", () => {
    const tips = teamAdvice(ttt());
    expect(tips[0].finding).toBe("Op het vlakke stuk naar Sprint verloor de ploeg 5,3 s op OTR.");
    expect(tips[0].tip).toContain("rotatie");
    expect(tips[1].finding).toBe("Jeroen kwam op KOM 2 los van de ploeg; daarna mocht niemand meer lossen.");
    expect(tips).toHaveLength(2);
  });

  it("geeft in een puntenrace een tip als één renner de meeste punten pakte", () => {
    const a = { ...ttt(), format: "points" as const, sections: [], team: { team: "zwb", total: 100, riders: 5, finishers: 5, time: null, rank: 2, league: 5, label: "ZWB" } };
    a.riders = a.riders.map((r, i) => ({ ...r, dropped: false, points: i === 0 ? 60 : 10 }));
    expect(teamAdvice(a)[0].finding).toBe("Koen pakte 60% van de punten van de ploeg.");
  });
});

describe("puntenrace: segmenten kiezen en efficiëntie", () => {
  const points = (): RaceAnalysis => ({ ...ttt(), format: "points" });
  /** Renner van 80 kg met een beste vijf minuten van 320 W (4 W/kg). */
  const racer = (segments: RiderSegment[], extra: Partial<RiderAnalysis> = {}) =>
    rider(1, "Koen", [266, 302], [154, 320], { avgWatts: 240, wkg: 3, criticalPower: { s15: 700, m1: 450, m5: 320, m20: 270 }, segments, ...extra });
  const hard = (index: number, name: string, rank: number, falRank: number): RiderSegment => ({ ...seg(index, name, 20, 400), rank, falRank, of: 40 });

  it("ziet segmenten hard gereden zonder voorin te komen, en wijst naar het segment dat wel lag", () => {
    const r = racer([hard(0, "Sprint 1", 25, 30), hard(1, "Sprint 2", 22, 28), hard(2, "Sprint 3", 30, 35), hard(3, "KOM", 4, 6)]);
    const tips = riderRaceAdvice(points(), r);
    expect(tips[0].finding).toBe("Je reed 3 segmenten boven je beste vijfminutenvermogen zonder er voorin te komen.");
    expect(tips[0].tip).toContain("KOM lag je beter (6e over de streep)");
  });

  it("zegt niets als de harde segmenten wel iets opleverden", () => {
    const r = racer([hard(0, "Sprint 1", 5, 8), hard(1, "Sprint 2", 22, 28), hard(2, "Sprint 3", 9, 12)]);
    expect(riderRaceAdvice(points(), r)).toEqual([]);
  });

  it("ziet meer vermogen dan de renners die vlak voor je finishten, maar niet zonder draft", () => {
    const r = racer([], { wkg: 3.4, aheadWkg: 3.05 });
    expect(riderRaceAdvice(points(), r)[0].finding).toBe("Je reed gemiddeld 3,40 W/kg; de renners die vlak voor je finishten 3,05 W/kg.");
    expect(riderRaceAdvice({ ...points(), noDraft: true }, r)).toEqual([]);
    expect(riderRaceAdvice(points(), racer([], { wkg: 3.2, aheadWkg: 3.05 }))).toEqual([]);
  });
});

describe("teamAdvice: ploeg uit elkaar op een klim", () => {
  it("noemt het gat tussen de eerste en de vierde over een klim", () => {
    const a = ttt();
    a.riders[2] = rider(3, "Wouter", [266, 261], [166, 294]);
    const tips = teamAdvice(a);
    expect(tips.map((t) => t.finding)).toContain("Op KOM 2 lag de vierde renner 12,0 s achter de eerste.");
  });
});

describe("tttPlanAdvice", () => {
  const plan = (ftps: number[], pulls: Array<[number, number]>): PlanRider[] =>
    ["Koen", "Marc", "Wouter", "Stijn", "Jeroen"].map((name, i) => ({
      zwiftId: i + 1,
      name,
      ftp: ftps[i],
      pullWatts: pulls[i][0],
      pullSeconds: pulls[i][1],
    }));

  it("ziet een renner ver onder het teamgemiddelde die toch kopbeurten kreeg", () => {
    const tips = tttPlanAdvice(ttt(), plan([300, 300, 300, 300, 220], [[370, 30], [370, 30], [370, 30], [370, 30], [270, 30]]));
    expect(tips[0].finding).toBe("Jeroen heeft een FTP 23% onder het teamgemiddelde, maar kreeg kopbeurten van 30 s.");
    expect(tips[0].tip).toContain("in het wiel");
  });

  it("ziet kopbeurten die zachter of harder zijn dan bij snelle ploegen", () => {
    const low = tttPlanAdvice(ttt(), plan([270, 270, 270, 270, 270], [[290, 30], [290, 30], [290, 30], [290, 30], [290, 30]]));
    expect(low.map((t) => t.finding)).toContain("De kopbeurten in het plan lagen op 107% van de gemiddelde FTP.");
    const high = tttPlanAdvice(ttt(), plan([270, 270, 270, 270, 270], [[400, 30], [400, 30], [400, 30], [400, 30], [400, 30]]));
    expect(high.map((t) => t.tip)).toContain("Dat houden alleen heel sterke ploegen vol; 120 tot 130% is een veiliger doel.");
  });

  it("ziet een geloste renner die op of boven zijn FTP reed", () => {
    const a = ttt();
    a.riders[4] = { ...a.riders[4], avgWatts: 310 };
    const tips = tttPlanAdvice(a, plan([270, 270, 270, 270, 300], [[330, 30], [330, 30], [330, 30], [330, 30], [350, 60]]));
    expect(tips.map((t) => t.finding)).toContain("Jeroen reed gemiddeld 103% van de eigen FTP en loste toch.");
  });

  it("doet niets zonder plan of buiten een ploegentijdrit", () => {
    expect(tttPlanAdvice(ttt(), [])).toEqual([]);
    expect(tttPlanAdvice({ ...ttt(), format: "points" }, plan([300, 300, 300, 300, 220], [[370, 30], [370, 30], [370, 30], [370, 30], [270, 30]]))).toEqual([]);
  });
});
