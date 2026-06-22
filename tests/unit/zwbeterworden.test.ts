import { describe, expect, it } from "vitest";
import {
  ZWB_LEVEL_DESCRIPTIONS,
  dayIndex,
  zwbeterWordenAdvice,
} from "@/lib/training/zwbeterworden";
import type { TrainingReadinessSummary } from "@/lib/training/wellness";

function readiness(
  state: TrainingReadinessSummary["state"],
  score: number | null,
): TrainingReadinessSummary {
  return { state, score, label: "", notes: [] };
}

describe("zwbeterWordenAdvice", () => {
  it("geeft niveau 0 bij onbekende state of ontbrekende score", () => {
    expect(zwbeterWordenAdvice(readiness("unknown", null)).level).toBe(0);
    expect(zwbeterWordenAdvice(readiness("ready", null)).level).toBe(0);
  });

  it("recovery → niveau 1 of 2 op basis van score", () => {
    expect(zwbeterWordenAdvice(readiness("recovery", 10)).level).toBe(1);
    expect(zwbeterWordenAdvice(readiness("recovery", 40)).level).toBe(2);
  });

  it("caution → niveau 3 of 4 op basis van score", () => {
    expect(zwbeterWordenAdvice(readiness("caution", 50)).level).toBe(3);
    expect(zwbeterWordenAdvice(readiness("caution", 60)).level).toBe(4);
  });

  it("ready → niveau 5", () => {
    expect(zwbeterWordenAdvice(readiness("ready", 90)).level).toBe(5);
  });

  it("levert opmaak-klassen en titel per niveau", () => {
    const advice = zwbeterWordenAdvice(readiness("ready", 90));
    expect(advice.pill).toBeTruthy();
    expect(advice.block).toBeTruthy();
    expect(advice.title).toBe("BETER WORDT HET NIET");
  });
});

describe("dagelijkse tekstrotatie", () => {
  it("heeft 10 varianten per niveau", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      expect(ZWB_LEVEL_DESCRIPTIONS[level]).toHaveLength(10);
    }
  });

  it("is deterministisch voor dezelfde dag", () => {
    const a = zwbeterWordenAdvice(readiness("ready", 90), null, "2026-06-22");
    const b = zwbeterWordenAdvice(readiness("ready", 90), null, "2026-06-22");
    expect(a.description).toBe(b.description);
  });

  it("wisselt over verschillende dagen", () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      seen.add(
        zwbeterWordenAdvice(readiness("ready", 90), null, key).description,
      );
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("vervangt de {partner}-placeholder volledig", () => {
    // Over alle dagen mag er nooit een letterlijke {partner} blijven staan.
    for (let d = 1; d <= 31; d++) {
      const key = `2026-01-${String(d).padStart(2, "0")}`;
      const women = zwbeterWordenAdvice(readiness("recovery", 10), "women", key);
      const open = zwbeterWordenAdvice(readiness("recovery", 10), "open", key);
      expect(women.description).not.toContain("{partner}");
      expect(open.description).not.toContain("{partner}");
    }
  });

  it("kiest de partner-tekst op basis van de ZRL-divisie", () => {
    // Zoek een dag die een variant mét {partner} selecteert (niveau 1).
    const withPartner = ZWB_LEVEL_DESCRIPTIONS[1].findIndex((d) =>
      d.includes("{partner}"),
    );
    let key = "";
    for (let d = 1; d <= 60; d++) {
      const k = `2026-03-${String(d).padStart(2, "0")}`;
      if (dayIndex(k, 10) === withPartner) {
        key = k;
        break;
      }
    }
    expect(key).not.toBe("");
    expect(zwbeterWordenAdvice(readiness("recovery", 10), "women", key).description).toContain("man");
    expect(zwbeterWordenAdvice(readiness("recovery", 10), "open", key).description).toContain("vrouw");
  });
});
