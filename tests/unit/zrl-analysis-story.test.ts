import { describe, expect, it } from "vitest";
import { analyseRide, type RideStreams } from "@/lib/zrl-analysis/ride";
import { efforts, finishGroups, terrainClimbs, wbalAccount } from "@/lib/zrl-analysis/ride-story";
import { climbHistory, rideContext } from "@/lib/zrl-analysis/ride-context";
import { storyAdvice } from "@/lib/zrl-analysis/advice";
import { zrsTrend, type RaceRecord } from "@/lib/zrl-analysis/history";

/**
 * Een race van 1200 s zonder Zwift-segmenten: vlak, dan van 300 tot 500 s een
 * klim van 60 m over 1600 m (3,75%) op 360 W, dan een afdaling van 60 m, vlak,
 * en een eindsprint van 30 s op 600 W. Snelheid 10 m/s, op de klim 8 m/s.
 */
function hillyStreams(): RideStreams {
  const time: number[] = [];
  const watts: number[] = [];
  const altitude: number[] = [];
  const distance: number[] = [];
  const cadence: number[] = [];
  const heartrate: number[] = [];
  let d = 0;
  for (let t = 0; t <= 1200; t++) {
    const climb = t >= 300 && t < 500;
    const descent = t >= 500 && t < 620;
    const sprint = t >= 1170;
    d += climb ? 8 : 10;
    time.push(t);
    distance.push(d);
    altitude.push(climb ? 10 + (t - 300) * 0.3 : descent ? 70 - (t - 500) * 0.5 : 10);
    watts.push(sprint ? 600 : climb ? 360 : descent ? 120 : 230);
    cadence.push(climb ? 65 : 90);
    heartrate.push(150 + Math.round(t / 60));
  }
  return { time, watts, altitude, distance, cadence, heartrate };
}

const CURVE = [180, 300, 600, 1200].map((seconds) => ({ seconds, watts: Math.round(15000 / seconds + 280), activityId: "i9" as string | null }));

describe("klimmen uit het hoogteprofiel", () => {
  it("vindt de klim en geeft hoogte, afstand en percentage", () => {
    const s = hillyStreams();
    const climbs = terrainClimbs(s.altitude!, s.distance!);
    expect(climbs).toHaveLength(1);
    expect(climbs[0].from).toBeGreaterThanOrEqual(285);
    expect(climbs[0].from).toBeLessThanOrEqual(310);
    expect(climbs[0].gain).toBeGreaterThanOrEqual(50);
  });

  it("zonder hoogte geen klimmen", () => {
    expect(terrainClimbs([], [])).toEqual([]);
  });
});

describe("analyseRide met hoogte en het model van intervals.icu", () => {
  const ride = analyseRide({
    streams: hillyStreams(),
    startOffset: 0,
    finish: 1200,
    anchors: [],
    ftp: 250,
    curve: CURVE,
    model: { cp: 290, wPrime: 20000 },
    weightKg: 80,
    lthr: 165,
    activityId: "i9",
  });

  it("maakt stukken uit het hoogteprofiel: vlak, klim, afdaling, vlak", () => {
    expect(ride.terrain).toBe(true);
    expect(ride.phases.map((p) => p.name)).toEqual(["Vlak 1", "Klim 1", "Afdaling 1", "Vlak 2"]);
    const climb = ride.phases[1];
    expect(climb.grade).toBeGreaterThan(3);
    expect(climb.wkg).toBeCloseTo(4.5, 1);
    expect(climb.vam).toBeGreaterThan(900);
    expect(climb.startKm).toBeGreaterThan(2.9);
  });

  it("rekent W′ met het gegeven model en houdt het curvemodel ter vergelijking", () => {
    expect(ride.cp).toEqual({ cp: 290, wPrime: 20000, source: "intervals" });
    expect(ride.curveModel?.cp).toBeCloseTo(280, -1);
    expect(ride.wbal?.below25).toBeGreaterThanOrEqual(0);
    expect(ride.wbal?.finale?.at).toBe(900);
  });

  it("ziet een nieuw best als het punt van de curve uit deze rit komt", () => {
    const withCurve = ride.best.filter((b) => b.season !== null);
    expect(withCurve.length).toBeGreaterThan(0);
    expect(withCurve.every((b) => b.isNew)).toBe(true);
  });

  it("telt de eindsprint als versnelling en de klimmeters per helft", () => {
    expect(ride.efforts?.threshold).toBe(375);
    expect(ride.efforts?.list.at(-1)).toMatchObject({ from: 1170, seconds: 31, watts: 600 });
    expect(ride.climbing!.first).toBeGreaterThan(ride.climbing!.second);
  });

  it("telt zwaar trappen op lage cadans", () => {
    // De klim: 360 W op 65 rpm, boven 120% van 250 W.
    expect(ride.cadenceStats.grinding).toBe(200);
  });

  it("tekent de hoogte mee in de reeks", () => {
    expect(ride.series.some((p) => p.altitude !== null && p.altitude > 50)).toBe(true);
  });
});

