import { describe, expect, it } from "vitest";
import { haversineKm, pickRoutePoint, raceTotalKm, type RoutePoint } from "@/lib/live/route-progress";

// Een rechte lijn naar het oosten, één punt per ~100 m.
function line(km: number): RoutePoint[] {
  const step = 0.1 / (111.32 * Math.cos((50.85 * Math.PI) / 180));
  return Array.from({ length: Math.round(km * 10) + 1 }, (_, i) => ({ lat: 50.85, lon: 4.7 + i * step }));
}

function cumulative(points: RoutePoint[]) {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1] + haversineKm(points[i - 1], points[i]));
  return out;
}

describe("raceTotalKm", () => {
  it("ziet een GPX van één ronde bij een langere koers", () => {
    expect(raceTotalKm(30.5, 122.26)).toEqual({ totalKm: 122.26, lapRace: true });
  });

  it("houdt de GPX aan als de afstanden kloppen of ontbreken", () => {
    expect(raceTotalKm(120, 122.26)).toEqual({ totalKm: 120, lapRace: false });
    expect(raceTotalKm(30, null)).toEqual({ totalKm: 30, lapRace: false });
  });
});

describe("pickRoutePoint", () => {
  // Heen en terug over dezelfde weg: 10 km heen, 10 km terug.
  const out = line(10);
  const points = [...out, ...out.slice(0, -1).reverse()];
  const cum = cumulative(points);
  const rider = { lat: 50.85, lon: out[30].lon }; // 3 km van de start

  it("kiest zonder ritafstand het eerste dichtstbijzijnde punt", () => {
    const { index } = pickRoutePoint(rider, points, cum, null, 0.5);
    expect(cum[index]).toBeCloseTo(3, 1);
  });

  it("kiest met de ritafstand de juiste doorkomst", () => {
    const { index, offKm } = pickRoutePoint(rider, points, cum, 16.8, 0.5);
    expect(cum[index]).toBeCloseTo(17, 1);
    expect(offKm).toBeLessThan(0.01);
  });

  it("verandert niets aan een route die niet terugkomt", () => {
    const straight = line(10);
    const straightCum = cumulative(straight);
    const { index } = pickRoutePoint(rider, straight, straightCum, 60, 0.5);
    expect(index).toBe(30);
  });
});
