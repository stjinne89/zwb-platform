import { describe, expect, it } from "vitest";
import type { CpModel } from "@/lib/pacing/cp";
import type { PacingRoute } from "@/lib/pacing/route-profile";
import { withDescents } from "@/lib/pacing/route-profile";
import { evaluatePlan } from "@/lib/pacing/plan";
import { buildBaselinePlan } from "@/lib/pacing/baseline";
import {
  emphasisFor,
  fastestPlan,
  forecastGoal,
  formatClock,
  GROUP_CDA_FACTOR,
  realisticCpGainPct,
  type ForecastRider,
} from "@/lib/training/goal-target-time";
import {
  compactRoute,
  forecastForAi,
  forecastIsStale,
  goalRouteLabel,
  weeksUntil,
} from "@/lib/training/goal-forecast";
import { defaultTrainingPrompt } from "@/lib/training/workouts";
import { fitPlanToTime } from "@/lib/pacing/target-time";
import { assessPacingTarget, weeksUntilStart } from "@/lib/pacing/target-assessment";
import type { RidePhysics } from "@/lib/pacing/zwift-setup";
import { parseGoalTargetTime } from "@/lib/training/goal-target-time";

const MODEL: CpModel = { cpWatts: 260, wPrimeJoules: 20_000, source: "intervals", weightKg: 75 };
const RIDER: ForecastRider = { model: MODEL, durability: null, curve: null };

/**
 * Een parcours van `flatKm` vlak met daartussen klimmen van `climbKm` à
 * `gradient`, elk gevolgd door een even lange afdaling.
 */
function route(flatKm: number, climbs: number, climbKm = 8, gradient = 0.06): PacingRoute {
  const segments: PacingRoute["segments"] = [];
  const accents: PacingRoute["accents"] = [];
  const flatPart = flatKm / (climbs + 1);
  const push = (km: number, g: number, accentIndex: number | null) => {
    for (let m = 0; m < km * 1000; m += 100) segments.push({ distanceM: 100, gradient: g, accentIndex });
  };
  let km = 0;
  for (let i = 0; i <= climbs; i++) {
    push(flatPart, 0, null);
    km += flatPart;
    if (i === climbs) break;
    accents.push({
      id: `klim-${i + 1}`,
      name: `Klim ${i + 1}`,
      kind: "climb",
      startKm: km,
      endKm: km + climbKm,
      avgGradient: gradient,
      lap: null,
    });
    push(climbKm, gradient, i);
    km += climbKm;
    push(climbKm, -gradient, null);
    km += climbKm;
  }
  return withDescents({
    source: "gpx",
    totalKm: km,
    hasElevation: true,
    segments,
    accents,
    leadInApproximated: false,
  });
}

describe("groei-vuistregel", () => {
  it("loopt de eerste twaalf weken sneller op en stopt bij 12 %", () => {
    expect(realisticCpGainPct(0)).toBe(0);
    expect(realisticCpGainPct(4)).toBe(3);
    expect(realisticCpGainPct(12)).toBe(9);
    expect(realisticCpGainPct(16)).toBe(10);
    expect(realisticCpGainPct(52)).toBe(12);
    expect(realisticCpGainPct(-3)).toBe(0);
  });
});

describe("groepsrijden", () => {
  it("rekent in een groep sneller op het vlak, met dezelfde watt", () => {
    const r = route(60, 0);
    const plan = buildBaselinePlan({ route: r, model: MODEL }).plan;
    const alone = evaluatePlan(plan, r, MODEL).totalSeconds;
    const group = evaluatePlan(plan, r, MODEL, { cdaFactor: GROUP_CDA_FACTOR }).totalSeconds;
    expect(group).toBeLessThan(alone * 0.95);
  });

  it("laat een Zwift-rit (ride) ongemoeid", () => {
    const r = route(20, 0);
    const plan = buildBaselinePlan({ route: r, model: MODEL }).plan;
    expect(evaluatePlan(plan, r, MODEL, { cdaFactor: 1 }).totalSeconds).toBe(
      evaluatePlan(plan, r, MODEL).totalSeconds,
    );
  });
});

