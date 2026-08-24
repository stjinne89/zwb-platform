import { describe, expect, it } from "vitest";
import {
  adaptiveDailyPrompt,
  defaultTrainingPrompt,
  planUpdatePrompt,
} from "@/lib/training/workouts";

describe("training prompts", () => {
  it("trekt een weekuitzondering niet door naar andere weken", () => {
    const prompt = planUpdatePrompt();
    expect(prompt).toContain("één specifieke week");
    expect(prompt).toContain("nooit door naar maandagen in andere weken");
  });

  it("gebruikt de vrije feedback van het lid bij volgende bijstellingen", () => {
    expect(defaultTrainingPrompt()).toContain("athleteReport");
    expect(adaptiveDailyPrompt()).toContain("yesterday.athleteRpe");
    expect(adaptiveDailyPrompt()).toContain("athleteReport");
  });
});
