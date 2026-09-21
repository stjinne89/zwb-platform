import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { estimateRide, solveSpeedMs, DRIVETRAIN_EFF, AIR_DENSITY } from "@/lib/ride-estimate";
import { adoptGeneratedPlan } from "@/lib/pacing/adopt";
import { buildBaselinePlan } from "@/lib/pacing/baseline";
import type { GeneratedPacingPlan } from "@/lib/pacing/ai";
import type { CpModel } from "@/lib/pacing/cp";
import { validateEditedPlan } from "@/lib/pacing/edit";
import {
  evaluatePlan,
  imposeFixedPieces,
  raceFixedRanges,
  RACE_RESERVE_FRACTION,
  rebalancePlan,
  type PlanSegment,
} from "@/lib/pacing/plan";
import { rideContextFor, rideKey } from "@/lib/pacing/ride-context";
import {
  assignLapSurfaces,
  pacingRouteFromZwift,
  surfaceSections,
  type PacingRoute,
} from "@/lib/pacing/route-profile";
import { withRideStaleness, type PlanAssumptions } from "@/lib/pacing/staleness";
import {
  constraintsFromZwiftEvent,
  defaultSetup,
  frontalArea,
  normalizeSetup,
  positionCdaFactor,
  resolveRidePhysics,
  ZWIFT_BASE_BIKE_KG,
  ZWIFT_BASE_CDA,
  type BikePart,
  type EventConstraints,
  type RidePhysics,
} from "@/lib/pacing/zwift-setup";
import { zwiftEventRules } from "@/lib/events/zwift-route";
import type { ZwiftEventApiRow } from "@/lib/events/external-scan";
import type { RouteProfile } from "@/lib/events/zwift-route-streams";
import { crrFor, pointInPolygon, surfaceAt, surfacesAlongShape } from "@/lib/zwift/surfaces";
import { SURFACE_POLYGONS } from "@/lib/zwift/surfaces/polygons";

const MODEL: CpModel = { cpWatts: 280, wPrimeJoules: 20_000, source: "intervals", weightKg: 70 };
const fixtures = path.join(__dirname, "..", "fixtures", "zwift");
const EVENTS = JSON.parse(readFileSync(path.join(fixtures, "event-rules.json"), "utf8")) as ZwiftEventApiRow[];

const STANDARD: EventConstraints = constraintsFromZwiftEvent({
  eventType: "RACE",
  rules: [],
  tags: [],
});

function physics(overrides: Partial<Parameters<typeof resolveRidePhysics>[0]> = {}): RidePhysics {
  return resolveRidePhysics({
    setup: defaultSetup(STANDARD),
    constraints: STANDARD,
    parts: [],
    weightKg: MODEL.weightKg,
    heightCm: null,
    ...overrides,
  });
}

/** Vlak en dan een klim van 3 km à 7 %, 12 km in totaal. */
function profile(climb = true): RouteProfile {
  const distanceM: number[] = [];
  const altitudeM: number[] = [];
  let altitude = 0;
  for (let d = 0; d <= 12_000; d += 25) {
    distanceM.push(d);
    altitudeM.push(altitude);
    if (climb && d >= 6000 && d < 9000) altitude += 0.07 * 25;
  }
  return { distanceM, altitudeM };
}

function route(options: { climb?: boolean; finishClimb?: boolean } = {}): PacingRoute {
  const accents = options.finishClimb
    ? [{ slug: "slot", name: "Slotklim", kind: "climb" as const, startKm: 9, endKm: 12, avgInclinePct: 7 }]
    : options.climb === false
      ? []
      : [{ slug: "klim", name: "Klim", kind: "climb" as const, startKm: 6, endKm: 9, avgInclinePct: 7 }];
  return pacingRouteFromZwift({
    profile: profile(options.climb !== false),
    accents,
    leadInKm: 0,
    leadInElevationM: 0,
    lapKm: 12,
    laps: 1,
  });
}

const flatPlan = (wkg = 3.5): PlanSegment[] => [
  { startKm: 0, endKm: 12, targetWkg: wkg, label: "Alles", effort: "tempo" },
];

