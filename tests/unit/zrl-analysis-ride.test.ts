import { describe, expect, it } from "vitest";
import {
  alignRide,
  analyseRide,
  fitCriticalPower,
  normalizedPower,
  ridePhases,
  wPrimeBalance,
  type RideAnchor,
  type RideStreams,
} from "@/lib/zrl-analysis/ride";
import { activityStartMs, pickRaceActivity } from "@/lib/zrl-analysis/activity";

/**
 * Een race van 1200 s: vlak op 200 W, een klim van 300 tot 500 s op 350 W, en
 * vanaf 900 s een sprint van 20 s op 600 W. Hartslag loopt op van 140 naar 170,
 * cadans 90 op het vlak en 70 op de klim. Het bestand begint 15 s na de start.
 */
function raceStreams(fileLate = 15): RideStreams {
  const time: number[] = [];
  const watts: number[] = [];
  const heartrate: number[] = [];
  const cadence: number[] = [];
  for (let r = fileLate; r <= 1200; r++) {
    const climb = r >= 300 && r < 500;
    const sprint = r >= 900 && r < 920;
    time.push(r - fileLate);
    watts.push(sprint ? 600 : climb ? 350 : 200);
    heartrate.push(Math.round(140 + (30 * r) / 1200));
    cadence.push(climb ? 70 : 90);
  }
  return { time, watts, heartrate, cadence };
}

const ANCHORS: RideAnchor[] = [
  { name: "Zwift KOM", end: 500, elapsed: 200, avgPower: 350, climb: true },
  { name: "Sprint", end: 920, elapsed: 20, avgPower: 600, climb: false },
];

/** Vermogenscurve volgens P = W′/t + CP met CP 280 en W′ 15 kJ. */
const CURVE = [60, 120, 180, 240, 300, 600, 900, 1200, 2400].map((seconds) => ({ seconds, watts: Math.round(15000 / seconds + 280) }));

describe("alignRide", () => {
  it("vindt de verschuiving aan de hand van Zwifts passages", () => {
    // Bestandsstart volgens de klok 40 s te vroeg: de passages trekken het recht.
    expect(alignRide(raceStreams(), -25, 1200, ANCHORS)).toEqual({ offset: 15, error: 0 });
  });

  it("valt zonder passages met vermogen terug op de bestandsstart", () => {
    const bare = ANCHORS.map((a) => ({ ...a, avgPower: null }));
    expect(alignRide(raceStreams(), 12, 1200, bare)).toEqual({ offset: 12, error: null });
  });
});

describe("normalizedPower", () => {
  it("is het gemiddelde bij constant vermogen en hoger bij wisselend", () => {
    expect(normalizedPower(new Array(600).fill(250))).toBe(250);
    const blocks = Array.from({ length: 600 }, (_, i) => (Math.floor(i / 60) % 2 ? 350 : 150));
    expect(normalizedPower(blocks)).toBeGreaterThan(250);
  });
});

describe("fitCriticalPower en wPrimeBalance", () => {
  it("haalt CP en W′ terug uit een curve volgens het model", () => {
    const fit = fitCriticalPower(CURVE);
    expect(fit?.cp).toBeCloseTo(280, -1);
    expect(fit?.wPrime).toBeGreaterThan(14000);
    expect(fit?.wPrime).toBeLessThan(16000);
  });

  it("weigert een te dunne curve", () => {
    expect(fitCriticalPower([{ seconds: 300, watts: 300 }])).toBeNull();
  });

  it("loopt leeg boven CP en herstelt eronder", () => {
    const balance = wPrimeBalance([...new Array(100).fill(330), ...new Array(300).fill(150)], 280, 15000);
    expect(balance[99]).toBe(10000);
    expect(balance[399]).toBeGreaterThan(14000);
    expect(balance[399]).toBeLessThan(15000);
  });
});

describe("ridePhases", () => {
  it("deelt de race op in vlak en klimmen", () => {
    expect(ridePhases(ANCHORS, 1200)).toEqual([
      { name: "Vlak 1", climb: false, from: 0, to: 300 },
      { name: "Zwift KOM", climb: true, from: 300, to: 500 },
      { name: "Vlak 2", climb: false, from: 500, to: 1200 },
    ]);
  });
});

