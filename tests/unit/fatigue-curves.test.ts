import { describe, expect, it } from "vitest";
import { matchFatigueCurve } from "@/lib/teams/fatigue-curves";
import { comparisonRidersFromRows } from "@/lib/teams/comparison-riders";

const points = [
  { seconds: 60, watts: 500 },
  { seconds: 300, watts: 380 },
  { seconds: 1200, watts: 300 },
];

describe("matchFatigueCurve", () => {
  it("kiest de dichtstbijzijnde drempel binnen de tolerantie", () => {
    const curves = [
      { afterKj: 800, points },
      { afterKj: 1100, points },
      { afterKj: 2000, points },
    ];
    expect(matchFatigueCurve(curves, 1000)?.afterKj).toBe(1100);
    expect(matchFatigueCurve(curves, 2100)?.afterKj).toBe(2000);
  });

  it("geeft niets terug als de drempel te ver afligt", () => {
    expect(matchFatigueCurve([{ afterKj: 1500, points }], 1000)).toBeNull();
    expect(matchFatigueCurve([], 1000)).toBeNull();
  });

  it("heeft geen curve nodig in verse stand", () => {
    expect(matchFatigueCurve([{ afterKj: 1000, points }], 0)).toBeNull();
  });
});

describe("comparisonRidersFromRows", () => {
  const row = {
    profile_id: "p1",
    rider_type: "allrounder",
    weight_kg: 72,
    watts_15s: null,
    watts_30s: null,
    watts_1m: 500,
    watts_2m: null,
    watts_5m: 380,
    watts_10m: null,
    watts_20m: 300,
    curve_points: points,
    profiles: { display_name: "Renner A" },
  };

  it("leest de vermoeide curves mee en sorteert ze op kJ", () => {
    const [rider] = comparisonRidersFromRows([
      {
        ...row,
        curve_points_fatigue: [
          { afterKj: 2000, points: points.map((p) => ({ ...p, watts: p.watts - 60 })) },
          { afterKj: 1000, points: points.map((p) => ({ ...p, watts: p.watts - 30 })) },
        ],
      },
    ]);
    expect(rider.fatigueCurves?.map((curve) => curve.afterKj)).toEqual([1000, 2000]);
    expect(rider.fatigueCurves?.[0].points[0].watts).toBe(470);
  });

  it("negeert vermoeide curves zonder bruikbare punten", () => {
    const [rider] = comparisonRidersFromRows([
      {
        ...row,
        curve_points_fatigue: [{ afterKj: 1000, points: [{ seconds: 60, watts: 470 }] }, "kapot"],
      },
    ]);
    expect(rider.fatigueCurves).toEqual([]);
  });

  it("werkt op databases zonder de vermoeide-curvekolom", () => {
    const [rider] = comparisonRidersFromRows([row]);
    expect(rider.fatigueCurves).toEqual([]);
    expect(rider.hasFullCurve).toBe(true);
  });
});