describe("ride-estimate per segment", () => {
  it("rekent zonder afwijkingen precies als voorheen", () => {
    const segments = [{ distanceM: 1000, gradient: 0.02, watts: 250 }];
    const base = estimateRide({ segments, totalMassKg: 80 });
    const same = estimateRide({ segments: [{ ...segments[0], cda: 0.32, crr: 0.005, massKg: 80 }], totalMassKg: 80 });
    expect(same.totalSeconds).toBeCloseTo(base.totalSeconds, 6);
  });

  it("minder luchtweerstand op één segment maakt alleen dat segment sneller", () => {
    const segments = [
      { distanceM: 1000, gradient: 0, watts: 250 },
      { distanceM: 1000, gradient: 0, watts: 250, cda: 0.2 },
    ];
    const result = estimateRide({ segments, totalMassKg: 80 });
    expect(result.segments[1].durationS).toBeLessThan(result.segments[0].durationS);
  });
});

describe("ijking op de ZwiftInsider-referentie", () => {
  const mph = (ms: number) => ms / 0.44704;
  const opts = { cda: ZWIFT_BASE_CDA, crr: 0.004, airDensity: AIR_DENSITY, drivetrainEff: DRIVETRAIN_EFF, massKg: 75 + ZWIFT_BASE_BIKE_KG };

  it("reproduceert de vlakke snelheid op Tempus Fugit binnen 1 %", () => {
    expect(Math.abs(mph(solveSpeedMs(300, 0, opts)) / 24.574 - 1)).toBeLessThan(0.01);
    expect(Math.abs(mph(solveSpeedMs(150, 0, opts)) / 18.964 - 1)).toBeLessThan(0.01);
  });

  it("reproduceert de klimsnelheid op de Alpe binnen 1 %", () => {
    const grade = 1036 / 12200;
    expect(Math.abs(mph(solveSpeedMs(300, grade, opts)) / 9.2011 - 1)).toBeLessThan(0.01);
    expect(Math.abs(mph(solveSpeedMs(150, grade, opts)) / 4.7855 - 1)).toBeLessThan(0.01);
  });
});

describe("regels van een Zwift-event", () => {
  const byName = (part: string) => EVENTS.find((event) => event.name?.includes(part))!;

  it("voegt regels van event en subgroepen samen en laat tijdstempels weg", () => {
    const rules = zwiftEventRules(byName("Ocean Lava"));
    expect(rules.eventType).toBe("RACE");
    expect(rules.rules).toContain("NO_TT_BIKES");
    expect(rules.tags.some((tag) => tag.startsWith("timestamp="))).toBe(false);
  });

  it("leest powerup_percent als de uitgedeelde powerups", () => {
    const constraints = constraintsFromZwiftEvent(zwiftEventRules(byName("Ocean Lava")));
    expect(constraints.powerups).toEqual(["feather", "anvil"]);
    expect(constraints.suggestedFormat).toBe("race");
    expect(constraints.ttBikesAllowed).toBe(false);
    expect(constraints.forcedWheels).toBe(true);
  });

  it("NO_POWERUPS betekent geen powerups", () => {
    expect(constraintsFromZwiftEvent(zwiftEventRules(byName("Makuri Pretzel"))).powerups).toEqual([]);
  });

  it("een tijdrit zonder drafting wordt format tijdrit", () => {
    const constraints = constraintsFromZwiftEvent(zwiftEventRules(byName("Zwift TT")));
    expect(constraints.suggestedFormat).toBe("tt");
    expect(constraints.drafting).toBe(false);
  });

  it("herkent dubbele slipstream en een opgelegd frame", () => {
    expect(constraintsFromZwiftEvent(zwiftEventRules(byName("Hill Climb"))).doubleDraft).toBe(true);
    expect(zwiftEventRules(byName("BANDWAGON")).bikeHash).toBe(687998653);
  });

  it("zonder regels: een gewone wedstrijd met de standaardpowerups", () => {
    const constraints = constraintsFromZwiftEvent(null);
    expect(constraints.suggestedFormat).toBe("race");
    expect(constraints.powerups).toEqual(["feather", "draft", "aero"]);
  });
});