describe("analyseRide", () => {
  const ride = analyseRide({ streams: raceStreams(), startOffset: 14, finish: 1200, anchors: ANCHORS, ftp: 250, curve: CURVE });

  it("lijnt uit en meldt wat er aan het begin ontbreekt", () => {
    expect(ride.offset).toBe(15);
    expect(ride.alignError).toBe(0);
    expect(ride.missingStart).toBe(15);
  });

  it("rekent per stuk vermogen, intensiteit en cadans", () => {
    const [flat1, climb, flat2] = ride.phases;
    expect(flat1).toMatchObject({ avgWatts: 200, cadence: 90 });
    expect(climb).toMatchObject({ name: "Zwift KOM", avgWatts: 350, np: 350, intensity: 1.4, cadence: 70 });
    expect(flat2.avgWatts).toBeGreaterThan(200);
    expect(ride.intensity).toBe(Math.round((100 * ride.np) / 250) / 100);
  });

  it("vergelijkt het beste vermogen met de curve en vindt de laagste W′", () => {
    const threeMin = ride.best.find((b) => b.seconds === 180);
    expect(threeMin?.watts).toBe(350);
    expect(threeMin?.share).toBe(Math.round((100 * 350) / CURVE.find((p) => p.seconds === 180)!.watts));
    expect(ride.best.find((b) => b.seconds === 2400)).toBeUndefined();
    expect(ride.wbalMin?.at).toBeGreaterThanOrEqual(495);
    expect(ride.wbalMin?.at).toBeLessThanOrEqual(500);
    expect(ride.wbalMin?.share).toBeLessThan(80);
  });

  it("ziet de hartslag oplopen bij gelijk vermogen", () => {
    expect(ride.drift?.change).toBeLessThan(0);
  });

  it("telt de cadans boven de FTP per vak van 10", () => {
    expect(ride.cadenceAboveFtp).toEqual([
      { from: 70, seconds: 200 },
      { from: 90, seconds: 20 },
    ]);
  });

  it("geeft een reeks voor de grafiek, elke 10 s", () => {
    expect(ride.series[0].t).toBe(15);
    expect(ride.series[1].t - ride.series[0].t).toBe(10);
    expect(ride.series.every((p) => p.wbal !== null)).toBe(true);
  });

  it("werkt zonder FTP en zonder curve", () => {
    const bare = analyseRide({ streams: raceStreams(), startOffset: 15, finish: 1200, anchors: ANCHORS, ftp: null, curve: [] });
    expect(bare.intensity).toBeNull();
    expect(bare.cp).toBeNull();
    expect(bare.wbalMin).toBeNull();
    expect(bare.cadenceAboveFtp).toEqual([]);
    expect(bare.best.every((b) => b.share === null)).toBe(true);
  });
});

describe("activiteit bij de race", () => {
  const start = Date.parse("2026-10-13T18:07:00Z");

  it("leest start_date als UTC en anders de lokale tijd als Amsterdam", () => {
    expect(activityStartMs({ id: "i1", start_date: "2026-10-13T18:07:14Z" })).toBe(Date.parse("2026-10-13T18:07:14Z"));
    // Zomertijd: 20:07:14 in Amsterdam is 18:07:14 UTC.
    expect(activityStartMs({ id: "i1", start_date_local: "2026-10-13T20:07:14" })).toBe(Date.parse("2026-10-13T18:07:14Z"));
    // Wintertijd: 20:07 is 19:07 UTC.
    expect(activityStartMs({ id: "i1", start_date_local: "2026-11-10T20:07:00" })).toBe(Date.parse("2026-11-10T19:07:00Z"));
  });

  it("kiest de fietsrit die het dichtst bij de start begon", () => {
    const pick = pickRaceActivity(
      [
        { id: "i1", type: "VirtualRide", start_date_local: "2026-10-13T19:45:36" },
        { id: "i2", type: "VirtualRide", start_date_local: "2026-10-13T20:07:14" },
        { id: "i3", type: "Run", start_date_local: "2026-10-13T20:07:00" },
        { id: "i4", type: "Ride", start_date_local: "2026-10-13T22:30:00" },
      ],
      start,
    );
    expect(pick?.id).toBe("i2");
    expect(pickRaceActivity([{ id: "i4", type: "Ride", start_date_local: "2026-10-13T22:30:00" }], start)).toBeNull();
  });
});