describe("prognose voor een doeltijd", () => {
  const hilly = route(80, 4);

  it("noemt een doeltijd die al binnen bereik is haalbaar, zonder benodigde CP", () => {
    const fastest = fastestPlan(hilly, RIDER).evaluation.totalSeconds;
    const result = forecastGoal({
      route: hilly,
      rider: RIDER,
      targetSeconds: fastest + 600,
      riding: "alone",
      weeksToGoal: 10,
      longestRideMinutes: 400,
    });
    expect(result.verdict).toBe("haalbaar");
    expect(result.requiredCpWatts).toBeNull();
    expect(result.predictedSeconds).toBe(Math.round(fastest));
  });

  it("rekent de benodigde CP uit en toetst die aan de weken tot de datum", () => {
    const fastest = fastestPlan(hilly, RIDER).evaluation.totalSeconds;
    const target = fastest * 0.95;
    const base = {
      route: hilly,
      rider: RIDER,
      targetSeconds: target,
      riding: "alone" as const,
      longestRideMinutes: 400,
    };
    const soon = forecastGoal({ ...base, weeksToGoal: 2 });
    const later = forecastGoal({ ...base, weeksToGoal: 20 });
    const undated = forecastGoal({ ...base, weeksToGoal: null });

    expect(soon.requiredCpWatts).toBeGreaterThan(MODEL.cpWatts);
    expect(soon.requiredGainPct).toBeGreaterThan(3);
    expect(soon.requiredGainPct).toBeLessThan(15);
    expect(soon.verdict).toBe("niet_realistisch");
    expect(later.verdict).toBe("met_groei");
    expect(undated.verdict).toBe("groei_nodig");
    expect(undated.realisticGainPct).toBeNull();

    // Met de benodigde CP haalt het snelste plan de doeltijd ongeveer.
    const stronger: ForecastRider = {
      ...RIDER,
      model: { ...MODEL, cpWatts: soon.requiredCpWatts!, wPrimeJoules: MODEL.wPrimeJoules * (soon.requiredCpWatts! / MODEL.cpWatts) },
    };
    const reached = fastestPlan(hilly, stronger).evaluation.totalSeconds;
    expect(Math.abs(reached - target) / target).toBeLessThan(0.01);
  });

  it("noemt een doel dat ook met anderhalf keer de CP niet lukt buiten bereik", () => {
    const fastest = fastestPlan(hilly, RIDER).evaluation.totalSeconds;
    const result = forecastGoal({
      route: hilly,
      rider: RIDER,
      targetSeconds: fastest * 0.5,
      riding: "alone",
      weeksToGoal: 30,
      longestRideMinutes: null,
    });
    expect(result.verdict).toBe("buiten_bereik");
    expect(result.requiredCpWatts).toBeNull();
  });

  it("geeft gevoeligheden: een kilo telt zwaarder in de bergen, een procent CP overal", () => {
    const flat = route(120, 0);
    const forecastFor = (r: PacingRoute) =>
      forecastGoal({ route: r, rider: RIDER, targetSeconds: 3600, riding: "alone", weeksToGoal: 8, longestRideMinutes: 300 });
    const mountain = forecastFor(route(40, 5, 10, 0.07));
    const plain = forecastFor(flat);
    const perKgShare = (f: ReturnType<typeof forecastFor>) => f.secondsPerKg / f.predictedSeconds;
    expect(perKgShare(mountain)).toBeGreaterThan(perKgShare(plain) * 2);
    expect(plain.secondsPerCpPct).toBeGreaterThan(0);
    expect(mountain.climbShare).toBeGreaterThan(0.35);
    expect(plain.climbShare).toBe(0);
  });

  it("rekent een groepsrit sneller dan alleen", () => {
    const flat = route(120, 0);
    const input = { route: flat, rider: RIDER, targetSeconds: 3600, weeksToGoal: 8, longestRideMinutes: 300 };
    expect(forecastGoal({ ...input, riding: "group" }).predictedSeconds).toBeLessThan(
      forecastGoal({ ...input, riding: "alone" }).predictedSeconds,
    );
  });
});