describe("fiets en renner", () => {
  const parts: BikePart[] = [
    { part: "frame", name: "Aero", kind: "road", testFrame: null, stage: 0, cdaDelta: -0.02, kgDelta: 0.5 },
    { part: "frame", name: "Aero", kind: "road", testFrame: null, stage: 5, cdaDelta: -0.03, kgDelta: 0 },
    { part: "frame", name: "TT", kind: "tt", testFrame: null, stage: 0, cdaDelta: -0.04, kgDelta: 2 },
    { part: "wheel", name: "Disc", kind: "road", testFrame: "Zwift Carbon", stage: 0, cdaDelta: -0.01, kgDelta: 0.7 },
  ];

  it("de referentierenner op de referentiefiets rijdt met de basis-CdA", () => {
    const result = resolveRidePhysics({
      setup: defaultSetup(STANDARD),
      constraints: STANDARD,
      parts,
      weightKg: 75,
      heightCm: 183,
    });
    expect(result.cda).toBeCloseTo(ZWIFT_BASE_CDA, 6);
    expect(result.bikeKg).toBeCloseTo(ZWIFT_BASE_BIKE_KG, 6);
  });

  it("telt frame en wielen op en valt terug op het hoogste gemeten upgradeniveau", () => {
    const at = (stage: number) =>
      resolveRidePhysics({
        setup: { ...defaultSetup(STANDARD), frame: "Aero", wheels: "Disc", stage },
        constraints: STANDARD,
        parts,
        weightKg: 75,
        heightCm: 183,
      });
    expect(at(0).cda).toBeCloseTo(ZWIFT_BASE_CDA - 0.03, 6);
    expect(at(3).cda).toBeCloseTo(ZWIFT_BASE_CDA - 0.03, 6);
    expect(at(5).cda).toBeCloseTo(ZWIFT_BASE_CDA - 0.04, 6);
  });

  it("een verboden tijdritfiets wordt de referentiefiets", () => {
    const noTt = { ...STANDARD, ttBikesAllowed: false };
    const result = resolveRidePhysics({
      setup: { ...defaultSetup(noTt), frame: "TT" },
      constraints: noTt,
      parts,
      weightKg: 75,
      heightCm: 183,
    });
    expect(result.kind).toBe("road");
    expect(result.cda).toBeCloseTo(ZWIFT_BASE_CDA, 6);
  });

  it("een grotere renner vangt meer wind", () => {
    expect(frontalArea(195, 90)).toBeGreaterThan(frontalArea(165, 55));
  });

  it("schoont een ingestuurde opzet op", () => {
    const fallback = defaultSetup(STANDARD);
    expect(normalizeSetup({ format: "onzin", stage: 9 }, fallback)).toMatchObject({
      format: "race",
      stage: 5,
    });
    expect(normalizeSetup({ format: "ttt", teamSize: 12 }, fallback).teamSize).toBe(4);
  });
});

describe("slipstream", () => {
  it("in de groep is het vlak sneller dan alleen, op de klim scheelt het weinig", () => {
    const race = physics();
    const tt = physics({ setup: { ...defaultSetup(STANDARD), format: "tt" } });
    const r = route();
    const inBunch = evaluatePlan(flatPlan(), r, MODEL, { ride: race });
    const alone = evaluatePlan(flatPlan(), r, MODEL, { ride: tt });
    expect(inBunch.totalSeconds).toBeLessThan(alone.totalSeconds * 0.95);

    const climbTime = (evaluation: typeof inBunch) =>
      evaluation.accents[0].durationS;
    expect(climbTime(inBunch) / climbTime(alone)).toBeGreaterThan(0.93);
  });

  it("zonder drafting in het event helpt 'in de groep' niets", () => {
    const noDraft = { ...STANDARD, drafting: false };
    const ride = resolveRidePhysics({ setup: defaultSetup(noDraft), constraints: noDraft, parts: [], weightKg: 70, heightCm: null });
    expect(positionCdaFactor(ride, "bunch")).toBe(1);
  });

  it("een ploegentijdrit zit tussen alleen en in de groep", () => {
    const ttt = physics({ setup: { ...defaultSetup(STANDARD), format: "ttt", teamSize: 4 } });
    const factor = positionCdaFactor(ttt, undefined);
    expect(factor).toBeGreaterThan(0.7);
    expect(factor).toBeLessThan(1);
  });
});

