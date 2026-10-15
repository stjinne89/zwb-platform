import { describe, expect, it } from "vitest";
import { buildCheatsheet, TTT_RULES } from "@/lib/ttt/lessons";
import { planCompositionAdvice, type PlanRider } from "@/lib/zrl-analysis/advice";
import type { TttRaceRecord } from "@/lib/zrl-analysis/load";
import type { RaceAnalysis, RiderAnalysis, RiderSegment } from "@/lib/zrl-analysis/race";

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

/** Bdev op 13 oktober in het klein: Jeroen reed KOM 1 het zwaarst en loste op KOM 2. */
function analysis(): RaceAnalysis {
  const own = { team: "zwb", rank: 1, time: 2_598_700, label: "Bdev" };
  const otr = { team: "otr", rank: 2, time: 2_616_800, label: "OTR" };
  return {
    format: "ttt",
    subgroupLabel: "B",
    final: true,
    team: own as unknown as RaceAnalysis["team"],
    teams: [
      { ...own, own: true },
      { ...otr, own: false },
    ] as unknown as RaceAnalysis["teams"],
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
      rider(1, "Koen", [266, 302], [154, 320], { avgWatts: 270 }),
      rider(2, "Marc", [266, 273], [154, 296]),
      rider(3, "Wouter", [266, 261], [154, 294]),
      rider(4, "Stijn", [266, 285], [154, 324]),
      rider(5, "Jeroen", [266, 330], [422, 123], { dropped: true, time: 3_216_000 }),
    ],
  };
}

const record = (extra: Partial<TttRaceRecord> = {}): TttRaceRecord => ({
  eventId: "ev-1",
  title: "ZRL TTT",
  startAt: "2026-10-13T18:00:00Z",
  teamId: "bdev",
  teamName: "Bdev",
  analysis: analysis(),
  plan: [
    { zwiftId: 1, name: "Koen", ftp: 273, pullWatts: 317, pullSeconds: 30 },
    { zwiftId: 2, name: "Marc", ftp: 259, pullWatts: 295, pullSeconds: 30 },
    { zwiftId: 3, name: "Wouter", ftp: 246, pullWatts: 289, pullSeconds: 30 },
    { zwiftId: 4, name: "Stijn", ftp: 274, pullWatts: 327, pullSeconds: 30 },
    { zwiftId: 5, name: "Jeroen", ftp: 314, pullWatts: 349, pullSeconds: 60 },
  ],
  ...extra,
});