describe("W′-rekening en versnellingen", () => {
  it("vindt een dip met de minuut ervoor en het herstel", () => {
    const shares = [...new Array(100).fill(100), ...Array.from({ length: 40 }, (_, i) => 100 - i * 3), ...Array.from({ length: 60 }, (_, i) => -17 + i * 2)];
    const watts = shares.map((_, i) => (i >= 100 && i < 140 ? 500 : 200));
    const account = wbalAccount(shares, watts, 0);
    expect(account.dips).toHaveLength(1);
    expect(account.dips[0].low).toBe(-17);
    // Laagste punt op 139 (ook −17), weer op 50% op 174.
    expect(account.dips[0].recovery).toBe(35);
    expect(account.below0).toBeGreaterThan(0);
  });

  it("voegt gaatjes van een of twee seconden samen", () => {
    const watts = [...new Array(10).fill(200), 500, 500, 500, 200, 500, 500, 500, 500, ...new Array(10).fill(200)];
    expect(efforts(watts, 400)).toEqual([{ from: 10, seconds: 8, watts: 463 }]);
  });
});

const RESULTS = [
  ...Array.from({ length: 5 }, (_, i) => ({ profileId: 100 + i, rank: i + 1, durationMs: 2_000_000 + i * 500 })),
  ...Array.from({ length: 3 }, (_, i) => ({ profileId: 200 + i, rank: 6 + i, durationMs: 2_030_000 + i * 500 })),
  { profileId: 300, rank: 9, durationMs: 2_060_000 },
  ...Array.from({ length: 4 }, (_, i) => ({ profileId: i === 1 ? 1 : 400 + i, rank: 10 + i, durationMs: 2_063_000 + i * 400 })),
];

describe("groepjes aan de finish", () => {
  it("houdt renners binnen 2 s bij elkaar", () => {
    const groups = finishGroups(RESULTS, 1);
    expect(groups.map((g) => g.size)).toEqual([5, 3, 1, 4]);
    expect(groups[3]).toMatchObject({ firstRank: 10, lastRank: 13, own: true, behindWinner: 63 });
  });
});

describe("rideContext en de tips uit het verhaal", () => {
  const ride = analyseRide({ streams: hillyStreams(), startOffset: 0, finish: 1200, anchors: [], ftp: 250, curve: CURVE, model: { cp: 290, wPrime: 20000 }, weightKg: 80 });
  const context = rideContext({
    activity: { icu_ftp: 260, icu_rolling_ftp: 270, icu_rolling_ftp_delta: 10, decoupling: 6.3, icu_hrr: { start_bpm: 180, end_bpm: 155, hrr: 25 }, icu_ctl: 60, icu_atl: 75, carbs_used: 90, icu_joules: 400000, compliance: 80 },
    ride,
    profileFtp: 250,
    wellness: [{ id: "2026-11-05", hrv: 60, restingHR: 50, sleepSecs: 27000 }, ...Array.from({ length: 6 }, (_, i) => ({ id: `2026-10-2${i}`, hrv: 50, restingHR: 55 }))],
    raceDay: "2026-11-05",
    planned: { name: "Drempel 2x15" },
    finishSeconds: 1200,
    results: RESULTS,
    ownId: 1,
  });

  it("leest FTP, hart, vorm, planning en brandstof", () => {
    expect(context.ftp).toEqual({ profile: 250, used: 260, after: 270, delta: 10 });
    expect(context.heart.recovery).toEqual({ start: 180, end: 155, drop: 25 });
    expect(context.form).toMatchObject({ tsb: -15, hrv: 60, usualHrv: 50, usualRestingHr: 55, sleepHours: 7.5 });
    expect(context.planned).toMatchObject({ name: "Drempel 2x15", compliance: 80 });
    expect(context.fuel).toMatchObject({ kjRide: 400, carbsUsed: 90, minutes: 20, perHour: null });
  });

  it("neemt als groep voor je de dichtstbijzijnde van minstens drie, niet een losse renner", () => {
    expect(context.finish?.ahead).toMatchObject({ firstRank: 6, lastRank: 8 });
    expect(context.finish?.lead.size).toBe(5);
  });

  it("geeft een FTP-tip vanaf 3% boven je profiel, en een cadanstip", () => {
    const tips = storyAdvice(ride, context, "race");
    expect(tips[0].finding).toContain("270 W");
    expect(tips.some((t) => t.finding.includes("cadans onder 70"))).toBe(true);
  });

  it("geen FTP-tip als de FTP er nauwelijks boven ligt", () => {
    const close = { ...context, ftp: { ...context.ftp, after: 255 } };
    expect(storyAdvice(ride, close, "race").some((t) => t.finding.includes("intervals.icu schat je FTP"))).toBe(false);
  });
});