describe("wegdek", () => {
  it("ray casting op een vierkant", () => {
    const square: Array<[number, number]> = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]];
    expect(pointInPolygon(0.5, 0.5, square)).toBe(true);
    expect(pointInPolygon(1.5, 0.5, square)).toBe(false);
  });

  it("vindt onverhard weg in Watopia en asfalt daarbuiten", () => {
    const dirt = SURFACE_POLYGONS.watopia.find((item) => item.type === "dirt")!;
    const [lat, lon] = dirt.polygon
      .slice(0, -1)
      .reduce(([a, b], [c, d]) => [a + c, b + d], [0, 0])
      .map((sum) => sum / (dirt.polygon.length - 1));
    // Bij dit vlak ligt het zwaartepunt van de hoekpunten erbinnen (nagemeten).
    expect(pointInPolygon(lat, lon, dirt.polygon)).toBe(true);
    expect(surfaceAt("watopia", lat, lon)).toBe("dirt");
    expect(surfaceAt("watopia", 0, 0)).toBe("tarmac");
    expect(surfaceAt("onbekend", lat, lon)).toBe("tarmac");
    expect(surfacesAlongShape("watopia", null)).toEqual([]);
  });

  it("een racefiets rolt op onverhard trager dan een gravelbike, op asfalt omgekeerd", () => {
    expect(crrFor("dirt", "road")).toBeGreaterThan(crrFor("dirt", "gravel"));
    expect(crrFor("tarmac", "road")).toBeLessThan(crrFor("tarmac", "gravel"));
    expect(crrFor("grass", "road")).toBe(crrFor("grass", "mtb"));
  });

  it("legt het wegdek van een ronde over lead-in en ronden", () => {
    const lap: RouteProfile = { distanceM: [0, 25, 50, 75, 100, 125, 150, 175, 200], altitudeM: new Array(9).fill(0) };
    const base = pacingRouteFromZwift({ profile: lap, accents: [], leadInKm: 0.1, leadInElevationM: 0, lapKm: 0.2, laps: 2 });
    // Vorm op 100 m: punt 0 asfalt, punt 1 en 2 onverhard. 100 m lead-in plus
    // twee ronden van 200 m: vijf segmenten, midden op 50, 150, …, 450 m. De
    // lead-in is asfalt; in elke ronde ligt het midden op 50 en 150 m, dichtst
    // bij vormpunt 1 en 2.
    const segments = assignLapSurfaces(base.segments, lap, ["tarmac", "dirt", "dirt"], {
      leadInKm: 0.1,
      shapeStepM: 100,
    });
    expect(segments.map((segment) => segment.surface)).toEqual([
      "tarmac",
      "dirt",
      "dirt",
      "dirt",
      "dirt",
    ]);
    expect(surfaceSections(segments).every((section) => section.surface === "dirt")).toBe(true);
  });

  it("de fietskeuze telt op een route met gravel", () => {
    const r = route({ climb: false });
    const dirtRoute: PacingRoute = {
      ...r,
      segments: r.segments.map((segment) => ({ ...segment, surface: "dirt" as const })),
    };
    const road = physics();
    const gravel: RidePhysics = { ...road, kind: "gravel", rolling: "gravel" };
    const onDirt = (ride: RidePhysics) => evaluatePlan(flatPlan(), dirtRoute, MODEL, { ride }).totalSeconds;
    const onTarmac = (ride: RidePhysics) => evaluatePlan(flatPlan(), r, MODEL, { ride }).totalSeconds;
    expect(onDirt(gravel)).toBeLessThan(onDirt(road));
    expect(onTarmac(gravel)).toBeGreaterThan(onTarmac(road));
  });
});

