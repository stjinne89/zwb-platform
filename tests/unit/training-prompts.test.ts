import { describe, expect, it } from "vitest";
import {
  adaptiveDailyPrompt,
  defaultTrainingPrompt,
  dropShortRecoveryRides,
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

  it("stuurt niet op een readiness van een eerdere dag", () => {
    expect(defaultTrainingPrompt()).toContain("wellness.readinessCurrent op false");
  });

  it("plant geen tweede training op een dag waarop al is gereden", () => {
    expect(adaptiveDailyPrompt()).toContain("todayRides");
    expect(adaptiveDailyPrompt()).toContain("geef geen workout met de datum van vandaag terug");
  });

  it("weet bij een bijwerking dat een A-mikpunt wél een piekmoment is", () => {
    expect(planUpdatePrompt()).toContain("A-mikpunt uit seasonPlan");
  });

  it("maakt de wedstrijdspecifieke ZRL-prikkel expliciet", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("goal.type 'zrl'");
    expect(prompt).toContain("één VO2max-, anaerobe of raceprikkel");
    expect(prompt).toContain("herstelweek of concrete vermoeidheidssignalen");
  });

  it("plant een rustdag met een optionele rustige rit in plaats van een korte hersteltraining", () => {
    const prompt = defaultTrainingPrompt();
    expect(prompt).toContain("Plan geen losse hersteltraining korter dan 90 minuten");
    expect(prompt).toContain("Reken die optionele rit niet mee in het weekvolume");
    expect(prompt).toContain("Een korte duurrit is geen hersteltraining");
  });

  it("ziet de optionele rit op een rustdag niet als extra belasting", () => {
    expect(adaptiveDailyPrompt()).toContain("de optionele rit van een rustdag");
    expect(adaptiveDailyPrompt()).toContain("Vraagt het lid met today.availableMinutes zelf om een rit");
  });
});

describe("dropShortRecoveryRides", () => {
  const workout = (intensity: string, durationMinutes: number) => ({ intensity, durationMinutes });

  it("maakt van een korte hersteltraining en een rust-workout een rustdag", () => {
    expect(dropShortRecoveryRides([workout("recovery", 45), workout("rest", 30)])).toEqual([]);
  });

  it("laat langere herstelritten en korte duur- en kwaliteitssessies staan", () => {
    const kept = [workout("recovery", 90), workout("endurance", 45), workout("threshold", 60)];
    expect(dropShortRecoveryRides(kept)).toEqual(kept);
  });
});
