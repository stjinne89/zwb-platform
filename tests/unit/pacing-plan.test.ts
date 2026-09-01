import { describe, expect, it } from "vitest";
import {
  buildBaselinePlan,
  durationIntensityFraction,
} from "@/lib/pacing/baseline";
import {
  ceilingWatts,
  clampPlan,
  evaluatePlan,
  expandPlanToWatts,
  rebalancePlan,
  type PlanSegment,
} from "@/lib/pacing/plan";
import type { CpModel } from "@/lib/pacing/cp";
import {
  pacingRouteFromZwift,
  type PacingRoute,
} from "@/lib/pacing/route-profile";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";

const MODEL: CpModel = {
  cpWatts: 280,
  wPrimeJoules: 20_000,
  source: "intervals",
  weightKg: 70,
};

/** Ronde van 10 km: 8 km vlak, dan 2 km à 6 %. */
function lapProfile(): RouteProfile {
  const distanceM: number[] = [];
  const altitudeM: number[] = [];
  for (let d = 0; d <= 10_000; d += 25) {
    distanceM.push(d);
    altitudeM.push(d <= 8000 ? 50 : 50 + (d - 8000) * 0.06);
  }
  return { distanceM, altitudeM };
}

function route(laps = 1): PacingRoute {
  return pacingRouteFromZwift({
    profile: lapProfile(),
    accents: [
      {
        slug: "de-muur",
        name: "De Muur",
        kind: "climb",
        startKm: 8,
        endKm: 10,
        avgInclinePct: 6,
      },
    ],
    leadInKm: 0,
    leadInElevationM: 0,
    lapKm: 10,
    laps,
  });
}

const flatThenClimb: PlanSegment[] = [
  { startKm: 0, endKm: 8, targetWkg: 3, label: "Aanloop", effort: "duur" },
  { startKm: 8, endKm: 10, targetWkg: 4.2, label: "De Muur", effort: "vol" },
];

describe("expandPlanToWatts", () => {
  it("zet w/kg per stuk om naar watt per routesegment", () => {
    const watts = expandPlanToWatts(flatThenClimb, route(), MODEL.weightKg);
    expect(watts).toHaveLength(route().segments.length);
    expect(watts[0]).toBeCloseTo(3 * 70, 5);
    expect(watts.at(-1)).toBeCloseTo(4.2 * 70, 5);
  });

  it("geeft een stuk dat het plan niet dekt het laagste doel, niet het gemiddelde", () => {
    const partial: PlanSegment[] = [
      { startKm: 0, endKm: 2, targetWkg: 2.4, label: "Begin", effort: "rustig" },
      { startKm: 2, endKm: 4, targetWkg: 5.6, label: "Piek", effort: "vol" },
    ];
    const watts = expandPlanToWatts(partial, route(), MODEL.weightKg);
    // Km 4 tot 10 staat nergens in het plan: dat wordt 2.4, niet 4.0.
    expect(watts.at(-1)).toBeCloseTo(2.4 * 70, 5);
  });
});

describe("ceilingWatts", () => {
  it("volgt P(t) = CP + W'/t", () => {
    expect(ceilingWatts(300, MODEL)).toBeCloseTo(280 + 20_000 / 300, 5);
  });

  it("laat een lagere gemeten curvewaarde winnen van het model", () => {
    const curve = [{ seconds: 300, watts: 320 }];
    expect(ceilingWatts(300, MODEL, curve)).toBe(320);
  });

  it("negeert een curve die die duur niet kent", () => {
    const curve = [{ seconds: 15, watts: 900 }];
    expect(ceilingWatts(600, MODEL, curve)).toBeCloseTo(280 + 20_000 / 600, 5);
  });
});

describe("clampPlan", () => {
  it("schaalt een stuk terug dat te lang op te hoog vermogen staat", () => {
    const absurd: PlanSegment[] = [
      { startKm: 0, endKm: 10, targetWkg: 8, label: "Alles", effort: "vol" },
    ];
    const { plan, notes } = clampPlan(absurd, route(), MODEL);
    expect(plan[0].targetWkg).toBeLessThan(8);
    expect(notes[0].reason).toBe("te lang op dit vermogen");
  });

  it("tilt een stuk op dat onder de ondergrens ligt", () => {
    const tooLow: PlanSegment[] = [
      { startKm: 0, endKm: 10, targetWkg: 0.5, label: "Bijna stil", effort: "rustig" },
    ];
    const { plan, notes } = clampPlan(tooLow, route(), MODEL);
    expect(plan[0].targetWkg).toBeGreaterThan(0.5);
    expect(notes[0].reason).toBe("onder de ondergrens");
  });

  it("laat een redelijk plan met rust", () => {
    const { plan, notes } = clampPlan(flatThenClimb, route(), MODEL);
    expect(notes).toHaveLength(0);
    expect(plan[0].targetWkg).toBe(3);
  });
});

