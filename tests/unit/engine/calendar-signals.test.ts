import { describe, expect, it } from "vitest";
import { datesBetween, fixedMinutesBetween, isRaceOrTestDay, minutesOn, periodOn } from "@/lib/training/engine/calendar";
import { recoverySignals } from "@/lib/training/engine/signals";
import { baseInput } from "./fixtures";

describe("minutesOn", () => {
  it("leest de standaardweek", () => {
    const input = baseInput();
    expect(minutesOn(input, "2026-10-20")).toBe(90); // dinsdag
    expect(minutesOn(input, "2026-10-19")).toBe(0); // maandag
  });

  it("laat een eigen week voorgaan op de standaard", () => {
    const input = baseInput({
      availability: {
        default: { di: 90 },
        weeks: [{ weekStart: "2026-10-26", minutesByDay: { di: 30 } }],
      },
    });
    expect(minutesOn(input, "2026-10-20")).toBe(90);
    expect(minutesOn(input, "2026-10-27")).toBe(30);
  });

  it("valt terug op de aangevinkte dagen van het doel", () => {
    const input = baseInput({ availability: null });
    expect(minutesOn(input, "2026-10-20")).toBeNull(); // dinsdag aangevinkt: onbeperkt
    expect(minutesOn(input, "2026-10-21")).toBe(0); // woensdag niet
  });
});

describe("kalender", () => {
  it("telt dagen inclusief begin en eind", () => {
    expect(datesBetween("2026-10-19", "2026-10-25")).toHaveLength(7);
  });

  it("kent races, tests en periodes", () => {
    const input = baseInput({
      fixedWorkouts: [
        { date: "2026-10-27", title: "ZRL", durationMinutes: 60, intensity: "race", kind: "clubevent" },
        { date: "2026-10-29", title: "Rit", durationMinutes: 120, intensity: "endurance", kind: "eigen_rit" },
      ],
      seasonPlan: {
        targets: [],
        periods: [{ title: "Vakantie", from: "2026-11-02", to: "2026-11-08", kind: "rust" }],
        nextTargetAfterPlan: null,
      },
    });
    expect(isRaceOrTestDay(input, "2026-10-27")).toBe(true);
    expect(isRaceOrTestDay(input, "2026-10-29")).toBe(false);
    expect(fixedMinutesBetween(input, "2026-10-26", "2026-11-01")).toBe(180);
    expect(periodOn(input, "2026-11-04")).toBe("rust");
    expect(periodOn(input, "2026-11-09")).toBeNull();
  });
});

describe("recoverySignals", () => {
  it("ziet niets bij een gewoon lid", () => {
    const signals = recoverySignals(baseInput());
    expect(signals.fatigued).toBe(false);
    expect(signals.fresh).toBe(false);
  });

  it("is vermoeid bij een sterk negatieve TSB", () => {
    const signals = recoverySignals(baseInput({ intervalsLoad: { ctl: 60, atl: 95, tsb: -35, eftp: null, rampRate: 4 } }));
    expect(signals.fatigued).toBe(true);
    expect(signals.reasons.map((reason) => reason.rule)).toContain("signaal.tsb");
  });

  it("telt afgeleide readiness niet als los signaal", () => {
    const wellness = {
      days: 7,
      state: "normal" as const,
      restingHr: 50,
      hrv: 60,
      sleepHours: 7,
      readiness: 30,
      readinessSource: "afgeleid" as const,
      readinessDate: "2026-10-18",
      readinessCurrent: true,
      note: "",
    };
    expect(recoverySignals(baseInput({ wellness })).fatigued).toBe(false);
    expect(recoverySignals(baseInput({ wellness: { ...wellness, readinessSource: "device" } })).fatigued).toBe(true);
  });

  it("noemt klachten niet bij naam", () => {
    const signals = recoverySignals(baseInput({ symptoms: { score: 0.8, label: "veel last", daysLogged: 5 } }));
    expect(signals.lowerCapacity).toBe(true);
    expect(signals.fresh).toBe(false);
    expect(signals.reasons.map((reason) => reason.text).join(" ")).not.toMatch(/klacht|cyclus|menstru/i);
  });
});
