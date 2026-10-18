import { describe, expect, it } from "vitest";
import { eventWorkoutBlocks } from "@/app/(app)/zwbeter-worden/_components/workout-blocks";
import type { IntervalsEvent } from "@/lib/intervals/client";
import { describeWithMethodLabel, methodLabelOf } from "@/lib/training/method-label";
import {
  blocksFromForm,
  blocksToIntervalsText,
  blocksToWorkoutDoc,
  estimateTrainingLoad,
  normalizeWorkoutBlocks,
  onOffReps,
} from "@/lib/training/workouts";
import { plannedZoneSeconds } from "@/lib/training/zone-times";

const series = {
  label: "30/15 serie",
  durationMinutes: 9,
  target: "110-120%",
  notes: "",
  intensity: "vo2max",
  onOff: { onSeconds: 30, offSeconds: 15, offTarget: "50%" },
};

describe("aan/uit-blok (30/15)", () => {
  it("leest het patroon uit de bibliotheek en uit de platte AI-velden", () => {
    expect(normalizeWorkoutBlocks([series])[0].onOff).toEqual({ onSeconds: 30, offSeconds: 15, offTarget: "50%" });
    const fromAi = normalizeWorkoutBlocks([
      { ...series, onOff: undefined, onSeconds: 30, offSeconds: 15, offTarget: "50%", burstSeconds: 0 },
    ])[0];
    expect(fromAi.onOff).toEqual({ onSeconds: 30, offSeconds: 15, offTarget: "50%" });
    // 0 betekent in de AI-uitvoer: geen patroon.
    const plain = normalizeWorkoutBlocks([{ ...series, onOff: undefined, onSeconds: 0, offSeconds: 0, offTarget: "" }])[0];
    expect(plain).not.toHaveProperty("onOff");
  });

  it("weigert een patroon dat niet te rijden is en gaat vóór een burst", () => {
    expect(normalizeWorkoutBlocks([{ ...series, onOff: { onSeconds: 2, offSeconds: 15, offTarget: "" } }])[0]).not.toHaveProperty("onOff");
    expect(normalizeWorkoutBlocks([{ ...series, onOff: { onSeconds: 30, offSeconds: 300, offTarget: "" } }])[0]).not.toHaveProperty("onOff");
    const both = normalizeWorkoutBlocks([{ ...series, burstSeconds: 6 }])[0];
    expect(both.onOff).toBeDefined();
    expect(both).not.toHaveProperty("burstSeconds");
  });

  it("komt mee uit het formulier", () => {
    const form = new FormData();
    for (const [on, off] of [["30", "15"], ["", ""]]) {
      form.append("block_label", "Blok");
      form.append("block_duration", "9");
      form.append("block_target", "110-120%");
      form.append("block_notes", "");
      form.append("block_intensity", "vo2max");
      form.append("block_burst", "");
      form.append("block_on", on);
      form.append("block_off", off);
      form.append("block_off_target", on ? "50%" : "");
    }
    const blocks = blocksFromForm(form);
    expect(blocks[0].onOff).toEqual({ onSeconds: 30, offSeconds: 15, offTarget: "50%" });
    expect(blocks[1]).not.toHaveProperty("onOff");
  });

  it("gaat als twaalf paren losse stappen naar intervals.icu, met dezelfde duur", () => {
    const blocks = normalizeWorkoutBlocks([series]);
    expect(onOffReps(blocks[0])).toBe(12);
    const doc = blocksToWorkoutDoc(blocks, null);
    expect(doc?.duration).toBe(540);
    expect(doc?.steps.length).toBe(24);
    expect(doc?.steps.slice(0, 2)).toEqual([
      { duration: 30, power: { units: "%ftp", start: 110, end: 120 } },
      { duration: 15, power: { units: "%ftp", value: 50 } },
    ]);
    expect(blocksToIntervalsText(blocks)).toBe("\n12x\n- 30s 110-120%\n- 15s 50%\n");
  });

  it("legt een rest die niet in een paar past bij de laatste uit-stap", () => {
    const doc = blocksToWorkoutDoc(normalizeWorkoutBlocks([{ ...series, durationMinutes: 10 }]), null);
    expect(doc?.duration).toBe(600);
    expect(doc?.steps.at(-1)?.duration).toBe(15 + 600 - 13 * 45);
  });

  it("rekent belasting en zonetijd met het aan- én het uit-deel", () => {
    const blocks = normalizeWorkoutBlocks([series]);
    const constant = normalizeWorkoutBlocks([{ ...series, onOff: undefined }]);
    expect(estimateTrainingLoad(blocks)).toBeLessThan(estimateTrainingLoad(constant));
    const zones = plannedZoneSeconds(blocks, null);
    expect(zones[4]).toBe(12 * 30);
    expect(zones[0]).toBe(12 * 15);
  });

  it("komt uit intervals.icu terug als één blok", () => {
    const blocks = normalizeWorkoutBlocks([series]);
    const event = { workout_doc: blocksToWorkoutDoc(blocks, null) } as unknown as IntervalsEvent;
    const back = eventWorkoutBlocks(event);
    expect(back).toHaveLength(1);
    expect(back[0].durationMinutes).toBe(9);
    expect(back[0].onOff).toEqual({ onSeconds: 30, offSeconds: 15, offTarget: "50%" });
  });

  it("maakt van een paar bursts geen aan/uit-blok", () => {
    const burst = { label: "Burst", durationMinutes: 1, target: "50%", notes: "", intensity: "recovery", burstSeconds: 6 };
    const event = {
      workout_doc: blocksToWorkoutDoc(normalizeWorkoutBlocks([burst, burst, burst, burst]), null),
    } as unknown as IntervalsEvent;
    const back = eventWorkoutBlocks(event);
    expect(back.every((block) => block.burstSeconds === 6 && !block.onOff)).toBe(true);
  });
});

describe("label van een trainingsmethode", () => {
  it("kent alleen veelbelovend en experimenteel", () => {
    expect(methodLabelOf("Experimenteel")).toBe("experimenteel");
    expect(methodLabelOf("veelbelovend")).toBe("veelbelovend");
    expect(methodLabelOf("geen")).toBeNull();
    expect(methodLabelOf(null)).toBeNull();
  });

  it("zet het label één keer vooraan in de beschrijving", () => {
    expect(describeWithMethodLabel("Elk blok begint hoog.", "experimenteel")).toBe("Nieuwe methode. Elk blok begint hoog.");
    expect(describeWithMethodLabel("Nieuwe methode. Al gedaan.", "experimenteel")).toBe("Nieuwe methode. Al gedaan.");
    expect(describeWithMethodLabel(null, "veelbelovend")).toBe("Nieuwe methode.");
    expect(describeWithMethodLabel("Gewoon.", null)).toBe("Gewoon.");
  });

  it("vervangt een oud label in plaats van er een tweede voor te zetten", () => {
    expect(describeWithMethodLabel("Experimenteel. Elk blok begint hoog.", "experimenteel")).toBe(
      "Nieuwe methode. Elk blok begint hoog.",
    );
    expect(describeWithMethodLabel("Veelbelovend.", "veelbelovend")).toBe("Nieuwe methode.");
    expect(describeWithMethodLabel("Veelbelovend. Gewoon.", null)).toBe("Gewoon.");
  });
});
