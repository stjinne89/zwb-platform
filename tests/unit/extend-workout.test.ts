import { describe, expect, it } from "vitest";
import {
  extendWithEndurance,
  extraEnduranceMinutes,
  ownWorkoutShortlist,
} from "@/lib/training/extend-workout";
import type { WorkoutBlock } from "@/lib/training/workouts";

const block = (label: string, durationMinutes: number, intensity: WorkoutBlock["intensity"]) =>
  ({ label, durationMinutes, target: "", notes: "", intensity }) satisfies WorkoutBlock;

const vo2 = [
  block("Warming-up", 15, "endurance"),
  block("VO2max 1/2", 4, "vo2max"),
  block("Herstel 1/2", 4, "recovery"),
  block("VO2max 2/2", 4, "vo2max"),
  block("Cooling-down", 10, "recovery"),
];

describe("extraEnduranceMinutes", () => {
  it("vult een intervaltraining aan tot de gekozen duur", () => {
    expect(extraEnduranceMinutes("vo2max", 50, 150)).toBe(100);
  });

  it("voegt niets toe onder de tien minuten", () => {
    expect(extraEnduranceMinutes("vo2max", 55, 60)).toBe(0);
    expect(extraEnduranceMinutes("vo2max", 50, 60)).toBe(10);
  });

  it("kort nooit in", () => {
    expect(extraEnduranceMinutes("drempel", 103, 60)).toBe(0);
  });

  it("verlengt herstel en duur niet", () => {
    expect(extraEnduranceMinutes("herstel", 30, 120)).toBe(0);
    expect(extraEnduranceMinutes("duur", 60, 240)).toBe(0);
  });
});

describe("extendWithEndurance", () => {
  it("zet het duurblok vóór de cooling-down", () => {
    const out = extendWithEndurance(vo2, 60);
    expect(out.map((b) => b.label)).toEqual([
      "Warming-up",
      "VO2max 1/2",
      "Herstel 1/2",
      "VO2max 2/2",
      "Duur",
      "Cooling-down",
    ]);
    expect(out[4]).toMatchObject({ durationMinutes: 60, intensity: "endurance", target: "60-70%" });
  });

  it("zet het achteraan zonder cooling-down", () => {
    const out = extendWithEndurance(vo2.slice(0, 4), 20);
    expect(out.at(-1)).toMatchObject({ label: "Duur", durationMinutes: 20 });
  });

  it("laat de blokken ongemoeid zonder extra tijd", () => {
    expect(extendWithEndurance(vo2, 0)).toBe(vo2);
  });
});

describe("ownWorkoutShortlist", () => {
  const options = [
    { id: "a", form: "vo2max", durationMinutes: 50 },
    { id: "b", form: "vo2max", durationMinutes: 62 },
    { id: "c", form: "vo2max", durationMinutes: 82 },
    { id: "d", form: "duur", durationMinutes: 60 },
    { id: "e", form: "duur", durationMinutes: 120 },
    { id: "f", form: "duur", durationMinutes: 180 },
  ];

  it("toont bij intervallen wat past, de langste eerst", () => {
    expect(ownWorkoutShortlist(options, "vo2max", 150).map((o) => o.id)).toEqual(["c", "b", "a"]);
    expect(ownWorkoutShortlist(options, "vo2max", 60).map((o) => o.id)).toEqual(["b", "a"]);
  });

  it("valt terug op de kortste als niets past", () => {
    expect(ownWorkoutShortlist(options, "vo2max", 30).map((o) => o.id)).toEqual(["a"]);
  });

  it("sorteert duur op de dichtstbijzijnde lengte", () => {
    expect(ownWorkoutShortlist(options, "duur", 150).map((o) => o.id)).toEqual(["e", "f", "d"]);
  });

  it("geeft niets voor een vorm zonder workouts", () => {
    expect(ownWorkoutShortlist(options, "sprint", 60)).toEqual([]);
  });
});
