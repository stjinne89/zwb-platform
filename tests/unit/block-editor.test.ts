import { describe, expect, it } from "vitest";
import { sameBlockIndexes } from "@/app/(app)/zwbeter-worden/_components/block-editor";
import type { WorkoutBlock } from "@/lib/training/workouts";

function block(over: Partial<WorkoutBlock> = {}): WorkoutBlock {
  return {
    label: "Blok",
    durationMinutes: 4,
    target: "115%",
    notes: "",
    intensity: "vo2max",
    ...over,
  };
}

describe("sameBlockIndexes", () => {
  it("pakt alle identieke blokken van een 5x4", () => {
    const blocks = [
      block({ label: "Inrijden", durationMinutes: 15, target: "60%", intensity: "endurance" }),
      block(),
      block({ label: "Rust", durationMinutes: 3, target: "50%", intensity: "recovery" }),
      block(),
      block({ label: "Rust", durationMinutes: 3, target: "50%", intensity: "recovery" }),
      block(),
    ];
    expect(sameBlockIndexes(blocks, 1)).toEqual([1, 3, 5]);
    expect(sameBlockIndexes(blocks, 2)).toEqual([2, 4]);
    expect(sameBlockIndexes(blocks, 0)).toEqual([0]);
  });

  it("ziet een blok dat op één veld afwijkt als een ander blok", () => {
    const blocks = [block(), block({ durationMinutes: 5 }), block({ notes: "laatste vol" })];
    expect(sameBlockIndexes(blocks, 0)).toEqual([0]);
    expect(sameBlockIndexes(blocks, 1)).toEqual([1]);
    expect(sameBlockIndexes(blocks, 2)).toEqual([2]);
  });
});