describe("evaluatePlan", () => {
  it("levert tijd, gemiddeld vermogen en de W'-balans", () => {
    const evaluation = evaluatePlan(flatThenClimb, route(), MODEL);
    expect(evaluation.totalSeconds).toBeGreaterThan(0);
    expect(evaluation.avgSpeedKmh).toBeGreaterThan(5);
    expect(evaluation.avgWatts).toBeGreaterThan(200);
    expect(evaluation.wPrime.balanceBySegment).toHaveLength(
      route().segments.length,
    );
  });

  it("geeft per accent de doorkomst, duur en het vermogen", () => {
    const evaluation = evaluatePlan(flatThenClimb, route(), MODEL);
    expect(evaluation.accents).toHaveLength(1);
    const climb = evaluation.accents[0];
    expect(climb.arrivalSeconds).toBeGreaterThan(0);
    expect(climb.durationS).toBeGreaterThan(0);
    expect(climb.watts).toBe(Math.round(4.2 * 70));
  });

  it("harder rijden kost tijd noch reserve gratis", () => {
    const rustig = evaluatePlan(
      flatThenClimb.map((s) => ({ ...s, targetWkg: s.targetWkg - 0.5 })),
      route(),
      MODEL,
    );
    const hard = evaluatePlan(flatThenClimb, route(), MODEL);
    expect(hard.totalSeconds).toBeLessThan(rustig.totalSeconds);
    expect(hard.wPrime.minBalanceJ).toBeLessThan(rustig.wPrime.minBalanceJ);
  });
});

describe("rebalancePlan", () => {
  it("maakt een onhaalbaar plan haalbaar door de pieken terug te schalen", () => {
    // Drie ronden, elke klim vol aangereden: dat trekt de reserve leeg.
    const greedy: PlanSegment[] = [];
    for (let lap = 0; lap < 3; lap++) {
      const offset = lap * 10;
      greedy.push({
        startKm: offset,
        endKm: offset + 8,
        targetWkg: 3.6,
        label: `Aanloop ${lap + 1}`,
        effort: "tempo",
      });
      greedy.push({
        startKm: offset + 8,
        endKm: offset + 10,
        targetWkg: 5.4,
        label: `De Muur ${lap + 1}`,
        effort: "vol",
      });
    }

    const before = evaluatePlan(greedy, route(3), MODEL);
    expect(before.feasible).toBe(false);

    const after = rebalancePlan(greedy, route(3), MODEL);
    expect(after.evaluation.feasible).toBe(true);
    expect(after.plan[1].targetWkg).toBeLessThan(5.4);
    expect(after.adjustments.length).toBeGreaterThan(0);
  });

  it("laat een haalbaar plan ongemoeid", () => {
    const gentle: PlanSegment[] = [
      { startKm: 0, endKm: 8, targetWkg: 2.6, label: "Aanloop", effort: "duur" },
      { startKm: 8, endKm: 10, targetWkg: 3.4, label: "De Muur", effort: "tempo" },
    ];
    const result = rebalancePlan(gentle, route(), MODEL);
    expect(result.evaluation.feasible).toBe(true);
    expect(result.plan.map((s) => s.targetWkg)).toEqual([2.6, 3.4]);
    expect(result.adjustments).toHaveLength(0);
  });
});

describe("durationIntensityFraction", () => {
  it("daalt naarmate de rit langer duurt", () => {
    const short = durationIntensityFraction(20 * 60);
    const medium = durationIntensityFraction(2 * 3600);
    const long = durationIntensityFraction(6 * 3600);
    expect(short).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(long);
  });

  it("blijft binnen de ankerpunten aan beide uiteinden", () => {
    expect(durationIntensityFraction(60)).toBe(0.98);
    expect(durationIntensityFraction(24 * 3600)).toBe(0.6);
  });
});