describe("powerups", () => {
  const r = route({ climb: false });
  const plan = (powerup: PlanSegment["powerup"]): PlanSegment[] => [
    { startKm: 0, endKm: 6, targetWkg: 3.5, label: "Eerste helft", effort: "tempo", position: "alone" },
    { startKm: 6, endKm: 12, targetWkg: 3.5, label: "Tweede helft", effort: "tempo", position: "alone", powerup },
  ];

  it("een aerohelm scheelt een paar seconden, niet meer", () => {
    const ride = physics({ constraints: { ...STANDARD, powerups: ["aero"] } });
    const without = evaluatePlan(plan(null), r, MODEL, { ride }).totalSeconds;
    const withAero = evaluatePlan(plan("aero"), r, MODEL, { ride }).totalSeconds;
    expect(without - withAero).toBeGreaterThan(0.5);
    expect(without - withAero).toBeLessThan(5);
  });

  it("een powerup die het event niet uitdeelt telt niet", () => {
    const ride = physics({ constraints: { ...STANDARD, powerups: [] } });
    const without = evaluatePlan(plan(null), r, MODEL, { ride }).totalSeconds;
    expect(evaluatePlan(plan("aero"), r, MODEL, { ride }).totalSeconds).toBeCloseTo(without, 6);
  });

  it("een draft boost werkt alleen in de groep", () => {
    const ride = physics({ constraints: { ...STANDARD, powerups: ["draft"] } });
    const alone = evaluatePlan(plan("draft"), r, MODEL, { ride }).totalSeconds;
    expect(alone).toBeCloseTo(evaluatePlan(plan(null), r, MODEL, { ride }).totalSeconds, 6);
  });

  it("een veer op de klim maakt die sneller", () => {
    const hilly = route();
    const ride = physics({ constraints: { ...STANDARD, powerups: ["feather"] } });
    const climbPlan = (powerup: PlanSegment["powerup"]): PlanSegment[] => [
      { startKm: 0, endKm: 6, targetWkg: 3, label: "Aanloop", effort: "tempo" },
      { startKm: 6, endKm: 9, targetWkg: 3.8, label: "Klim", effort: "drempel", accentId: "klim", powerup },
      { startKm: 9, endKm: 12, targetWkg: 3, label: "Uitloop", effort: "tempo" },
    ];
    const without = evaluatePlan(climbPlan(null), hilly, MODEL, { ride }).totalSeconds;
    expect(evaluatePlan(climbPlan("feather"), hilly, MODEL, { ride }).totalSeconds).toBeLessThan(without - 1);
  });
});

describe("start en sprint in een wedstrijd", () => {
  it("komen erbij in een wedstrijd en niet in een tijdrit", () => {
    const r = route();
    const race = imposeFixedPieces(flatPlan(), r, MODEL, physics());
    expect(race.map((piece) => piece.kind).filter(Boolean)).toEqual(["start", "sprint"]);
    expect(race[race.length - 1].endKm).toBeCloseTo(r.totalKm, 6);
    const tt = imposeFixedPieces(flatPlan(), r, MODEL, physics({ setup: { ...defaultSetup(STANDARD), format: "tt" } }));
    expect(tt.some((piece) => piece.kind)).toBe(false);
  });

  it("gaan op in de buurman als het format verandert", () => {
    const r = route();
    const race = imposeFixedPieces(flatPlan(), r, MODEL, physics());
    const back = imposeFixedPieces(race, r, MODEL, physics({ setup: { ...defaultSetup(STANDARD), format: "tt" } }));
    expect(back.some((piece) => piece.kind === "start" || piece.kind === "sprint")).toBe(false);
    expect(back[0].startKm).toBe(0);
    expect(back[back.length - 1].endKm).toBeCloseTo(r.totalKm, 6);
  });

  it("geen sprint als de finish op een klim ligt", () => {
    expect(raceFixedRanges(route({ finishClimb: true }), physics()).map((range) => range.kind)).toEqual(["start"]);
  });

  it("houden hun eigen doel bij terugschalen, en er blijft reserve voor de sprint", () => {
    const r = route();
    const ride = physics();
    const greedy = imposeFixedPieces(flatPlan(4.6), r, MODEL, ride);
    const sprintBefore = greedy.find((piece) => piece.kind === "sprint")!.targetWkg;
    const result = rebalancePlan(greedy, r, MODEL, null, { ride });
    const sprint = result.plan.find((piece) => piece.kind === "sprint")!;
    // Een sprint van 11 w/kg bij CP 4 w/kg, niet 17: een vast deel van W′.
    expect(sprintBefore).toBeGreaterThan(9);
    expect(sprintBefore).toBeLessThan(13);
    // Bij CP rijden laat te weinig over voor de volle sprint: die gaat dan naar
    // wat er over is, niet de rest van het plan onder CP.
    expect(sprint.targetWkg).toBeLessThanOrEqual(sprintBefore);
    expect(sprint.targetWkg).toBeGreaterThan(MODEL.cpWatts / MODEL.weightKg * 1.5);
    expect(result.evaluation.feasible).toBe(true);
    const endKms = r.segments.map((_, i) => (i + 1) * 0.1);
    const before = result.evaluation.wPrime.balanceBySegment.filter(
      (_, i) => endKms[i] <= sprint.startKm + 1e-9,
    );
    expect(Math.min(...before)).toBeGreaterThanOrEqual(MODEL.wPrimeJoules * RACE_RESERVE_FRACTION - 1);
    // Teruggeschaald is het middenstuk, niet de start of de sprint.
    expect(result.plan.find((piece) => !piece.kind)!.targetWkg).toBeLessThan(4.6);
  });

  it("het basisvoorstel voor een wedstrijd is haalbaar", () => {
    const result = buildBaselinePlan({ route: route(), model: MODEL, ride: physics() });
    expect(result.evaluation.feasible).toBe(true);
    expect(result.plan.map((piece) => piece.kind).filter(Boolean)).toEqual(["start", "sprint"]);
    expect(result.plan.filter((piece) => piece.label === "Start")).toHaveLength(1);
  });
});

