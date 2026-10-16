import { describe, expect, it } from "vitest";
import { durabilityPoints, isDurabilityTestTitle } from "@/lib/training/durability-test";

const steady = { label: "Duurtest", minutes: 55, avgWatts: 188, avgHr: 145, decoupling: 3.2 };

function row(title: string, day: string | null, withSteady = true) {
  return {
    metrics_json: {
      plannedTitle: title,
      execution: { version: 1 as const, offset: 0, reps: [], decoupling: null, variability: 1, steady: withSteady ? steady : null },
    },
    training_workouts: { scheduled_at: day ? `${day}T06:00:00+00:00` : null },
  };
}

describe("duurtest", () => {
  it("herkent de titel, ook met iets erbij", () => {
    expect(isDurabilityTestTitle("Duurtest")).toBe(true);
    expect(isDurabilityTestTitle("Maandelijkse duurtest")).toBe(true);
    expect(isDurabilityTestTitle("Duurrit")).toBe(false);
    expect(isDurabilityTestTitle(null)).toBe(false);
  });

  it("zet gemeten duurtests op datum en laat de rest weg", () => {
    const points = durabilityPoints([
      row("Duurtest", "2026-11-20"),
      row("Duurtest", "2026-10-20"),
      row("Duurrit", "2026-10-25"),
      row("Duurtest", "2026-12-18", false),
      row("Duurtest", null),
    ]);
    expect(points.map((point) => point.day)).toEqual(["2026-10-20", "2026-11-20"]);
    expect(points[0]).toEqual({ day: "2026-10-20", decoupling: 3.2, avgHr: 145, avgWatts: 188 });
  });
});
