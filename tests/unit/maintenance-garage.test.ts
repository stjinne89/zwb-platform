import { describe, expect, it } from "vitest";
import {
  componentTypesFor,
  metricFor,
  resolveThreshold,
} from "@/lib/maintenance/component-types";
import { guessDiscipline } from "@/lib/maintenance/guess-discipline";
import { monthsSince, wearProgress, wearStatus } from "@/lib/maintenance/status";

describe("catalogus per discipline", () => {
  it("stelt alleen onderdelen voor die op dat fietstype bestaan", () => {
    const race = componentTypesFor("race").map((t) => t.slug);
    const mtb = componentTypesFor("mtb").map((t) => t.slug);
    const indoor = componentTypesFor("indoor").map((t) => t.slug);

    expect(race).toContain("bar_tape");
    expect(race).not.toContain("dropper");
    expect(race).not.toContain("trainer_tyre");

    expect(mtb).toContain("dropper");
    expect(mtb).toContain("susp_lowers");
    expect(mtb).not.toContain("bar_tape");

    expect(indoor).toContain("trainer_tyre");
    expect(indoor).not.toContain("brake_pads_disc");
  });

  it("laat een mtb-ketting eerder versleten zijn dan een wegketting", () => {
    const race = resolveThreshold("chain", "race", "normal");
    const mtb = resolveThreshold("chain", "mtb", "normal");
    expect(race?.value).toBeGreaterThan(mtb!.value);
  });

  it("gebruikt maanden waar kilometers niets zeggen", () => {
    expect(metricFor("brake_fluid", "race")).toBe("months");
    expect(metricFor("cables", "gravel")).toBe("months");
    expect(metricFor("chain", "race")).toBe("km");
    // Binnen sloopt geen kilometerstand de trapas maar zweet het lager.
    expect(metricFor("bottom_bracket", "race")).toBe("km");
    expect(metricFor("bottom_bracket", "indoor")).toBe("months");
  });

  it("leent racewaarden voor stad en overig", () => {
    expect(resolveThreshold("chain", "stad", "normal")).toEqual(
      resolveThreshold("chain", "race", "normal"),
    );
  });

  it("geeft null voor een onderdeel dat hier niet bestaat", () => {
    expect(resolveThreshold("dropper", "race", "normal")).toBeNull();
  });
});

describe("guessDiscipline", () => {
  it("herkent de gangbare namen", () => {
    expect(guessDiscipline("Zwiftmonster")).toBe("indoor");
    expect(guessDiscipline("Crossmonster")).toBe("gravel");
    expect(guessDiscipline("Hardtail Trek")).toBe("mtb");
    expect(guessDiscipline("Stadsfiets")).toBe("stad");
  });

  it("kijkt ook naar merk en model", () => {
    expect(guessDiscipline("Nummer 2", "Canyon Grail Gravel")).toBe("gravel");
  });

  it("valt terug op race", () => {
    expect(guessDiscipline("Racemonster")).toBe("race");
    expect(guessDiscipline(null)).toBe("race");
  });
});

describe("wearProgress", () => {
  it("rekent kilometers vanaf de baseline", () => {
    const { worn, pct } = wearProgress({
      metric: "km",
      threshold: 4000,
      bikeDistanceM: 10_000_000,
      baselineDistanceM: 8_000_000,
    });
    expect(worn).toBe(2000);
    expect(pct).toBeCloseTo(0.5);
    expect(wearStatus(pct)).toBe("ok");
  });

  it("rekent maanden vanaf de montagedatum", () => {
    const now = new Date("2026-08-18T12:00:00Z");
    const { worn, pct } = wearProgress({
      metric: "months",
      threshold: 12,
      since: "2026-02-18T12:00:00Z",
      now,
    });
    expect(Math.round(worn)).toBe(6);
    expect(pct).toBeCloseTo(0.5, 1);
  });

  it("staat op nul als de montagedatum ontbreekt", () => {
    expect(wearProgress({ metric: "months", threshold: 12, since: null }).pct).toBe(0);
    expect(monthsSince(null)).toBe(0);
  });

  it("slaat door boven de drempel en meldt dan due", () => {
    const now = new Date("2026-08-18T12:00:00Z");
    const { pct } = wearProgress({
      metric: "months",
      threshold: 6,
      since: "2025-08-18T12:00:00Z",
      now,
    });
    expect(pct).toBeGreaterThan(1);
    expect(wearStatus(pct)).toBe("due");
  });
});
