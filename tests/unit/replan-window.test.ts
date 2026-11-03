import { describe, expect, it } from "vitest";
import { replanWindowEnd } from "@/lib/training/replan-window";
import { combineReasons } from "@/lib/training/replan";
import { planUpdateEndDate, rollingWindowEndDate } from "@/lib/training/draft";

// Kosten (docs/claude-kosten-2026-11-03.md): een automatische herziening
// herschreef het hele resterende schema. Nu twee hele weken, plus de weken die
// een wijziging raakt.

describe("replanWindowEnd", () => {
  it("loopt op een maandag twee hele weken", () => {
    // 2026-11-02 is een maandag.
    expect(replanWindowEnd("2026-11-02", "2027-01-31", null)).toBe("2026-11-15");
  });

  it("rondt af op de zondag erna als de periode midden in een week begint", () => {
    // Woensdag + 13 dagen = dinsdag; dan door tot en met die zondag.
    expect(replanWindowEnd("2026-11-04", "2027-01-31", null)).toBe("2026-11-22");
  });

  it("loopt door tot de week die een wijziging raakt", () => {
    expect(replanWindowEnd("2026-11-02", "2027-01-31", "2026-12-03")).toBe("2026-12-06");
  });

  it("negeert een wijziging die binnen de twee weken valt", () => {
    expect(replanWindowEnd("2026-11-02", "2027-01-31", "2026-11-05")).toBe("2026-11-15");
  });

  it("herschrijft alles bij een gewijzigde standaardweek", () => {
    expect(replanWindowEnd("2026-11-02", "2027-01-31", "all")).toBe("2027-01-31");
  });

  it("gaat nooit voorbij het einde van het schema", () => {
    expect(replanWindowEnd("2026-11-02", "2026-11-10", null)).toBe("2026-11-10");
    expect(replanWindowEnd("2026-11-02", "2026-11-20", "2026-12-24")).toBe("2026-11-20");
  });
});

describe("combineReasons", () => {
  it("bundelt de wijzigingen van een dag, nieuwste onderaan", () => {
    const first = combineReasons(null, "Beschikbaarheid gewijzigd voor de week van 2026-11-02.");
    const second = combineReasons(first, "Eigen rit ingepland op 2026-11-05.");
    expect(second.split("\n")).toEqual([
      "Beschikbaarheid gewijzigd voor de week van 2026-11-02.",
      "Eigen rit ingepland op 2026-11-05.",
    ]);
  });

  it("zet een herhaalde reden niet dubbel, maar onderaan", () => {
    const reasons = combineReasons("A.\nB.", "A.");
    expect(reasons).toBe("B.\nA.");
  });

  it("houdt er hooguit zes", () => {
    let reasons = "";
    for (let i = 1; i <= 8; i += 1) reasons = combineReasons(reasons, `Reden ${i}.`);
    expect(reasons.split("\n")).toHaveLength(6);
    expect(reasons.split("\n")[0]).toBe("Reden 3.");
  });
});

describe("einde van een herziening met een venster", () => {
  const rolling = JSON.stringify({
    planUpdate: { fromDate: "2026-11-02", toDate: "2026-11-15", rollingWindow: true },
  });

  it("eindigt hard op het venster, ook als de AI een latere einddatum noemt", () => {
    // Een latere einddatum zou bij publiceren (publishRange) de weken erna
    // als vervangen markeren.
    expect(rollingWindowEndDate(rolling)).toBe("2026-11-15");
    expect(planUpdateEndDate("2027-01-31", rolling)).toBe("2026-11-15");
  });

  it("houdt het oude gedrag zonder venster", () => {
    const full = JSON.stringify({ planUpdate: { toDate: "2026-12-20" } });
    expect(rollingWindowEndDate(full)).toBeNull();
    expect(planUpdateEndDate("2026-12-27", full)).toBe("2026-12-27");
    expect(planUpdateEndDate("2026-12-13", full)).toBe("2026-12-20");
  });
});