describe("nadruk", () => {
  const base = {
    targetSeconds: 6 * 3600,
    climbShare: 0.2,
    climbCount: 2,
    avgClimbMinutes: 12,
    durabilityFadePct: 5 as number | null,
    longestRideMinutes: 300 as number | null,
  };

  it("kiest klimmen of drempel op het aandeel klimtijd", () => {
    expect(emphasisFor(base)[0].code).toBe("drempel");
    expect(emphasisFor({ ...base, climbShare: 0.5 })[0].code).toBe("klimmen");
    expect(emphasisFor({ ...base, climbShare: 0.5 })[0].reason).toContain("50%");
  });

  it("vraagt lange ritten als de langste rit te kort is voor de doeltijd", () => {
    expect(emphasisFor(base).map((e) => e.code)).not.toContain("lange_ritten");
    const short = emphasisFor({ ...base, longestRideMinutes: 150 });
    expect(short.map((e) => e.code)).toContain("lange_ritten");
    expect(short.find((e) => e.code === "lange_ritten")!.reason).toContain("2:30");
    expect(emphasisFor({ ...base, targetSeconds: 2 * 3600, longestRideMinutes: 30 }).map((e) => e.code)).not.toContain(
      "lange_ritten",
    );
  });

  it("vraagt duurvermogen bij verval of zonder vermoeidheidsdata, alleen bij lange doelen", () => {
    expect(emphasisFor(base).map((e) => e.code)).not.toContain("duurvermogen");
    expect(emphasisFor({ ...base, durabilityFadePct: 12 }).map((e) => e.code)).toContain("duurvermogen");
    expect(emphasisFor({ ...base, durabilityFadePct: null }).map((e) => e.code)).toContain("duurvermogen");
    expect(
      emphasisFor({ ...base, targetSeconds: 2 * 3600, durabilityFadePct: null }).map((e) => e.code),
    ).not.toContain("duurvermogen");
  });
});

describe("hulpfuncties", () => {
  it("schrijft tijden als u:mm", () => {
    expect(formatClock(6 * 3600 + 15 * 60)).toBe("6:15");
    expect(formatClock(59)).toBe("0:01");
  });

  it("bewaart een parcours zonder overbodige decimalen en zonder afdalingen", () => {
    const r = route(10, 1);
    const compact = compactRoute(r);
    expect(compact.descents).toBeUndefined();
    expect(compact.segments).toHaveLength(r.segments.length);
    expect(JSON.stringify(compact).length).toBeLessThan(JSON.stringify(r).length);
  });

  it("telt weken tot de doeldatum", () => {
    const now = new Date("2026-10-20T12:00:00Z");
    expect(weeksUntil("2026-11-03", now)).toBeCloseTo(2, 5);
    expect(weeksUntil(null, now)).toBeNull();
  });

  it("weet wanneer er een nieuwe prognose hoort", () => {
    const now = new Date("2026-10-20T12:00:00Z");
    const goal = { target_time_seconds: 22_500, target_riding: "alone" };
    const latest = {
      id: "f",
      goal_id: "g",
      computed_at: "2026-10-18T12:00:00Z",
      target_seconds: 22_500,
      predicted_seconds: 24_000,
      verdict: "met_groei" as const,
      cp_watts: 260,
      weight_kg: "75.0",
      required_cp_watts: 270,
      detail: { riding: "alone" as const },
    };
    const current = { cpWatts: 260, weightKg: 75 };
    expect(forecastIsStale(goal, undefined, current, now)).toBe(true);
    expect(forecastIsStale(goal, latest, current, now)).toBe(false);
    expect(forecastIsStale(goal, { ...latest, computed_at: "2026-10-12T12:00:00Z" }, current, now)).toBe(true);
    expect(forecastIsStale({ ...goal, target_time_seconds: 21_600 }, latest, current, now)).toBe(true);
    expect(forecastIsStale({ ...goal, target_riding: "group" }, latest, current, now)).toBe(true);
    expect(forecastIsStale(goal, latest, { cpWatts: 265, weightKg: 75 }, now)).toBe(true);
    expect(forecastIsStale(goal, latest, { cpWatts: 260, weightKg: 74.2 }, now)).toBe(true);
  });
});

