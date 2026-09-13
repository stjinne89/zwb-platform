import { describe, expect, it } from "vitest";
import { buildBaselinePlan } from "@/lib/pacing/baseline";
import type { CpModel } from "@/lib/pacing/cp";
import { pacingRouteFromZwift, type PacingRoute } from "@/lib/pacing/route-profile";
import {
  checkStaleness,
  planLayoutMatchesRoute,
  withLayoutStaleness,
} from "@/lib/pacing/staleness";
import {
  carryTargetsOver,
  recomputedOrigin,
  routeSnapshot,
  type PlanSummary,
} from "@/lib/pacing/store";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";

// Melding 5 (plannenboek, 4 september 2026): na het samenvoegen van klimmen
// tekende de pacingpagina het profiel met de nieuwe klimmen, maar stonden de
// stukken eronder nog in de oude indeling. Een GPX-route kent geen routesync-tijd,
// dus het plan werd nooit als verouderd gemeld.

const MODEL: CpModel = { cpWatts: 280, wPrimeJoules: 20_000, source: "intervals", weightKg: 70 };

/** 30 km: vlak tot 10, klim 10-14, vals plat 14-15, klim 15-19, vlak tot 30. */
function profile(): RouteProfile {
  const distanceM: number[] = [];
  const altitudeM: number[] = [];
  let altitude = 50;
  for (let d = 0; d <= 30_000; d += 25) {
    const km = d / 1000;
    if (d > 0) {
      const climbing = (km > 10 && km <= 14) || (km > 15 && km <= 19);
      altitude += climbing ? 25 * 0.07 : km > 14 && km <= 15 ? 25 * 0.01 : 0;
    }
    distanceM.push(d);
    altitudeM.push(altitude);
  }
  return { distanceM, altitudeM };
}

function route(accents: Array<{ slug: string; name: string; startKm: number; endKm: number }>): PacingRoute {
  return pacingRouteFromZwift({
    profile: profile(),
    accents: accents.map((accent) => ({ ...accent, kind: "climb" as const, avgInclinePct: 6 })),
    leadInKm: 0,
    leadInElevationM: 0,
    lapKm: 30,
    laps: 1,
  });
}

const apart = route([
  { slug: "klim-1", name: "Eerste stuk", startKm: 10, endKm: 14 },
  { slug: "klim-2", name: "Tweede stuk", startKm: 15, endKm: 19 },
]);
const samengevoegd = route([{ slug: "klim-1", name: "De hele klim", startKm: 10, endKm: 19 }]);

const oudPlan = buildBaselinePlan({ route: apart, model: MODEL }).plan;

describe("planLayoutMatchesRoute", () => {
  it("vindt een plan passend bij de route waarop het gemaakt is", () => {
    expect(planLayoutMatchesRoute(routeSnapshot(apart), oudPlan, apart)).toBe(true);
  });

  it("merkt samengevoegde klimmen op bij een nieuw plan", () => {
    expect(planLayoutMatchesRoute(routeSnapshot(apart), oudPlan, samengevoegd)).toBe(false);
  });

  it("merkt het ook op bij een plan van vóór de wijziging, zonder km-grenzen in de snapshot", () => {
    const oudeSnapshot = { totalKm: 30, accentIds: ["klim-1", "klim-2"] };
    expect(planLayoutMatchesRoute(oudeSnapshot, oudPlan, samengevoegd)).toBe(false);
  });

  it("merkt een verlegde klim op met hetzelfde aantal klimmen", () => {
    const verlegd = route([
      { slug: "klim-1", name: "Eerste stuk", startKm: 9, endKm: 14 },
      { slug: "klim-2", name: "Tweede stuk", startKm: 15, endKm: 19 },
    ]);
    expect(planLayoutMatchesRoute(routeSnapshot(apart), oudPlan, verlegd)).toBe(false);
  });

  it("negeert een hernoemde klim", () => {
    const hernoemd = route([
      { slug: "klim-1", name: "Col de Nieuw", startKm: 10, endKm: 14 },
      { slug: "klim-2", name: "Tweede stuk", startKm: 15, endKm: 19 },
    ]);
    expect(planLayoutMatchesRoute(routeSnapshot(apart), oudPlan, hernoemd)).toBe(true);
  });
});

describe("withLayoutStaleness", () => {
  it("meldt het plan als verouderd, ook zonder andere redenen", () => {
    const fresh = checkStaleness(null, {
      cpWatts: 280,
      wPrimeJoules: 20_000,
      ftpWatts: null,
      weightKg: 70,
      routeSyncedAt: null,
    });
    const result = withLayoutStaleness(fresh, false);
    expect(result.stale).toBe(true);
    expect(result.reasons).toEqual(["indeling"]);
    expect(withLayoutStaleness(fresh, true).stale).toBe(false);
  });
});

describe("carryTargetsOver", () => {
  it("volgt de nieuwe indeling en houdt eigen doelen op stukken die gelijk bleven", () => {
    const eigen = oudPlan.map((segment) =>
      segment.accentId ? segment : { ...segment, targetWkg: 2.22 },
    );
    const nieuw = buildBaselinePlan({ route: samengevoegd, model: MODEL }).plan;
    const result = carryTargetsOver(eigen, nieuw);

    expect(planLayoutMatchesRoute(routeSnapshot(samengevoegd), result, samengevoegd)).toBe(true);
    expect(result.some((segment) => segment.accentId === "klim-2")).toBe(false);
    // Het vlakke begin is niet veranderd, dus daar staat het eigen doel nog.
    expect(result[0].startKm).toBe(0);
    expect(result[0].targetWkg).toBe(2.22);
  });
});

describe("recomputedOrigin", () => {
  const summary = {
    strategy: "Glandon strak afronden.",
    risks: ["Te hard op de Glandon."],
  } as PlanSummary;

  it("houdt bron en AI-strategie bij een herberekening op dezelfde indeling", () => {
    const origin = recomputedOrigin({ source: "ai", summary, ai_generation_id: "gen-1" }, false);
    expect(origin).toEqual({
      source: "ai",
      aiGenerationId: "gen-1",
      strategy: "Glandon strak afronden.",
      risks: ["Te hard op de Glandon."],
    });
  });

  it("laat geen AI-tekst staan boven een nieuwe basisindeling", () => {
    const origin = recomputedOrigin({ source: "ai", summary, ai_generation_id: "gen-1" }, true);
    expect(origin).toEqual({ source: "baseline", aiGenerationId: null, strategy: null, risks: [] });
  });

  it("houdt een handmatig plan handmatig, zonder de oude strategie", () => {
    const origin = recomputedOrigin({ source: "manual", summary, ai_generation_id: "gen-1" }, true);
    expect(origin.source).toBe("manual");
    expect(origin.strategy).toBeNull();
  });
});
