import { describe, expect, it } from "vitest";
import {
  goalTypeFromPromptSummary,
  hasZrlQuality,
  zrlPlanSpecificityCautions,
  zrlUpcomingSpecificityWarning,
} from "@/lib/training/specificity";

describe("ZRL-specificiteit", () => {
  const endurance = (date: string) => ({ date, intensity: "endurance" });

  it("waarschuwt alleen bij een ZRL-schema zonder kwaliteitsprikkel", () => {
    const workouts = [endurance("2026-09-01"), endurance("2026-09-04")];
    expect(zrlPlanSpecificityCautions("base_fitness", workouts)).toEqual([]);
    expect(zrlPlanSpecificityCautions("zrl", workouts)).toHaveLength(1);
  });

  it("telt VO2-blokken in een duurtraining mee", () => {
    const workout = {
      date: "2026-09-03",
      intensity: "endurance",
      structure: [{ intensity: "vo2max" }],
    };
    expect(hasZrlQuality(workout)).toBe(true);
    expect(zrlPlanSpecificityCautions("zrl", [workout])).toEqual([]);
  });

  it("telt een race als wedstrijdspecifieke prikkel", () => {
    expect(
      zrlPlanSpecificityCautions("zrl", [{ date: "2026-09-08", intensity: "race" }]),
    ).toEqual([]);
  });

  it("signaleert een gevulde komende twee weken zonder ZRL-prikkel", () => {
    const workouts = [
      endurance("2026-09-01"),
      endurance("2026-09-05"),
      endurance("2026-09-10"),
      { date: "2026-09-16", intensity: "vo2max" },
    ];
    expect(zrlUpcomingSpecificityWarning("zrl", workouts, "2026-09-01")).toContain(
      "komende twee weken",
    );
    expect(zrlUpcomingSpecificityWarning("base_fitness", workouts, "2026-09-01")).toBeNull();
  });

  it("leest het doeltype uit de opgeslagen AI-invoer", () => {
    expect(goalTypeFromPromptSummary('{"goal":{"type":"zrl"}}')).toBe("zrl");
    expect(goalTypeFromPromptSummary("geen json")).toBeNull();
  });
});
