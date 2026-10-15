import { describe, expect, it } from "vitest";
import { analysePersonalRace, raceKindOf } from "@/lib/zrl-analysis/personal";
import { personalAdvice } from "@/lib/zrl-analysis/advice";
import { zwiftEventIdFromInput } from "@/lib/zrl-analysis/activity";
import { minimizeRaceData, type RaceData } from "@/lib/zrl-live/snapshot";
import type { RideAnalysis } from "@/lib/zrl-analysis/ride";

const START = 1_800_000_000_000;
// Route 1 bestaat niet in de segmenttabel; de test geeft de segmenten via de passages.
// Daarom een route uit de tabel: Watopia Figure 8 Reverse (sprint, KOM, sprint, KOM).
const ROUTE = "553661379";
const KOM = "-9223372027220687690";
const SPRINT = "-9223372031501094040";

/**
 * Groep D met drie renners (de eigen renner 1, een ZWB'er 2, een onbekende 3)
 * en groep C met één ZWB'er (4). Renner 3 wint groep D.
 */
function race(): RaceData {
  const passage = (athleteId: number, segmentId: string, at: number, elapsed: number, avgPower?: number) => ({
    id: `${athleteId}-${segmentId}`,
    athleteId,
    segmentId,
    ts: START + at,
    elapsed,
    ...(avgPower ? { avgPower, weightKg: 80 } : {}),
  });
  return {
    fetchedAt: START + 3 * 3600_000,
    eventName: "Zwift - Race: Testcup (D)",
    format: "points",
    eventType: "RACE",
    subgroups: [
      {
        id: "11",
        label: "D",
        startAt: START,
        routeId: ROUTE,
        laps: 1,
        entrants: [
          { zwiftId: "1", name: "Eigen Zwiftnaam" },
          { zwiftId: "2", name: "Clubgenoot [ZWB]" },
          { zwiftId: "3", name: "Onbekende" },
        ],
        results: [
          { profileId: 3, rank: 1, durationMs: 2_500_000, avgWatts: 300, weightKg: 70 },
          { profileId: 1, rank: 2, durationMs: 2_530_000, avgWatts: 240, weightKg: 80, powerType: "POWER_METER" },
          { profileId: 2, rank: 3, durationMs: 2_600_000 },
        ],
        resultsOk: true,
      },
      {
        id: "12",
        label: "C",
        startAt: START,
        routeId: ROUTE,
        laps: 1,
        entrants: [{ zwiftId: "4", name: "Snelle [ZWB]" }],
        results: [{ profileId: 4, rank: 7, durationMs: 2_300_000 }],
        resultsOk: true,
      },
    ],
    passages: [
      passage(1, SPRINT, 200_000, 15, 400),
      passage(3, SPRINT, 199_000, 14),
      passage(1, KOM, 700_000, 280, 300),
      passage(3, KOM, 690_000, 262),
      passage(2, KOM, 720_000, 300),
    ],
    segmentsOk: true,
    withPower: true,
  };
}

const NAMES = new Map([
  [1, "Stijn"],
  [2, "Clubgenoot"],
  [4, "Snelle"],
]);

describe("analysePersonalRace", () => {
  it("geeft plek, tijd en achterstand in de eigen startgroep", () => {
    const r = analysePersonalRace(race(), 1, NAMES, "race")!;
    expect(r.subgroupLabel).toBe("D");
    expect(r.rider.name).toBe("Stijn");
    expect(r.rider.rank).toBe(2);
    expect(r.finishers).toBe(3);
    expect(r.gapToWinner).toBe(30_000);
    expect(r.rider.wkg).toBe(3);
  });

  it("rekent per segment het verlies op de snelste van de groep", () => {
    const r = analysePersonalRace(race(), 1, NAMES, "race")!;
    const kom = r.segmentLoss.find((s) => s.name === "Zwift KOM Reverse");
    expect(kom).toMatchObject({ kind: "klim", elapsed: 280, fastest: 262, loss: 18 });
    expect(r.segmentLoss.find((s) => s.kind === "sprint")?.loss).toBe(1);
  });

  it("zet de ZWB'ers in alle groepen erbij, zonder onbekenden", () => {
    const r = analysePersonalRace(race(), 1, NAMES, "race")!;
    expect(r.peers.map((p) => `${p.subgroupLabel}:${p.name}:${p.rank}/${p.of}`)).toEqual(["C:Snelle:7/1", "D:Stijn:2/3", "D:Clubgenoot:3/3"]);
    expect(r.peers.find((p) => p.own)?.zwiftId).toBe(1);
  });

  it("geeft null als de renner niet in de uitslag staat", () => {
    expect(analysePersonalRace(race(), 99, NAMES, "race")).toBeNull();
  });
});

describe("raceKindOf", () => {
  it("leest het soort race uit Zwift, anders uit de titel", () => {
    expect(raceKindOf("TIME_TRIAL")).toBe("tt");
    expect(raceKindOf("TEAM_TIME_TRIAL")).toBe("ttt");
    expect(raceKindOf("RACE")).toBe("race");
    expect(raceKindOf(null, "FRR Ignite · Etappe 6 · iTT · 15:00")).toBe("tt");
  });
});

