import { describe, expect, it } from "vitest";
import { adaptDay, formOfPlanned } from "@/lib/training/engine/daily";
import type { BuildSession, CatalogSession, SessionForm, TrainingAiInput } from "@/lib/training/engine/types";
import { baseInput } from "./fixtures";

const INTENSITY: Record<SessionForm, CatalogSession["intensity"]> = {
  herstel: "recovery",
  rustige_duur: "endurance",
  intensieve_duur: "endurance",
  lange_duur: "endurance",
  tempo: "tempo",
  sweetspot: "tempo",
  drempel: "threshold",
  vo2max: "vo2max",
  anaeroob: "anaerobic",
  sprint: "anaerobic",
  openers: "endurance",
};
const MIN_MINUTES: Partial<Record<SessionForm, number>> = { drempel: 50, vo2max: 45 };

/** Stub: één blok van de gevraagde duur; null als de kern niet past. */
const stubSession: BuildSession = (request) => {
  const minutes = Math.min(request.targetMinutes, request.maxMinutes);
  if (minutes < (MIN_MINUTES[request.form] ?? 20)) return null;
  return {
    form: request.form,
    title: `${request.form} ${minutes}`,
    description: "Stub.",
    intensity: INTENSITY[request.form],
    targetType: "power",
    blocks: [{ label: "Kern", durationMinutes: minutes, target: "65-70%", notes: "", intensity: INTENSITY[request.form] }],
    durationMinutes: minutes,
    methodLabel: "geen",
  };
};

// Dinsdag 2026-10-20: vandaag drempel, donderdag VO2max, zaterdag lange duur.
function dayInput(overrides: Partial<TrainingAiInput> = {}): TrainingAiInput {
  return baseInput({
    currentPlan: {
      title: "ZRL-blok",
      fromDate: "2026-10-20",
      toDate: "2026-10-25",
      workouts: [
        { date: "2026-10-20", title: "Drempel 3x12", durationMinutes: 75, intensity: "threshold" },
        { date: "2026-10-22", title: "VO2max 5x4", durationMinutes: 70, intensity: "vo2max" },
        { date: "2026-10-24", title: "Rustige duur 180 min", durationMinutes: 180, intensity: "endurance" },
      ],
    },
    today: null,
    todayRides: [],
    yesterday: null,
    ...overrides,
  });
}

const rules = (result: ReturnType<typeof adaptDay>) => result.reasons.map((reason) => reason.rule);