describe("buildCheatsheet", () => {
  it("toont alleen races van het team waarvoor gepland wordt", () => {
    const records = [record(), record({ eventId: "ev-2", teamId: "b1", teamName: "B1" })];
    const sheet = buildCheatsheet({ records, teamIds: ["bdev"], riders: [] });
    expect(sheet.rules).toBe(TTT_RULES);
    expect(sheet.races.map((r) => r.eventId)).toEqual(["ev-1"]);
    expect(sheet.races[0].result).toBe("1e van 2 · 43:18,7 · +18,1 s op OTR");
    expect(sheet.races[0].facts).toEqual(["Meeste winst op het stuk naar KOM 2: +16,0 s.","De vier snelsten binnen 0,7 s."]);
    expect(sheet.races[0].lessons.map((l) => l.finding)).toContain("Op het vlakke stuk naar Sprint verloor de ploeg 5,3 s op OTR.");
  });

  it("geeft per renner de eerdere ritten, ook bij een ander team", () => {
    const records = [record({ teamId: "b2", teamName: "B2" })];
    const sheet = buildCheatsheet({ records, teamIds: ["bdev"], riders: [{ zwiftId: 4, name: "Stijn", ftp: 274, pullWatts: null, pullSeconds: null }] });
    expect(sheet.races).toEqual([]);
    expect(sheet.riders).toHaveLength(1);
    expect(sheet.riders[0].history[0]).toMatch(/^13 okt\.?, B2 · gemiddeld 3,20 W\/kg · KOM 1 3,56 W\/kg, KOM 2 4,05 W\/kg$/);
  });

  it("slaat renners zonder Zwift-ID of zonder eerdere ploegentijdrit over", () => {
    const sheet = buildCheatsheet({
      records: [record()],
      teamIds: ["bdev"],
      riders: [
        { zwiftId: null, name: "Nieuw", ftp: 250, pullWatts: null, pullSeconds: null },
        { zwiftId: 99, name: "Gast", ftp: 250, pullWatts: null, pullSeconds: null },
      ],
    });
    expect(sheet.riders).toEqual([]);
  });

  it("waarschuwt als een renner die loste weer een lange zware kopbeurt krijgt", () => {
    const heavy = buildCheatsheet({ records: [record()], teamIds: ["bdev"], riders: [{ zwiftId: 5, name: "Jeroen", ftp: 314, pullWatts: 349, pullSeconds: 60 }] });
    const drop = heavy.riders[0].lessons[0];
    expect(drop.finding).toMatch(/^Jeroen loste 13 okt\.? op KOM 2\. Dit plan vraagt weer 349 W gedurende 60 s \(111% van de eigen FTP\)\.$/);
    expect(drop.tip).toContain("Korte beurten voor Jeroen");
    expect(heavy.riders[0].lessons[1].finding).toContain("op KOM 1 het meeste vermogen van de ploeg nodig: 330 W");

    const light = buildCheatsheet({ records: [record()], teamIds: ["bdev"], riders: [{ zwiftId: 5, name: "Jeroen", ftp: 314, pullWatts: 330, pullSeconds: 30 }] });
    expect(light.riders[0].lessons[0].finding).not.toContain("Dit plan vraagt");
  });

  it("noemt wie op de grens reed en toch bij de ploeg bleef", () => {
    const sheet = buildCheatsheet({ records: [record()], teamIds: ["bdev"], riders: [{ zwiftId: 1, name: "Koen", ftp: 280, pullWatts: null, pullSeconds: null }] });
    // Het plan van toen (FTP 273) telt, niet de FTP van nu.
    expect(sheet.riders[0].lessons.map((l) => l.finding)).toContainEqual(expect.stringMatching(/^Koen reed 13 okt\.? gemiddeld 99% van de eigen FTP en bleef bij de ploeg\.$/));
  });

  it("herhaalt een plantip niet bij de race", () => {
    const riders = record().plan.map((p) => ({ ...p, pullWatts: 290 }));
    const sheet = buildCheatsheet({ records: [record({ plan: riders })], teamIds: ["bdev"], riders });
    const finding = "De kopbeurten in het plan lagen op 106% van de gemiddelde FTP.";
    expect(sheet.plan.map((a) => a.finding)).toContain(finding);
    expect(sheet.races[0].lessons.map((a) => a.finding)).not.toContain(finding);
  });
});

describe("planCompositionAdvice", () => {
  const plan = (ftps: number[], pull: [number, number] | null): PlanRider[] =>
    ftps.map((ftp, i) => ({ zwiftId: i + 1, name: `R${i + 1}`, ftp, pullWatts: pull?.[0] ?? null, pullSeconds: pull?.[1] ?? null }));

  it("werkt al vóór de race, met alleen de opstelling", () => {
    expect(planCompositionAdvice(plan([300, 300, 300, 300, 220], [370, 30]))[0].finding).toBe(
      "R5 heeft een FTP 23% onder het teamgemiddelde, maar kreeg kopbeurten van 30 s.",
    );
  });

  it("zegt niets zonder kopbeurten, of met minder dan vier renners met FTP", () => {
    expect(planCompositionAdvice(plan([300, 300, 300, 300, 220], null))).toEqual([]);
    expect(planCompositionAdvice(plan([300, 300, 220], [370, 30]))).toEqual([]);
  });

  it("laat kopbeurten tussen 115 en 140% met rust", () => {
    expect(planCompositionAdvice(plan([270, 270, 270, 270], [335, 30]))).toEqual([]);
  });
});
