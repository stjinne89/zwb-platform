import { describe, expect, it } from "vitest";
import { sameBlockIndexes } from "@/app/(app)/zwbeter-worden/_components/block-editor";
import { eventWorkoutBlocks } from "@/app/(app)/zwbeter-worden/_components/workout-blocks";
import type { IntervalsEvent } from "@/lib/intervals/client";
import {
  blocksFromForm,
  blocksToIntervalsText,
  blocksToWorkoutDoc,
  estimateTrainingLoad,
  keyWorkPct,
  normalizeWorkoutBlocks,
} from "@/lib/training/workouts";

const burst = { label: "Burst", durationMinutes: 1, target: "50%", notes: "", intensity: "recovery", burstSeconds: 6 };
const easy = { label: "Los", durationMinutes: 1, target: "50%", notes: "", intensity: "recovery" };

describe("burst in een blok", () => {
  it("blijft bewaard en wordt begrensd op 30 seconden", () => {
    expect(normalizeWorkoutBlocks([burst])[0].burstSeconds).toBe(6);
    expect(normalizeWorkoutBlocks([{ ...burst, burstSeconds: 90 }])[0].burstSeconds).toBe(30);
    expect(normalizeWorkoutBlocks([{ ...burst, burstSeconds: 0 }])[0]).not.toHaveProperty("burstSeconds");
    expect(normalizeWorkoutBlocks([easy])[0]).not.toHaveProperty("burstSeconds");
  });

  it("komt mee uit het formulier", () => {
    const form = new FormData();
    for (const [burstValue, label] of [["6", "Burst"], ["", "Los"]]) {
      form.append("block_label", label);
      form.append("block_duration", "1");
      form.append("block_target", "50%");
      form.append("block_notes", "");
      form.append("block_intensity", "recovery");
      form.append("block_burst", burstValue);
    }
    const blocks = blocksFromForm(form);
    expect(blocks[0].burstSeconds).toBe(6);
    expect(blocks[1]).not.toHaveProperty("burstSeconds");
  });

  it("gaat als eigen stap van 6 seconden naar intervals.icu, met dezelfde totaalduur", () => {
    const doc = blocksToWorkoutDoc(normalizeWorkoutBlocks([burst, easy]), null);
    expect(doc?.duration).toBe(120);
    expect(doc?.steps).toEqual([
      { duration: 6, power: { units: "%ftp", start: 150, end: 200 } },
      { duration: 54, power: { units: "%ftp", value: 50 } },
      { duration: 60, power: { units: "%ftp", value: 50 } },
    ]);
    expect(blocksToIntervalsText(normalizeWorkoutBlocks([burst]))).toBe("- 6s 150-200% burst\n- 54s 50%");
  });

  it("komt uit intervals.icu terug als één blok met burst", () => {
    const blocks = normalizeWorkoutBlocks([burst, easy]);
    const event = { workout_doc: blocksToWorkoutDoc(blocks, null) } as unknown as IntervalsEvent;
    const back = eventWorkoutBlocks(event);
    expect(back.map((block) => [block.durationMinutes, block.burstSeconds])).toEqual([
      [1, 6],
      [1, undefined],
    ]);
  });

  it("telt mee in de belasting maar typeert de workout niet", () => {
    const withBursts = normalizeWorkoutBlocks([
      { ...easy, durationMinutes: 57 },
      burst,
      burst,
      burst,
    ]);
    const without = normalizeWorkoutBlocks([{ ...easy, durationMinutes: 60 }]);
    expect(estimateTrainingLoad(without)).toBe(25);
    expect(estimateTrainingLoad(withBursts)).toBe(26);
    expect(keyWorkPct(withBursts, null)).toBe(50);
  });

  it("is in de editor een ander blok dan hetzelfde blok zonder burst", () => {
    const blocks = normalizeWorkoutBlocks([burst, { ...burst, burstSeconds: undefined }, burst]);
    expect(sameBlockIndexes(blocks, 0)).toEqual([0, 2]);
  });
});