describe("klimmen tegenover eerdere keren", () => {
  const rows = [
    { zwift_event_id: 1, climb_index: 0, route_id: 9, raced_at: "2026-10-01T18:00:00Z", start_km: 3.1, gain_m: 58, seconds: 230, avg_watts: 340, wkg: 4.25 },
    { zwift_event_id: 2, climb_index: 0, route_id: 9, raced_at: "2026-10-15T18:00:00Z", start_km: 3.0, gain_m: 61, seconds: 215, avg_watts: 352, wkg: 4.4 },
    { zwift_event_id: 3, climb_index: 1, route_id: 9, raced_at: "2026-10-15T18:00:00Z", start_km: 9.0, gain_m: 60, seconds: 200, avg_watts: 300, wkg: 3.75 },
  ];

  it("herkent dezelfde klim aan begin en hoogtemeters, en noemt de vorige en de snelste keer", () => {
    const history = climbHistory([{ name: "Klim 1", startKm: 3.05, gain: 60 }], rows, "99", "2026-11-05T18:00:00Z");
    expect(history).toEqual([
      {
        name: "Klim 1",
        times: 2,
        last: { racedAt: "2026-10-15T18:00:00Z", seconds: 215, wkg: 4.4, avgWatts: 352 },
        best: { racedAt: "2026-10-15T18:00:00Z", seconds: 215, wkg: 4.4, avgWatts: 352 },
      },
    ]);
  });

  it("telt deze race zelf en latere races niet mee", () => {
    expect(climbHistory([{ name: "Klim 1", startKm: 3.05, gain: 60 }], rows, "2", "2026-10-10T18:00:00Z")[0].times).toBe(1);
  });
});

function record(id: string, startAt: number, scoreBefore: number | null): RaceRecord {
  return { zwiftEventId: id, title: `Race ${id}`, startAt, kind: "race", points: false, place: 1, finishers: 10, expectedPlace: null, pointsSplit: null, expectedPoints: null, byKind: null, best15Wkg: null, best60Wkg: null, segments: [], scoreBefore };
}

describe("ZRS over de races", () => {
  it("zet de scores op volgorde en rekent wat deze race deed", () => {
    const trend = zrsTrend(
      [record("a", 1, 400), record("b", 2, 410)],
      [{ zwiftEventId: "d", title: "Race d", startAt: 4, before: 430, after: 432 }],
      { zwiftEventId: "c", title: "Race c", startAt: 3, before: 415 },
    );
    expect(trend?.points.map((p) => p.score)).toEqual([400, 410, 415, 430]);
    expect(trend?.change).toBe(15);
  });

  it("neemt voor de laatste race de score erna uit de historie", () => {
    const trend = zrsTrend([record("a", 1, 400), record("b", 2, 410)], [{ zwiftEventId: "c", title: null, startAt: 3, before: 415, after: 420 }], {
      zwiftEventId: "c",
      title: "Race c",
      startAt: 3,
      before: 415,
    });
    expect(trend?.change).toBe(5);
  });

  it("met minder dan drie scores geen lijn", () => {
    expect(zrsTrend([record("a", 1, 400)], [], { zwiftEventId: "c", title: "c", startAt: 3, before: 415 })).toBeNull();
  });
});