describe("buildBaselinePlan", () => {
  it("bouwt een uitvoerbaar plan met een stuk per accent", () => {
    const result = buildBaselinePlan({ route: route(), model: MODEL });
    expect(result.evaluation.feasible).toBe(true);
    // Aanloop + de klim.
    expect(result.plan).toHaveLength(2);
    expect(result.plan[1].label).toBe("De Muur");
    expect(result.plan[1].accentId).toBe("de-muur");
  });

  it("legt op de klim een hoger doel dan op het vlakke stuk", () => {
    const result = buildBaselinePlan({ route: route(), model: MODEL });
    expect(result.plan[1].targetWkg).toBeGreaterThan(result.plan[0].targetWkg);
  });

  it("geeft een klimmer meer op de klim dan een tijdrijder", () => {
    const climber = buildBaselinePlan({
      route: route(),
      model: MODEL,
      riderType: "climber",
    });
    const tter = buildBaselinePlan({
      route: route(),
      model: MODEL,
      riderType: "tter",
    });
    expect(climber.plan[1].targetWkg).toBeGreaterThan(tter.plan[1].targetWkg);
  });

  it("houdt een lange rit met drie klimmen uitvoerbaar", () => {
    const result = buildBaselinePlan({ route: route(3), model: MODEL });
    expect(result.evaluation.feasible).toBe(true);
    expect(result.plan.filter((s) => s.accentId)).toHaveLength(3);
  });

  it("plant lager op een lange rit dan op een korte", () => {
    const short = buildBaselinePlan({ route: route(1), model: MODEL });
    const long = buildBaselinePlan({ route: route(6), model: MODEL });
    expect(long.evaluation.avgWkg).toBeLessThan(short.evaluation.avgWkg);
  });
});

describe("baseline: fijnere opdeling", () => {
  /** Vlakke route van 40 km zonder enig genoemd segment. */
  function flatRoute(km: number): PacingRoute {
    const distanceM: number[] = [];
    const altitudeM: number[] = [];
    for (let d = 0; d <= km * 1000; d += 25) {
      distanceM.push(d);
      altitudeM.push(50);
    }
    return pacingRouteFromZwift({
      profile: { distanceM, altitudeM },
      accents: [],
      leadInKm: 0,
      leadInElevationM: 0,
      lapKm: km,
      laps: 1,
    });
  }

  it("knipt een lange vlakke route op in plaats van één schuifregelaar te geven", () => {
    const result = buildBaselinePlan({ route: flatRoute(40), model: MODEL });
    expect(result.plan.length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...result.plan.map((s) => s.endKm - s.startKm))).toBeLessThanOrEqual(8.01);
  });

  it("dekt de hele route zonder gaten", () => {
    const result = buildBaselinePlan({ route: flatRoute(40), model: MODEL });
    expect(result.plan[0].startKm).toBe(0);
    expect(result.plan.at(-1)!.endKm).toBeCloseTo(40, 1);
    for (let i = 1; i < result.plan.length; i++) {
      expect(result.plan[i].startKm).toBeCloseTo(result.plan[i - 1].endKm, 5);
    }
  });

  it("houdt het aantal stukken hanteerbaar op een heel lange rit", () => {
    const result = buildBaselinePlan({ route: flatRoute(200), model: MODEL });
    expect(result.plan.length).toBeLessThanOrEqual(24);
  });

  it("knipt een lange klim op en nummert de delen", () => {
    const distanceM: number[] = [];
    const altitudeM: number[] = [];
    for (let d = 0; d <= 14_000; d += 25) {
      distanceM.push(d);
      altitudeM.push(d <= 2000 ? 50 : 50 + (d - 2000) * 0.07);
    }
    const route = pacingRouteFromZwift({
      profile: { distanceM, altitudeM },
      accents: [
        {
          slug: "de-alpe",
          name: "De Alpe",
          kind: "climb",
          startKm: 2,
          endKm: 14,
          avgInclinePct: 7,
        },
      ],
      leadInKm: 0,
      leadInElevationM: 0,
      lapKm: 14,
      laps: 1,
    });

    const result = buildBaselinePlan({ route, model: MODEL });
    const climbParts = result.plan.filter((s) => s.accentId === "de-alpe");
    expect(climbParts.length).toBeGreaterThanOrEqual(3);
    expect(climbParts[0].label).toMatch(/De Alpe \(1\/\d\)/);
  });
});
