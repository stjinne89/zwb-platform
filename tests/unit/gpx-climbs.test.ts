import { describe, expect, it } from "vitest";
import {
  detectClimbs,
  labelClimbsWithCols,
  type ColLite,
} from "@/lib/gpx-climbs";
import type { GpxPoint } from "@/lib/gpx";

// Genereer een route met punten ~25 m uit elkaar, noordwaarts vanaf (lat0, lon0).
// `segments` is een lijst {lengthM, grade} die na elkaar wordt gelegd.
const M_PER_DEG_LAT = 111320;

function buildRoute(
  lat0: number,
  lon0: number,
  segments: { lengthM: number; grade: number }[],
): GpxPoint[] {
  const stepM = 25;
  const points: GpxPoint[] = [];
  let lat = lat0;
  let ele = 100;
  points.push({ lat, lon: lon0, ele });
  for (const seg of segments) {
    const steps = Math.round(seg.lengthM / stepM);
    for (let i = 0; i < steps; i++) {
      lat += stepM / M_PER_DEG_LAT;
      ele += stepM * seg.grade;
      points.push({ lat, lon: lon0, ele });
    }
  }
  return points;
}

describe("detectClimbs", () => {
  it("vindt geen klim op een vlakke route", () => {
    const flat = buildRoute(45, 6, [{ lengthM: 5000, grade: 0 }]);
    expect(detectClimbs(flat)).toHaveLength(0);
  });

  it("negeert een korte, lichte heuvel onder de drempel", () => {
    // 400 m @ 4% = 16 hm winst — onder MIN_GAIN_M (30 m).
    const route = buildRoute(45, 6, [
      { lengthM: 1000, grade: 0 },
      { lengthM: 400, grade: 0.04 },
      { lengthM: 1000, grade: 0 },
    ]);
    expect(detectClimbs(route)).toHaveLength(0);
  });

  it("detecteert één klim met juiste categorie en stats", () => {
    // 5 km @ 6% = 300 hm winst → score 30.000 → 3e categorie.
    const route = buildRoute(45, 6, [
      { lengthM: 1000, grade: 0 },
      { lengthM: 5000, grade: 0.06 },
      { lengthM: 1000, grade: 0 },
    ]);
    const climbs = detectClimbs(route);
    expect(climbs).toHaveLength(1);
    const climb = climbs[0];
    expect(climb.category).toBe("3e");
    expect(climb.gainM).toBeGreaterThan(270);
    expect(climb.gainM).toBeLessThan(320);
    expect(climb.avgGradient).toBeGreaterThan(5);
    expect(climb.avgGradient).toBeLessThan(7);
    expect(climb.maxGradient).toBeGreaterThanOrEqual(climb.avgGradient);
    expect(climb.lengthM).toBeGreaterThan(4500);
    expect(climb.startIdx).toBeLessThan(climb.endIdx);
    expect(climb.name).toBeNull();
  });

  it("scheidt twee klimmen met een afdaling ertussen", () => {
    const route = buildRoute(45, 6, [
      { lengthM: 500, grade: 0 },
      { lengthM: 3000, grade: 0.07 }, // 210 hm → 3e
      { lengthM: 2000, grade: -0.07 }, // afdaling
      { lengthM: 3000, grade: 0.07 }, // 210 hm → 3e
      { lengthM: 500, grade: 0 },
    ]);
    expect(detectClimbs(route).length).toBe(2);
  });

  it("categoriseert een zware klim als HC", () => {
    // 12 km @ 7,5% = 900 hm → score 90.000 → HC.
    const route = buildRoute(45, 6, [
      { lengthM: 500, grade: 0 },
      { lengthM: 12000, grade: 0.075 },
      { lengthM: 500, grade: 0 },
    ]);
    const climbs = detectClimbs(route);
    expect(climbs).toHaveLength(1);
    expect(climbs[0].category).toBe("HC");
  });
});

describe("labelClimbsWithCols", () => {
  it("geeft een klim de naam van een nabije col", () => {
    const route = buildRoute(45, 6, [
      { lengthM: 1000, grade: 0 },
      { lengthM: 5000, grade: 0.06 },
      { lengthM: 1000, grade: 0 },
    ]);
    const climbs = detectClimbs(route);
    expect(climbs).toHaveLength(1);

    // Plaats een col-summit vlak bij de top van de klim.
    const top = route[climbs[0].endIdx];
    const cols: ColLite[] = [
      {
        slug: "test-col",
        name: "Testcol",
        summit_lat: top.lat,
        summit_lon: top.lon,
        detection_radius_m: 500,
      },
    ];
    const labelled = labelClimbsWithCols(climbs, route, cols);
    expect(labelled[0].name).toBe("Testcol");
    expect(labelled[0].colSlug).toBe("test-col");
  });

  it("laat een klim zonder nabije col ongenoemd", () => {
    const route = buildRoute(45, 6, [
      { lengthM: 1000, grade: 0 },
      { lengthM: 5000, grade: 0.06 },
      { lengthM: 1000, grade: 0 },
    ]);
    const climbs = detectClimbs(route);
    const cols: ColLite[] = [
      {
        slug: "ver-weg",
        name: "Ver Weg",
        summit_lat: 50,
        summit_lon: 3,
        detection_radius_m: 500,
      },
    ];
    const labelled = labelClimbsWithCols(climbs, route, cols);
    expect(labelled[0].name).toBeNull();
  });
});