describe("bewerken en AI", () => {
  const r = route();
  const ride = physics({ constraints: { ...STANDARD, powerups: ["feather"] } });

  it("neemt positie en een toegestane powerup over, de rest niet", () => {
    const input = imposeFixedPieces(flatPlan(), r, MODEL, ride).map((piece, index) => ({
      startKm: piece.startKm,
      endKm: piece.endKm,
      targetWkg: piece.targetWkg,
      label: piece.label,
      kind: piece.kind ?? null,
      position: index === 1 ? "alone" : "zwevend",
      powerup: index === 1 ? "feather" : "aero",
    }));
    const result = validateEditedPlan(input, r, MODEL, [], ride);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const middle = result.segments.find((piece) => !piece.kind)!;
    expect(middle.position).toBe("alone");
    expect(middle.powerup).toBe("feather");
    expect(result.segments.filter((piece) => piece.powerup === "aero")).toEqual([]);
    expect(result.segments.some((piece) => piece.kind === "sprint")).toBe(true);
  });

  it("laat van de AI alleen geldige posities en powerups staan", () => {
    const generated: GeneratedPacingPlan = {
      strategy: "",
      risks: [],
      segments: [
        { startKm: 0, endKm: 6, targetWkg: 3, label: "A", effort: "tempo", rationale: "", accentId: "", position: "alone", powerup: "aero" },
        { startKm: 6, endKm: 12, targetWkg: 3.4, label: "B", effort: "drempel", rationale: "", accentId: "klim", position: "", powerup: "feather" },
      ],
    };
    const adopted = adoptGeneratedPlan(generated, r, MODEL, { ride });
    const a = adopted.plan.find((piece) => piece.label === "A")!;
    const b = adopted.plan.find((piece) => piece.label === "B")!;
    expect(a.position).toBe("alone");
    expect(a.powerup).toBeUndefined();
    expect(b.powerup).toBe("feather");
  });
});

describe("verouderd door de opzet", () => {
  const zwift = { constraints: STANDARD, parts: [] as BikePart[] };
  const assumptions: PlanAssumptions = {
    cpWatts: 280,
    wPrimeJoules: 20000,
    ftpWatts: null,
    weightKg: 70,
    cpSource: "intervals",
    routeSyncedAt: null,
    computedAt: "2026-09-21T00:00:00Z",
  };
  const fresh = { stale: false, reasons: [], messages: [] };

  it("een Zwift-plan zonder opzet is één keer verouderd", () => {
    const ride = rideContextFor(zwift, null, 70)!;
    expect(withRideStaleness(fresh, assumptions, ride.key).reasons).toEqual(["opzet"]);
    expect(withRideStaleness(fresh, { ...assumptions, rideKey: ride.key }, ride.key).stale).toBe(false);
  });

  it("de vingerafdruk hangt niet aan gewicht of lengte", () => {
    expect(rideContextFor(zwift, null, 70)!.key).toBe(rideContextFor(zwift, null, 71, 190)!.key);
    expect(rideContextFor(zwift, null, 70, 190)!.physics.cda).toBeGreaterThan(
      rideContextFor(zwift, null, 70, 160)!.physics.cda,
    );
    expect(rideKey(physics())).not.toBe(rideKey(physics({ setup: { ...defaultSetup(STANDARD), format: "tt" } })));
  });

  it("een .gpx-route heeft geen opzet", () => {
    expect(rideContextFor(null, null, 70)).toBeNull();
    expect(withRideStaleness(fresh, assumptions, null).stale).toBe(false);
  });
});
