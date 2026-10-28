import { describe, expect, it } from "vitest";
import { buildCheatsheet, TTT_RULES } from "@/lib/ttt/lessons";
import { planCompositionAdvice, type PlanRider } from "@/lib/zrl-analysis/advice";
import type { TttRaceRecord } from "@/lib/zrl-analysis/load";
import type { RaceAnalysis, RiderAnalysis, RiderSegment } from "@/lib/zrl-analysis/race";

function seg(index: number, name: string, elapsed: number, watts: number): RiderSegment {
  return { index, segmentId: `s${index}`, name, kind: /kom/i.test(name) ? "klim" : "sprint", elapsed, watts, wkg: watts / 80, rank: 1, of: 30, falRank: 1, falPoints: 0, ftsPoints: 0 };
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
    pointsSplit: null,
    expected: null,
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
    expectedTeamPoints: null,
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
  it("toont alleen races van het team waarvoor gepland wordt, met winst en verlies per stuk", () => {
    const records = [record(), record({ eventId: "ev-2", teamId: "b1", teamName: "B1" })];
    const sheet = buildCheatsheet({ records, teamIds: ["bdev"], riders: [] });
    expect(sheet.rules).toBe(TTT_RULES);
    expect(sheet.races.map((r) => r.eventId)).toEqual(["ev-1"]);
    const race = sheet.races[0];
    expect(race).toMatchObject({ rank: 1, of: 2, time: 2_598_700, rival: { label: "OTR", deltaMs: 18_100 }, spreadMs: 700 });
    expect(race.sections).toEqual([
      { name: "Sprint", deltaMs: 3000 },
      { name: "KOM 1", deltaMs: -900 },
      { name: "Sprint", deltaMs: -5300 },
      { name: "KOM 2", deltaMs: 16000 },
    ]);
    expect(race.tips).toContain("vlak: snellere wissels, beurten die iedereen volhoudt");
  });

  it("laat lessen over één renner bij de race weg", () => {
    const race = buildCheatsheet({ records: [record()], teamIds: ["bdev"], riders: [] }).races[0];
    expect(race.tips.some((tip) => tip.includes("Jeroen"))).toBe(false);
  });

  it("geeft per renner de eerdere ritten, ook bij een ander team", () => {
    const records = [record({ teamId: "b2", teamName: "B2" })];
    const sheet = buildCheatsheet({ records, teamIds: ["bdev"], riders: [{ zwiftId: 4, name: "Stijn", ftp: 274, pullWatts: null, pullSeconds: null }] });
    expect(sheet.races).toEqual([]);
    expect(sheet.riders).toHaveLength(1);
    expect(sheet.riders[0].rides).toEqual([
      {
        eventId: "ev-1",
        startAt: "2026-10-13T18:00:00Z",
        teamId: "b2",
        teamName: "B2",
        wkg: 3.2,
        dropped: null,
        climbs: [
          { name: "KOM 1", wkg: 285 / 80 },
          { name: "KOM 2", wkg: 324 / 80 },
        ],
      },
    ]);
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
    const jeroen = heavy.riders[0];
    expect(jeroen.rides[0]).toMatchObject({ dropped: "KOM 2", climbs: [] });
    expect(jeroen.flags).toEqual([
      { tone: "warn", label: "Loste op KOM 2", tip: "Korte beurten in het halfuur voor de laatste klim" },
      { tone: "warn", label: "Plan: 349 W · 60 s · 111%", tip: "Korter of lichter maken" },
      { tone: "note", label: "Zwaarst op KOM 1: 330 W", tip: "Geen lange beurt vlak voor een klim" },
    ]);

    const light = buildCheatsheet({ records: [record()], teamIds: ["bdev"], riders: [{ zwiftId: 5, name: "Jeroen", ftp: 314, pullWatts: 330, pullSeconds: 30 }] });
    expect(light.riders[0].flags.map((f) => f.label)).not.toContain("Plan: 330 W · 30 s · 105%");
    expect(light.riders[0].flags).toHaveLength(2);
  });

  it("noemt wie op de grens reed en toch bij de ploeg bleef", () => {
    const sheet = buildCheatsheet({ records: [record()], teamIds: ["bdev"], riders: [{ zwiftId: 1, name: "Koen", ftp: 280, pullWatts: null, pullSeconds: null }] });
    // Het plan van toen (FTP 273) telt, niet de FTP van nu.
    expect(sheet.riders[0].flags).toContainEqual({ tone: "limit", label: "Grens: 99% FTP", tip: expect.stringMatching(/^Niet zwaarder plannen dan 13 okt\.?$/) });
  });

  it("geeft de opbouw van het plan, en herhaalt die niet bij de race", () => {
    const riders = record().plan.map((p) => ({ ...p, pullWatts: 260 }));
    const sheet = buildCheatsheet({ records: [record({ plan: riders })], teamIds: ["bdev"], riders });
    expect(sheet.plan?.avgFtp).toBeCloseTo(273.2);
    expect(sheet.plan?.pullShare).toBeCloseTo(260 / 273.2);
    const lowTip = planCompositionAdvice(riders).find((a) => a.finding.startsWith("De kopbeurten"))?.tip;
    expect(lowTip).toBeDefined();
    expect(sheet.races[0].tips).not.toContain(lowTip);
  });

  it("heeft zonder FTP's geen plancheck", () => {
    const sheet = buildCheatsheet({ records: [], teamIds: ["bdev"], riders: [{ zwiftId: 1, name: "Koen", ftp: null, pullWatts: null, pullSeconds: null }] });
    expect(sheet.plan).toBeNull();
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

  it("laat kopbeurten tussen 100 en 120% met rust", () => {
    expect(planCompositionAdvice(plan([270, 270, 270, 270], [300, 30]))).toEqual([]);
  });
});
