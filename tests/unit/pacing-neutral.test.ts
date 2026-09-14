import { describe, expect, it } from "vitest";
import { buildBaselinePlan } from "@/lib/pacing/baseline";
import { adoptGeneratedPlan } from "@/lib/pacing/adopt";
import {
  evaluatePlan,
  imposeNeutralPieces,
  NEUTRAL_MAX_CP_FRACTION,
  NEUTRAL_SPEED_KMH,
  neutralWatts,
  type PlanSegment,
} from "@/lib/pacing/plan";
import type { CpModel } from "@/lib/pacing/cp";
import {
  neutralSegmentMask,
  normalizeNeutralZones,
  pacingRouteFromZwift,
  type PacingRoute,
} from "@/lib/pacing/route-profile";
import { planLayoutMatchesRoute } from "@/lib/pacing/staleness";
import { routeSnapshot } from "@/lib/pacing/store";
import { wattsForSpeed } from "@/lib/ride-estimate";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";

const MODEL: CpModel = { cpWatts: 280, wPrimeJoules: 20_000, source: "intervals", weightKg: 70 };

/** 20 km: 12 km vlak, 3 km à 5 %, 5 km vlak. */
function profile(): RouteProfile {
  const distanceM: number[] = [];
  const altitudeM: number[] = [];
  for (let d = 0; d <= 20_000; d += 25) {
    distanceM.push(d);
    altitudeM.push(d <= 12_000 ? 0 : d <= 15_000 ? (d - 12_000) * 0.05 : 150);
  }
  return { distanceM, altitudeM };
}

function route(zones: Array<{ startKm: number; endKm: number; label?: string }> = []): PacingRoute {
  const base = pacingRouteFromZwift({
    profile: profile(),
    accents: [
      { slug: "klim", name: "Klim", kind: "climb", startKm: 12, endKm: 15, avgInclinePct: 5 },
    ],
    leadInKm: 0,
    leadInElevationM: 0,
    lapKm: 20,
    laps: 1,
  });
  return { ...base, neutralZones: normalizeNeutralZones(zones, base.totalKm) };
}

describe("wattsForSpeed", () => {
  it("is de omgekeerde van het snelheidsmodel en nooit negatief", () => {
    const flat = wattsForSpeed(30 / 3.6, 0, 79);
    expect(flat).toBeGreaterThan(120);
    expect(flat).toBeLessThan(220);
    expect(wattsForSpeed(30 / 3.6, 0.05, 79)).toBeGreaterThan(flat);
    expect(wattsForSpeed(30 / 3.6, -0.08, 79)).toBe(0);
  });
});

describe("normalizeNeutralZones", () => {
  it("knipt binnen de route, sorteert en haalt overlap en snippers weg", () => {
    expect(
      normalizeNeutralZones(
        [
          { startKm: 5, endKm: 7 },
          { startKm: -1, endKm: 3, label: "Start" },
          { startKm: 6, endKm: 6.05 },
          { startKm: 18, endKm: 25 },
        ],
        20,
      ),
    ).toEqual([
      { startKm: 0, endKm: 3, label: "Start" },
      { startKm: 5, endKm: 7, label: "Neutralisatie" },
      { startKm: 18, endKm: 20, label: "Neutralisatie" },
    ]);
  });
});

describe("neutralisatie in de doorrekening", () => {
  const plan: PlanSegment[] = [
    { startKm: 0, endKm: 12, targetWkg: 4.5, label: "Vlak", effort: "vol" },
    { startKm: 12, endKm: 20, targetWkg: 3, label: "Rest", effort: "tempo" },
  ];

  it("rijdt in de zone op ongeveer het neutrale tempo, begrensd onder CP", () => {
    const withZone = route([{ startKm: 0, endKm: 5 }]);
    const mask = neutralSegmentMask(withZone);
    const evaluation = evaluatePlan(plan, withZone, MODEL);
    const zoneWatts = evaluation.watts.filter((_, index) => mask[index]);
    expect(zoneWatts.length).toBe(50);
    for (const watts of zoneWatts) {
      expect(watts).toBeLessThanOrEqual(MODEL.cpWatts * NEUTRAL_MAX_CP_FRACTION + 1e-9);
    }
    const zoneSeconds = evaluation.estimate.segments
      .filter((_, index) => mask[index])
      .reduce((sum, segment) => sum + segment.durationS, 0);
    expect(zoneSeconds / 60).toBeCloseTo((5 / NEUTRAL_SPEED_KMH) * 60, 0);
  });

  it("kost in de zone geen anaerobe reserve", () => {
    const withZone = route([{ startKm: 0, endKm: 5 }]);
    const evaluation = evaluatePlan(plan, withZone, MODEL);
    const mask = neutralSegmentMask(withZone);
    const lastZoneIndex = mask.lastIndexOf(true);
    expect(evaluation.wPrime.balanceBySegment[lastZoneIndex]).toBeCloseTo(MODEL.wPrimeJoules, 0);
    // Zonder zone spreekt 4,5 w/kg (boven CP) de reserve daar al aan.
    const without = evaluatePlan(plan, route(), MODEL);
    expect(without.wPrime.balanceBySegment[lastZoneIndex]).toBeLessThan(MODEL.wPrimeJoules);
  });

  it("begrenst het neutrale vermogen op een helling", () => {
    expect(neutralWatts(0.08, MODEL)).toBe(MODEL.cpWatts * NEUTRAL_MAX_CP_FRACTION);
  });
});

