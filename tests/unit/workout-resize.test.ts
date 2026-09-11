import { describe, expect, it } from "vitest";
import { resizeBlocks, type WorkoutBlock } from "@/lib/training/workouts";

function block(label: string, durationMinutes: number, intensity: WorkoutBlock["intensity"]): WorkoutBlock {
  return { label, durationMinutes, target: "", notes: "", intensity };
}

const total = (blocks: WorkoutBlock[]) => blocks.reduce((sum, b) => sum + b.durationMinutes, 0);

describe("resizeBlocks", () => {
  const vo2 = [
    block("Inrijden", 20, "endurance"),
    block("VO2", 20, "vo2max"),
    block("Herstel", 16, "recovery"),
    block("Duur", 24, "endurance"),
    block("Uitrijden", 10, "recovery"),
  ];

  it("verlengt van 90 naar 120 minuten zonder de intervallen te raken", () => {
    const longer = resizeBlocks(vo2, 120);
    expect(total(longer)).toBe(120);
    expect(longer[1]).toEqual(vo2[1]);
  });

  it("kort in tot de beschikbare tijd en houdt de kern", () => {
    const shorter = resizeBlocks(vo2, 60);
    expect(total(shorter)).toBe(60);
    expect(shorter[1].durationMinutes).toBe(20);
  });

  it("schaalt alles als de kern niet in de nieuwe duur past", () => {
    const tiny = resizeBlocks(vo2, 15);
    expect(total(tiny)).toBe(15);
    expect(tiny[1].durationMinutes).toBeLessThan(20);
  });

  it("schaalt een training zonder meegevende blokken naar verhouding", () => {
    const tempo = resizeBlocks([block("Tempo", 30, "tempo"), block("Drempel", 30, "threshold")], 90);
    expect(total(tempo)).toBe(90);
    expect(tempo[0].durationMinutes).toBe(45);
  });

  it("laat een training op de juiste duur ongemoeid", () => {
    expect(resizeBlocks(vo2, 90)).toBe(vo2);
  });
});