describe("minimizeRaceData", () => {
  it("houdt van onbekenden alleen plek, tijd en segmenttijden", () => {
    const small = minimizeRaceData(race(), new Set([1, 2, 4]));
    const d = small.subgroups[0];
    expect(d.entrants.find((e) => e.zwiftId === "3")?.name).toBe("");
    expect(d.entrants.find((e) => e.zwiftId === "2")?.name).toBe("Clubgenoot [ZWB]");
    expect(d.results.find((r) => r.profileId === 3)).toEqual({ profileId: 3, rank: 1, durationMs: 2_500_000 });
    expect(d.results.find((r) => r.profileId === 1)?.avgWatts).toBe(240);
    const unknownPassage = small.passages.find((p) => p.athleteId === 3)!;
    expect(Object.keys(unknownPassage).sort()).toEqual(["athleteId", "elapsed", "id", "segmentId", "ts"]);
    expect(small.passages.find((p) => p.athleteId === 1 && p.segmentId === KOM)?.avgPower).toBe(300);
  });

  it("laat de analyse van de eigen race gelijk", () => {
    const full = analysePersonalRace(race(), 1, NAMES, "race")!;
    const small = analysePersonalRace(minimizeRaceData(race(), new Set([1, 2, 4])), 1, NAMES, "race")!;
    expect(small.rider).toEqual(full.rider);
    expect(small.segmentLoss).toEqual(full.segmentLoss);
    expect(small.gapToWinner).toBe(full.gapToWinner);
  });
});

describe("zwiftEventIdFromInput", () => {
  it("haalt het ID uit een link of een los nummer", () => {
    expect(zwiftEventIdFromInput("https://www.zwift.com/events/view/5737449")).toBe("5737449");
    expect(zwiftEventIdFromInput("https://www.zwift.com/nl/events/view/5737449?eventSubgroupId=7397405")).toBe("5737449");
    expect(zwiftEventIdFromInput("https://zwiftpower.com/events.php?zid=1&eventId=5737449")).toBe("5737449");
    expect(zwiftEventIdFromInput(" 5737449 ")).toBe("5737449");
    expect(zwiftEventIdFromInput("https://example.com/")).toBeNull();
    expect(zwiftEventIdFromInput("123")).toBeNull();
  });
});

function ride(overrides: Partial<RideAnalysis> = {}): RideAnalysis {
  return {
    offset: 0,
    alignError: 0,
    missingStart: 0,
    avgWatts: 250,
    np: 255,
    intensity: 0.93,
    variability: 1.02,
    kilojoules: 600,
    avgHeartRate: 165,
    maxHeartRate: 180,
    cadence: 88,
    phases: [],
    best: [],
    cp: null,
    wbalMin: null,
    drift: null,
    halves: { first: 270, second: 240 },
    cadenceAboveFtp: [],
    series: [],
    ...overrides,
  };
}

describe("personalAdvice", () => {
  it("ziet in een tijdrit wegzakken", () => {
    const r = analysePersonalRace(race(), 1, NAMES, "tt")!;
    const tips = personalAdvice(r, ride(), 274);
    expect(tips[0].finding).toBe("Eerste helft 270 W, tweede helft 240 W: je zakte 11% weg.");
    // Tijdverlies op de snelste is geen tip meer: dat zegt niets over je eigen verdeling.
    expect(tips).toHaveLength(1);
  });

  it("voegt wegzakken bij een te harde start samen tot één tip", () => {
    const r = analysePersonalRace(race(), 1, NAMES, "tt")!;
    const start = ride({
      best: [{ seconds: 600, watts: 300, at: 0, season: 310, share: 97 }],
      phases: [
        { name: "Vlak 1", climb: false, from: 0, to: 400, avgWatts: 300, np: 300, intensity: 1.09, avgHeartRate: 170, maxHeartRate: 175, cadence: 90, wbalMin: 30, wbalEnd: 30, wbalStart: 100, halves: null, emptyBeforeEnd: null, recoveryAfter: null, seasonBest: null },
        { name: "KOM 1", climb: true, from: 400, to: 530, avgWatts: 340, np: 344, intensity: 1.25, avgHeartRate: 180, maxHeartRate: 185, cadence: 80, wbalMin: 0, wbalEnd: 0, wbalStart: 28, halves: null, emptyBeforeEnd: 50, recoveryAfter: null, seasonBest: 395 },
      ],
    });
    const tips = personalAdvice(r, start, 274);
    expect(tips).toHaveLength(1);
    expect(tips[0].finding).toBe("Je begon op 109% van je FTP (300 W over de eerste 10 minuten) en kwam met 28% W′ aan de voet van KOM 1. In de tweede helft zakte je 11% weg (270 → 240 W).");
  });

  it("noemt in een tijdrit een sterkere tweede helft", () => {
    const r = analysePersonalRace(race(), 1, NAMES, "tt")!;
    const tips = personalAdvice(r, ride({ halves: { first: 240, second: 260 } }), 274);
    expect(tips[0].tip).toBe("Er zat meer in de eerste helft; begin iets harder.");
  });

  it("wijst in een race naar het beste segment, zonder punten of ploeg", () => {
    const r = analysePersonalRace(race(), 1, NAMES, "race")!;
    const tips = personalAdvice(r, null, 274);
    // Relatief het beste: 2e van 3 op de klim gaat voor 2e van 2 op de sprint.
    expect(tips[0].finding).toBe("Je beste segment was Zwift KOM Reverse: 2e van 3 op 3,75 W/kg.");
    expect(tips[0].tip).toBe("Daar ben je sterk: zit voor een klim vooraan in de groep.");
  });

  it("geeft in een race geen reserve-tip en geen ploegwoorden", () => {
    const r = analysePersonalRace(race(), 1, NAMES, "race")!;
    const tips = personalAdvice(r, ride({ best: [{ seconds: 2400, watts: 200, at: 0, season: 270, share: 74 }] }), 274);
    const text = tips.map((t) => t.tip).join(" ");
    expect(text).not.toMatch(/ploeg|beurt|reserve|meer in/);
  });
});