describe("doeltijd naar de schema-AI", () => {
  it("geeft de prompt een regel die nadruk geeft maar niets belooft", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("goal.targetTime");
    expect(prompt).toContain("targetTime.emphasis");
    expect(prompt).toContain("beloof niet dat het schema de doeltijd oplevert");
    expect(prompt).toContain("geen reden om meer volume of intensiteit te plannen");
  });

  it("zet een bewaarde prognose om naar de AI-invoer, ook met een oude detailkolom", () => {
    const ai = forecastForAi({
      id: "f",
      goal_id: "g",
      computed_at: "2026-10-20T10:00:00Z",
      target_seconds: 22_500,
      predicted_seconds: 24_000,
      verdict: "ambitieus",
      cp_watts: 260,
      weight_kg: "75.0",
      required_cp_watts: 281,
      detail: {},
    });
    expect(ai.requiredCpWatts).toBe(281);
    expect(ai.emphasis).toEqual([]);
    expect(ai.riding).toBe("alone");
  });
});

describe("invoer en weergave", () => {
  it("leest een doeltijd binnen de grenzen van de kolom", () => {
    expect(parseGoalTargetTime("6:15")).toBe(22_500);
    expect(parseGoalTargetTime("6u15")).toBe(22_500);
    expect(parseGoalTargetTime("0:05")).toBeNull();
    expect(parseGoalTargetTime("25:00")).toBeNull();
    expect(parseGoalTargetTime("zes uur")).toBeNull();
  });

  it("noemt het parcours bij een eigen GPX met afstand en hoogtemeters, anders het event", () => {
    const stored = { name: "Limburgs Mooiste", totalKm: 149.6, elevationM: 1920, route: route(10, 0) };
    expect(goalRouteLabel({ target_route: stored }, new Map())).toBe("Limburgs Mooiste · 150 km · 1920 hm");
    expect(goalRouteLabel({ target_event_id: "e1" }, new Map([["e1", "Clubfondo"]]))).toBe("Clubfondo");
    expect(goalRouteLabel({}, new Map())).toBeNull();
  });
});

describe("doeltijd in de pacingcalculator", () => {
  const hilly = route(80, 4);
  const plan = buildBaselinePlan({ route: hilly, model: MODEL }).plan;
  const now = new Date("2026-10-20T12:00:00Z");
  const data = (targetSeconds: number, startAt = "2026-12-15T09:00:00Z", ride: RidePhysics | null = null) =>
    ({
      event: { start_at: startAt },
      loaded: { route: hilly },
      rider: { ...RIDER, riderType: "allrounder", ftpWatts: 260 },
      plan: { segments: plan, summary: { targetTime: { seconds: targetSeconds, reachable: false, fastestSeconds: 0 } } },
      ride: ride ? { physics: ride } : null,
    }) as unknown as Parameters<typeof assessPacingTarget>[0];

  it("rekent op het eigen plan, met dezelfde snelste tijd als Plan voor deze tijd", () => {
    const fastest = fitPlanToTime(plan, hilly, MODEL, 1).fastestSeconds;
    const result = assessPacingTarget(data(fastest * 0.95), now)!;
    expect(Math.abs(result.predictedSeconds - fastest)).toBeLessThanOrEqual(1);
    expect(result.requiredCpWatts).toBeGreaterThan(MODEL.cpWatts);
    expect(result.weeksToGoal).toBeCloseTo(8, 0);
    expect(result.realisticGainPct).toBe(realisticCpGainPct(result.weeksToGoal!));
  });

  it("zegt niets meer na de start, of zonder doeltijd", () => {
    expect(assessPacingTarget(data(20_000, "2026-10-19T09:00:00Z"), now)).toBeNull();
    const none = { ...data(20_000), plan: { segments: plan, summary: null } } as unknown as Parameters<
      typeof assessPacingTarget
    >[0];
    expect(assessPacingTarget(none, now)).toBeNull();
    expect(weeksUntilStart("2026-11-03T12:00:00Z", now)).toBeCloseTo(2, 5);
  });

  it("rekent met de Zwift-opzet van het event als die er is", () => {
    const zwift: RidePhysics = {
      format: "race",
      cda: 0.3,
      kind: "road",
      rolling: "road",
      bikeKg: 8,
      draftFactor: 0.7,
      pullShare: null,
      powerups: [],
    };
    const target = fitPlanToTime(plan, hilly, MODEL, 1).fastestSeconds;
    const outdoor = assessPacingTarget(data(target), now)!;
    const inZwift = assessPacingTarget(data(target, undefined, zwift), now)!;
    expect(inZwift.predictedSeconds).not.toBe(outdoor.predictedSeconds);
  });
});
