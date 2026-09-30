import { describe, expect, it } from "vitest";
import {
  matchColClimb,
  matchSegmentLine,
  passages,
  type LatLon,
  type TimedPoint,
} from "@/lib/segments/gps-efforts";

const START = Date.parse("2025-06-01T08:00:00Z");
const M_PER_DEG_LAT = 110_540;

/** Recht naar het noorden, 10 m/s, een punt per `step` seconden. */
function northbound(fromLat: number, seconds: number, step = 1, lon = 5, t0 = START): TimedPoint[] {
  const points: TimedPoint[] = [];
  for (let s = 0; s <= seconds; s += step) {
    points.push({ lat: fromLat + (s * 10) / M_PER_DEG_LAT, lon, t: t0 + s * 1000 });
  }
  return points;
}

function latAfter(fromLat: number, meters: number) {
  return fromLat + meters / M_PER_DEG_LAT;
}

describe("passages", () => {
  it("interpoleert het moment van dichtste nadering tussen twee punten", () => {
    const points = northbound(50, 100, 10);
    const [visit] = passages(points, [latAfter(50, 255), 5], 30);
    expect((visit.t - START) / 1000).toBeCloseTo(25.5, 1);
  });
});

describe("matchSegmentLine", () => {
  const line: LatLon[] = [
    [latAfter(50, 200), 5],
    [latAfter(50, 600), 5],
    [latAfter(50, 1200), 5],
  ];

  it("meet één poging over de lengte van het segment", () => {
    const efforts = matchSegmentLine(northbound(50, 200), line);
    expect(efforts).toHaveLength(1);
    expect(efforts[0].seconds).toBe(100);
    expect(efforts[0].startMs).toBe(START + 20_000);
  });

  it("werkt ook bij slimme opname met gaten van vijf seconden", () => {
    const efforts = matchSegmentLine(northbound(50, 200, 5), line);
    expect(efforts.map((e) => e.seconds)).toEqual([100]);
  });

  it("telt de verkeerde richting niet", () => {
    const southbound = northbound(50, 200).map((p, i, all) => ({ ...p, t: all[all.length - 1 - i].t })).reverse();
    expect(matchSegmentLine(southbound, line)).toEqual([]);
  });

  it("telt een rit die het segment niet volgt niet", () => {
    // Begin en eind worden geraakt, maar ertussen 300 m naar het oosten.
    const points = northbound(50, 200).map((p) => {
      const meters = (p.lat - 50) * M_PER_DEG_LAT;
      return meters > 400 && meters < 1000 ? { ...p, lon: 5.005 } : p;
    });
    expect(matchSegmentLine(points, line)).toEqual([]);
  });

  it("geeft twee pogingen als het segment twee keer gereden wordt", () => {
    const first = northbound(50, 150);
    const back = northbound(50, 150, 1, 5, START + 200_000).reverse().map((p, i) => ({ ...p, t: START + 160_000 + i * 1000 }));
    const second = northbound(50, 150, 1, 5, START + 400_000);
    const efforts = matchSegmentLine([...first, ...back, ...second], line);
    expect(efforts.map((e) => e.seconds)).toEqual([100, 100]);
  });

  it("negeert een rit ergens anders", () => {
    expect(matchSegmentLine(northbound(51, 200), line)).toEqual([]);
  });
});

describe("matchColClimb", () => {
  const start: LatLon = [latAfter(50, 100), 5.001];
  const summit: LatLon = [latAfter(50, 1900), 5];

  it("meet van de doorkomst bij het startpunt tot de top", () => {
    const efforts = matchColClimb(northbound(50, 250), start, summit, 100);
    expect(efforts.map((e) => e.seconds)).toEqual([180]);
  });

  it("telt niet als je langs de start komt en via een andere kant boven bent", () => {
    // Langs de start, 15 km naar het westen, 3 km noord, terug naar het oosten en
    // van boven af naar de top.
    const toStart = northbound(50, 20);
    const points = [...toStart];
    const leg = (dLat: number, dLon: number, seconds: number) => {
      const from = points[points.length - 1];
      for (let s = 1; s <= seconds; s++) {
        points.push({ lat: from.lat + (dLat * s) / seconds, lon: from.lon + (dLon * s) / seconds, t: from.t + s * 1000 });
      }
    };
    leg(0, -0.21, 1500);
    leg(latAfter(0, 2200), 0, 220);
    leg(0, 0.21, 1500);
    leg(latAfter(0, -520), 0, 52);
    expect(passages(points, summit, 100)).toHaveLength(1);
    expect(matchColClimb(points, start, summit, 100)).toEqual([]);
  });
});
