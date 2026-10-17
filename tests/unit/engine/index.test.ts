// De motor als geheel, getoetst met de meetlat: wat de motor maakt, moet de
// harde regels halen die hij zelf ook aan de AI oplegt.

import { describe, expect, it } from "vitest";
import { engineMode, generateEnginePlan } from "@/lib/training/engine";
import type { TrainingAiInput } from "@/lib/training/engine/types";
import { checkTrainingPlan } from "@/lib/training/schema-check";
import { baseInput } from "./fixtures";

function errors(input: TrainingAiInput) {
  const plan = generateEnginePlan(input);
  return checkTrainingPlan(input, plan.workouts, { from: plan.startDate, to: plan.endDate }).filter(
    (finding) => finding.ernst === "fout",
  );
}

const scenarios: Array<[string, TrainingAiInput]> = [
  ["ZRL, 6 uur", baseInput()],
  ["FTP, beginner", baseInput({ goal: { ...baseInput().goal, type: "ftp", experienceLevel: "beginner" } })],
  [
    "gran fondo met doeldatum",
    baseInput({
      goal: { ...baseInput().goal, type: "gran_fondo", targetDate: "2026-12-20", maxHoursPerWeek: 9 },
      planWindow: { from: "2026-10-19", to: "2026-12-20", goalBeyond: false },
      upcomingEvents: [
        { title: "Gran fondo", type: "gran_fondo", date: "2026-12-20", durationMinutes: 360, distanceKm: 160, elevationM: 2500 },
      ],
      availability: { default: { ma: 0, di: 90, wo: 60, do: 90, vr: 0, za: 300, zo: 180 }, weeks: [] },
    }),
  ],
  [
    "vakantie en kamp",
    baseInput({
      seasonPlan: {
        targets: [{ title: "Clubkampioenschap", date: "2026-12-13", priority: "a" }],
        periods: [
          { title: "Vakantie", from: "2026-11-02", to: "2026-11-08", kind: "rust" },
          { title: "Kamp", from: "2026-11-23", to: "2026-11-29", kind: "kamp" },
        ],
        nextTargetAfterPlan: null,
      },
    }),
  ],
  [
    "vermoeid met vaste ZRL-races",
    baseInput({
      intervalsLoad: { ctl: 60, atl: 100, tsb: -40, eftp: 250, rampRate: 9 },
      fixedWorkouts: [
        { date: "2026-10-20", title: "ZRL", durationMinutes: 60, intensity: "race", kind: "clubevent" },
        { date: "2026-10-27", title: "ZRL", durationMinutes: 60, intensity: "race", kind: "clubevent" },
      ],
    }),
  ],
];

describe("generateEnginePlan", () => {
  it.each(scenarios)("haalt de meetlat zonder fouten: %s", (_name, input) => {
    expect(errors(input)).toEqual([]);
  });

  it("kiest de modus zoals de prompts", () => {
    expect(engineMode(baseInput())).toBe("plan");
    expect(
      engineMode(baseInput({ currentPlan: { title: "x", fromDate: "2026-10-20", toDate: "2026-10-25", workouts: [] } })),
    ).toBe("daily");
  });

  it("is deterministisch", () => {
    expect(generateEnginePlan(baseInput())).toEqual(generateEnginePlan(baseInput()));
  });

  it("vult een blok van twaalf weken", () => {
    const plan = generateEnginePlan(baseInput());
    expect(plan.startDate).toBe("2026-10-19");
    expect(plan.endDate).toBe("2027-01-10");
    expect(plan.workouts.length).toBeGreaterThan(30);
    expect(plan.title.length).toBeLessThanOrEqual(40);
  });
});
