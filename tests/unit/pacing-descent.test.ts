import { describe, expect, it } from "vitest";
import { buildBaselinePlan } from "@/lib/pacing/baseline";
import {
  DESCENT_FLAT_CP_FRACTION,
  evaluatePlan,
  imposeFixedPieces,
  rebalancePlan,
  type PlanSegment,
} from "@/lib/pacing/plan";
import type { CpModel } from "@/lib/pacing/cp";
import {
  descentSegmentIndex,
  detectDescents,
  normalizeNeutralZones,
  pacingRouteFromZwift,
  withDescents,
  type PacingRoute,
} from "@/lib/pacing/route-profile";
import { planLayoutMatchesRoute } from "@/lib/pacing/staleness";
import { routeSnapshot } from "@/lib/pacing/store";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";

const MODEL: CpModel = { cpWatts: 280, wPrimeJoules: 20_000, source: "intervals", weightKg: 70 };

/**
 * 20 km: 5 km vlak, 3 km klim à 6 %, 4 km afdaling à −6 % met 150 m vlak op
 * km 10, 7,4 km vlak, en een korte afdaling van 600 m à −8 % aan het eind.
 */
function profile(): RouteProfile {
  const distanceM: number[] = [];
  const altitudeM: number[] = [];
  let altitude = 0;
  for (let d = 0; d <= 20_000; d += 25) {
    distanceM.push(d);
    altitudeM.push(altitude);
    const km = d / 1000;
    let gradient = 0;
    if (km >= 5 && km < 8) gradient = 0.06;
    else if (km >= 8 && km < 12 && !(km >= 10 && km < 10.15)) gradient = -0.06;
    else if (km >= 19.4) gradient = -0.08;
    altitude += gradient * 25;
  }
  return { distanceM, altitudeM };
}

function route(zones: Array<{ startKm: number; endKm: number }> = []): PacingRoute {
  const base = pacingRouteFromZwift({
    profile: profile(),
    accents: [{ slug: "klim", name: "Klim", kind: "climb", startKm: 5, endKm: 8, avgInclinePct: 6 }],
    leadInKm: 0,
    leadInElevationM: 0,
    lapKm: 20,
    laps: 1,
  });
  return withDescents({ ...base, neutralZones: normalizeNeutralZones(zones, base.totalKm) });
}

const plan: PlanSegment[] = [
  { startKm: 0, endKm: 5, targetWkg: 3, label: "Aanloop", effort: "tempo" },
  { startKm: 5, endKm: 8, targetWkg: 4, label: "Klim", effort: "drempel", accentId: "klim" },
  { startKm: 8, endKm: 20, targetWkg: 3, label: "Rest", effort: "tempo" },
];

describe("detectDescents", () => {
  it("vindt de lange afdaling over een kort vlak stukje heen, niet de korte", () => {
    const descents = detectDescents(route());
    expect(descents).toHaveLength(1);
    expect(descents[0].startKm).toBeCloseTo(8, 1);
    expect(descents[0].endKm).toBeCloseTo(12, 1);
    expect(descents[0].avgGradient).toBeLessThan(-0.05);
  });

  it("laat een neutralisatie de afdaling afbreken", () => {
    const descents = detectDescents(route([{ startKm: 9, endKm: 11 }]));
    // Voor en na de zone blijft telkens 1 km over: precies de ondergrens.
    expect(descents.every((descent) => descent.endKm <= 9.05 || descent.startKm >= 10.95)).toBe(true);
  });
});

describe("afdaling in de doorrekening", () => {
  it("rolt uit waar het steil daalt en trapt op het vlakke stukje erin", () => {
    const withDescent = route();
    const pieces = imposeFixedPieces(plan, withDescent, MODEL);
    const descent = pieces.find((piece) => piece.kind === "descent");
    expect(descent).toMatchObject({ targetWkg: 0 });

    const evaluation = evaluatePlan(pieces, withDescent, MODEL);
    const index = descentSegmentIndex(withDescent);
    const steep = evaluation.watts.filter(
      (_, i) => index[i] === 0 && withDescent.segments[i].gradient <= -0.03,
    );
    const flat = evaluation.watts.filter(
      (_, i) => index[i] === 0 && withDescent.segments[i].gradient > -0.03,
    );
    expect(steep.length).toBeGreaterThan(30);
    expect(steep.every((watts) => watts === 0)).toBe(true);
    expect(flat.length).toBeGreaterThan(0);
    expect(flat.every((watts) => watts >= MODEL.cpWatts * DESCENT_FLAT_CP_FRACTION)).toBe(true);
    // Geen wandeltempo op dat vlakke stukje.
    const slowest = Math.min(
      ...evaluation.estimate.segments.filter((_, i) => index[i] === 0).map((s) => s.speedMs),
    );
    expect(slowest * 3.6).toBeGreaterThan(20);
  });

  it("vult de reserve op de afdaling sneller aan dan met trappen", () => {
    const withDescent = route();
    const hardClimb = plan.map((piece) => (piece.accentId ? { ...piece, targetWkg: 5 } : piece));
    const coasting = evaluatePlan(imposeFixedPieces(hardClimb, withDescent, MODEL), withDescent, MODEL);
    const pedalling = evaluatePlan(hardClimb, { ...withDescent, descents: [] }, MODEL);
    const index = descentSegmentIndex(withDescent);
    const last = index.lastIndexOf(0);
    expect(coasting.wPrime.balanceBySegment[last]).toBeGreaterThan(
      pedalling.wPrime.balanceBySegment[last],
    );
  });

  it("zet een uitroldoel niet op de ondergrens en een gat niet op 0 W", () => {
    const withDescent = route();
    const pieces = imposeFixedPieces(plan, withDescent, MODEL);
    const rebalanced = rebalancePlan(pieces, withDescent, MODEL);
    expect(rebalanced.plan.find((piece) => piece.kind === "descent")?.targetWkg).toBe(0);

    // Plan dat km 0-5 niet noemt: het gat krijgt het laagste gereden doel.
    const gap = evaluatePlan(pieces.slice(1), withDescent, MODEL);
    expect(gap.watts[0]).toBeCloseTo(3 * MODEL.weightKg, 5);
  });
});

describe("afdaling in het plan", () => {
  it("zit in het basisvoorstel", () => {
    const baseline = buildBaselinePlan({ route: route(), model: MODEL });
    const descents = baseline.plan.filter((piece) => piece.kind === "descent");
    expect(descents).toHaveLength(1);
    expect(descents[0].targetWkg).toBe(0);
  });

  it("houdt een eigen doel op dezelfde afdaling", () => {
    const withDescent = route();
    const own = imposeFixedPieces(plan, withDescent, MODEL).map((piece) =>
      piece.kind === "descent" ? { ...piece, targetWkg: 1.5 } : piece,
    );
    const again = imposeFixedPieces(own, withDescent, MODEL);
    expect(again.find((piece) => piece.kind === "descent")?.targetWkg).toBe(1.5);
  });

  it("maakt een plan van vóór de afdalingen verouderd", () => {
    const withDescent = route();
    const old = { ...routeSnapshot(withDescent), descents: undefined };
    expect(planLayoutMatchesRoute(routeSnapshot(withDescent), plan, withDescent)).toBe(true);
    expect(planLayoutMatchesRoute(old, plan, withDescent)).toBe(false);
  });
});