describe("adaptDay", () => {
  it("laat het schema met rust zonder signaal", () => {
    const result = adaptDay(dayInput(), stubSession);
    expect(result.workouts).toEqual([]);
    expect(rules(result)).toContain("dag.geen_wijziging");
  });

  it("maakt de sleutelsessie van vandaag rustige duur bij vermoeidheid", () => {
    const result = adaptDay(dayInput({ today: { availableMinutes: null, feeling: "tired", note: null } }), stubSession);
    expect(result.workouts).toHaveLength(1);
    expect(result.workouts[0]).toMatchObject({ date: "2026-10-20", intensity: "endurance" });
    expect(result.workouts[0].durationMinutes).toBeLessThanOrEqual(60);
    expect(rules(result)).toContain("dag.te_moe");
  });

  it("verlicht de eerstvolgende sleutelsessie na een zwaardere dag", () => {
    const input = dayInput({
      todayRides: [{ name: "Rondje", minutes: 40, load: 25 }],
      yesterday: {
        plannedTitle: "Rustige duur 60 min",
        plannedMinutes: 60,
        plannedIntensity: "endurance",
        actualName: "Lange rit",
        actualMinutes: 150,
        actualLoad: 140,
        athleteRpe: null,
        athleteFeel: null,
        athleteReport: null,
      },
    });
    const result = adaptDay(input, stubSession);
    // Vandaag al gereden: de drempel van vandaag blijft liggen, donderdag wordt lichter.
    expect(result.workouts.map((workout) => workout.date)).toEqual(["2026-10-22"]);
    expect(result.workouts[0].intensity).toBe("endurance");
    expect(rules(result)).toEqual(expect.arrayContaining(["dag.al_gereden", "dag.zwaarder_gisteren"]));
  });

  it("telt de optionele rit op een rustdag niet als extra belasting", () => {
    const input = dayInput({
      yesterday: {
        plannedTitle: null,
        plannedMinutes: null,
        plannedIntensity: null,
        actualName: "Koffierit",
        actualMinutes: 60,
        actualLoad: 35,
        athleteRpe: null,
        athleteFeel: null,
        athleteReport: null,
      },
    });
    expect(adaptDay(input, stubSession).workouts).toEqual([]);
  });

  it("telt een verschoven training niet als zwaarder", () => {
    const input = dayInput({
      yesterday: {
        plannedTitle: "Rustige duur 60 min",
        plannedMinutes: 60,
        plannedIntensity: "endurance",
        actualName: "Drempel",
        actualMinutes: 80,
        actualLoad: 90,
        actualCountsFor: { date: "2026-10-18", title: "Drempel 3x12", intensity: "threshold", confirmed: true },
        athleteRpe: null,
        athleteFeel: null,
        athleteReport: null,
      },
    });
    expect(adaptDay(input, stubSession).workouts).toEqual([]);
  });

  it("kort in bij minder tijd en houdt de kern als die past", () => {
    const result = adaptDay(dayInput({ today: { availableMinutes: 55, feeling: "normal", note: null } }), stubSession);
    expect(result.workouts[0]).toMatchObject({ date: "2026-10-20", intensity: "threshold", durationMinutes: 55 });
    expect(rules(result)).toContain("dag.weinig_tijd");
  });

  it("valt terug op rustige duur als de kern niet past", () => {
    const result = adaptDay(dayInput({ today: { availableMinutes: 30, feeling: "normal", note: null } }), stubSession);
    expect(result.workouts[0]).toMatchObject({ intensity: "endurance", durationMinutes: 30 });
    expect(rules(result)).toContain("dag.weinig_tijd_vervangen");
  });

  it("overschrijdt de beschikbare minuten nooit", () => {
    for (const minutes of [10, 25, 45, 60, 74]) {
      const result = adaptDay(dayInput({ today: { availableMinutes: minutes, feeling: null, note: null } }), stubSession);
      for (const workout of result.workouts) expect(workout.durationMinutes).toBeLessThanOrEqual(minutes);
    }
  });

  it("plant niets op een dag met een vaste afspraak", () => {
    const input = dayInput({
      fixedWorkouts: [{ date: "2026-10-20", title: "ZRL", durationMinutes: 60, intensity: "race", kind: "clubevent" }],
      today: { availableMinutes: null, feeling: "tired", note: null },
    });
    const result = adaptDay(input, stubSession);
    expect(result.workouts.some((workout) => workout.date === "2026-10-20")).toBe(false);
  });

  it("negeert een negatieve TSB in een trainingskamp", () => {
    const input = dayInput({
      intervalsLoad: { ctl: 60, atl: 110, tsb: -45, eftp: null, rampRate: 5 },
      seasonPlan: {
        targets: [],
        periods: [{ title: "Kamp", from: "2026-10-18", to: "2026-10-25", kind: "kamp" }],
        nextTargetAfterPlan: null,
      },
    });
    expect(adaptDay(input, stubSession).workouts).toEqual([]);
    const home = dayInput({ intervalsLoad: { ctl: 60, atl: 110, tsb: -45, eftp: null, rampRate: 5 } });
    expect(adaptDay(home, stubSession).workouts).toHaveLength(1);
  });

  it("maakt een rustige rit steviger als het lid zich fris meldt", () => {
    const input = dayInput({
      currentPlan: {
        title: "Blok",
        fromDate: "2026-10-20",
        toDate: "2026-10-25",
        workouts: [{ date: "2026-10-20", title: "Rustige duur 90 min", durationMinutes: 90, intensity: "endurance" }],
      },
      today: { availableMinutes: null, feeling: "fresh", note: null },
    });
    const result = adaptDay(input, stubSession);
    expect(result.workouts[0].title).toContain("intensieve_duur");
  });

  it("geeft een rustige rit op een vrije dag als het lid erom vraagt", () => {
    const input = dayInput({
      currentPlan: { title: "Blok", fromDate: "2026-10-21", toDate: "2026-10-25", workouts: [] },
      today: { availableMinutes: 45, feeling: "normal", note: null },
    });
    const result = adaptDay(input, stubSession);
    expect(result.workouts[0]).toMatchObject({ date: "2026-10-21", durationMinutes: 45, intensity: "endurance" });
  });

  it("is deterministisch", () => {
    const input = dayInput({ today: { availableMinutes: 55, feeling: "tired", note: null } });
    expect(adaptDay(input, stubSession)).toEqual(adaptDay(input, stubSession));
  });
});

describe("formOfPlanned", () => {
  it("leidt de vorm af uit intensiteit en titel", () => {
    const at = (title: string, intensity: string, durationMinutes = 60) =>
      formOfPlanned({ date: "2026-10-20", title, intensity, durationMinutes });
    expect(at("Sweet spot 2x20", "tempo")).toBe("sweetspot");
    expect(at("Tempo 3x10", "tempo")).toBe("tempo");
    expect(at("Sprint 6x30s", "anaerobic")).toBe("sprint");
    expect(at("Rustige duur 180 min", "endurance", 180)).toBe("lange_duur");
    expect(at("Intensieve duur 3x15", "endurance")).toBe("intensieve_duur");
    expect(at("ZRL race", "race")).toBeNull();
  });
});