describe("imposeNeutralPieces", () => {
  const withZone = route([{ startKm: 4, endKm: 6, label: "Neutraal" }]);

  it("knipt de zone uit een stuk dat erover heen loopt", () => {
    const pieces = imposeNeutralPieces(
      [{ startKm: 0, endKm: 20, targetWkg: 3, label: "Alles", effort: "tempo" }],
      withZone,
      MODEL,
    );
    expect(pieces.map((piece) => [piece.startKm, piece.endKm, piece.kind ?? null, piece.label])).toEqual([
      [0, 4, null, "Alles"],
      [4, 6, "neutral", "Neutraal"],
      [6, 20, null, "Alles (vervolg)"],
    ]);
  });

  it("laat een stuk dat in de zone valt verdwijnen en voegt snippers samen", () => {
    const pieces = imposeNeutralPieces(
      [
        { startKm: 0, endKm: 4.05, targetWkg: 2.5, label: "A", effort: "duur" },
        { startKm: 4.05, endKm: 5.9, targetWkg: 5, label: "In de zone", effort: "vol" },
        { startKm: 5.9, endKm: 20, targetWkg: 3, label: "B", effort: "tempo" },
      ],
      withZone,
      MODEL,
    );
    expect(pieces.map((piece) => piece.label)).toEqual(["A", "Neutraal", "B"]);
    expect(pieces[0].endKm).toBe(4);
    expect(pieces[2].startKm).toBe(6);
  });

  it("verandert niets zonder zones en muteert de invoer niet", () => {
    const input: PlanSegment[] = [{ startKm: 0, endKm: 20, targetWkg: 3, label: "X", effort: "tempo" }];
    expect(imposeNeutralPieces(input, route(), MODEL)).toBe(input);
    imposeNeutralPieces(input, withZone, MODEL);
    expect(input[0]).toEqual({ startKm: 0, endKm: 20, targetWkg: 3, label: "X", effort: "tempo" });
  });

  it("zit in het basisvoorstel en in een overgenomen AI-voorstel", () => {
    const baseline = buildBaselinePlan({ route: withZone, model: MODEL });
    expect(baseline.plan.filter((piece) => piece.kind === "neutral")).toHaveLength(1);

    const adopted = adoptGeneratedPlan(
      {
        strategy: "",
        risks: [],
        segments: [
          { startKm: 0, endKm: 20, targetWkg: 3, label: "Alles", effort: "tempo", rationale: "", accentId: "" },
        ],
      },
      withZone,
      MODEL,
    );
    const neutral = adopted.plan.find((piece) => piece.kind === "neutral");
    expect(neutral).toMatchObject({ startKm: 4, endKm: 6 });
  });
});

describe("verouderd door neutralisaties", () => {
  const plan: PlanSegment[] = [{ startKm: 0, endKm: 20, targetWkg: 3, label: "X", effort: "tempo" }];

  it("herkent een toegevoegde of verlegde zone", () => {
    const zonder = route();
    const met = route([{ startKm: 0, endKm: 3 }]);
    const verlegd = route([{ startKm: 0, endKm: 4 }]);
    expect(planLayoutMatchesRoute(routeSnapshot(met), plan, met)).toBe(true);
    expect(planLayoutMatchesRoute(routeSnapshot(zonder), plan, met)).toBe(false);
    expect(planLayoutMatchesRoute(routeSnapshot(met), plan, verlegd)).toBe(false);
  });

  it("vindt een plan van vóór de zones alleen verouderd als de route er nu een heeft", () => {
    const oud = { ...routeSnapshot(route()), neutral: undefined };
    expect(planLayoutMatchesRoute(oud, plan, route())).toBe(true);
    expect(planLayoutMatchesRoute(oud, plan, route([{ startKm: 0, endKm: 3 }]))).toBe(false);
  });
});
