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

  it("laat het A-mikpunt uit de jaarplanning vóór de taperregel op goal.type gaan", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("seasonPlan");
    expect(prompt).toContain("gaat vóór de taperregel op goal.type");
    // De oude regel blijft gelden zolang er geen A-mikpunt ligt; anders zou een
    // basisconditie-doel zonder jaarplanning ineens getaperd worden.
    expect(prompt).toContain("Zonder A-mikpunt in de planperiode");
  });

  it("laat de planner niet door een rustperiode heen bouwen", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("kind 'rust'");
    expect(prompt).toContain("begin geen opbouwblok dat er doorheen loopt");
    expect(prompt).toContain("langer dan tien dagen");
  });

  it("houdt een rustdag ook een rustdag als het lid fris is", () => {
    expect(adaptiveDailyPrompt()).toContain("seasonPlan.periods");
    expect(adaptiveDailyPrompt()).toContain("ook als de signalen fris zijn");
  });

  it("weet bij een bijwerking dat een A-mikpunt wél een piekmoment is", () => {
    expect(planUpdatePrompt()).toContain("A-mikpunt uit seasonPlan");
  });
});
