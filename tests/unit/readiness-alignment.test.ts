// Scherm en schema zeggen hetzelfde over de gereedheid (november 2026).
//
// Drie dingen liepen uit elkaar: de readiness van Whoop en Polar kwam pas na
// het dagvoorstel binnen, het scherm rekende met andere drempels dan de
// regelmotor, en een Garmin-lid kwam nooit boven "beperkt" uit. Zie PLAN.md.

import { describe, expect, it } from "vitest";
import {
  readinessAgeLabel,
  summarizeTrainingReadiness,
  type WellnessSummary,
} from "@/lib/training/wellness";
import { READINESS_LOW, recoverySignals, TSB_FATIGUED } from "@/lib/training/engine/signals";
import {
  lateColumnMissing,
  lowCurrentDeviceReadiness,
  promptHadCurrentReadiness,
} from "@/lib/training/late-readiness";
import type { TrainingAiInput } from "@/lib/training/ai";

function wellness(over: Partial<WellnessSummary> = {}): WellnessSummary {
  return {
    days: 37,
    latestDate: "2026-11-10",
    restingHr: 36,
    hrv: 120,
    sleepHours: 8,
    readiness: 80,
    readinessSource: "device",
    readinessDate: "2026-11-10",
    readinessCurrent: true,
    sleepPenalty: 0,
    hrvBand: "within",
    restingHrRaised: false,
    state: "normal",
    note: "",
    ...over,
  };
}

describe("drempels van scherm en regelmotor", () => {
  it("zet een TSB tussen -25 en -30 niet meer op herstel", () => {
    // 8 tot 10 november 2026: TSB -26 tot -27, scherm "Herstel voorrang",
    // schema terecht een VO2max-sessie.
    const result = summarizeTrainingReadiness({ tsb: -26.4, wellness: null });
    expect(result.state).toBe("caution");
  });

  it("legt de herstelgrens op die van de regelmotor", () => {
    expect(summarizeTrainingReadiness({ tsb: TSB_FATIGUED, wellness: null }).state).toBe("recovery");
    expect(summarizeTrainingReadiness({ tsb: TSB_FATIGUED + 0.1, wellness: null }).state).toBe(
      "caution",
    );
  });

  it("noemt een readiness van precies 50 matig, niet laag", () => {
    const op = summarizeTrainingReadiness({ tsb: 10, wellness: wellness({ readiness: READINESS_LOW }) });
    const onder = summarizeTrainingReadiness({
      tsb: 10,
      wellness: wellness({ readiness: READINESS_LOW - 1 }),
    });
    expect(op.state).toBe("caution");
    expect(op.notes.join(" ")).toContain("matig");
    expect(onder.state).toBe("recovery");
  });

  it("geeft een Garmin-lid met HRV in de band en een goede readiness weer ruimte", () => {
    // Karen, 4 november 2026: berekende readiness 87, TSB +10,9, stond op
    // "Beperkte trainingsruimte" omdat "ruimte" een HRV boven de band vroeg.
    const result = summarizeTrainingReadiness({
      tsb: 10.9,
      wellness: wellness({ readiness: 87, readinessSource: "afgeleid" }),
    });
    expect(result.state).toBe("ready");
  });

  it("houdt een readiness tussen 70 en 75 bij HRV in de band op beperkt", () => {
    const result = summarizeTrainingReadiness({ tsb: 10, wellness: wellness({ readiness: 72 }) });
    expect(result.state).toBe("caution");
  });

  it("geeft geen ruimte op een meting van gisteren", () => {
    const result = summarizeTrainingReadiness({
      tsb: 10,
      wellness: wellness({ readiness: 96, readinessCurrent: false, readinessDate: "2026-11-09" }),
    });
    expect(result.state).toBe("caution");
  });

  it("laat de regelmotor op dezelfde grenzen afremmen", () => {
    const input = (tsb: number, readiness: number) =>
      ({
        intervalsLoad: { tsb },
        wellness: wellness({ readiness }),
      }) as unknown as TrainingAiInput;
    expect(recoverySignals(input(-26.4, 80)).fatigued).toBe(false);
    expect(recoverySignals(input(TSB_FATIGUED, 80)).fatigued).toBe(true);
    expect(recoverySignals(input(0, READINESS_LOW)).fatigued).toBe(false);
    expect(recoverySignals(input(0, READINESS_LOW - 1)).fatigued).toBe(true);
  });
});

describe("readinessAgeLabel", () => {
  it("zegt gisteren bij de meting van gisteren", () => {
    const summary = wellness({ readiness: 68, readinessCurrent: false, readinessDate: "2026-11-09" });
    expect(readinessAgeLabel(summary, "2026-11-10")).toBe("gisteren");
  });

  it("geeft een datum bij een oudere meting", () => {
    const summary = wellness({ readiness: 68, readinessCurrent: false, readinessDate: "2026-11-07" });
    expect(readinessAgeLabel(summary, "2026-11-10")).toBe("7 nov");
  });

  it("zegt niets bij een meting van vandaag of een berekende readiness", () => {
    expect(readinessAgeLabel(wellness(), "2026-11-10")).toBeNull();
    expect(
      readinessAgeLabel(
        wellness({ readinessSource: "afgeleid", readinessDate: "2026-11-09", readinessCurrent: true }),
        "2026-11-10",
      ),
    ).toBeNull();
    expect(readinessAgeLabel(null, "2026-11-10")).toBeNull();
  });
});

describe("late herkansing op de readiness", () => {
  it("vraagt erom bij een lage meting van het apparaat van vandaag", () => {
    // Stijn, 8 november 2026: Whoop 41, binnen na het voorstel van negen uur.
    expect(lowCurrentDeviceReadiness(wellness({ readiness: 41 }))).toBe(true);
  });

  it("vraagt er niet om bij een meting van gisteren, een goede meting of een berekende", () => {
    expect(lowCurrentDeviceReadiness(wellness({ readiness: 41, readinessCurrent: false }))).toBe(false);
    expect(lowCurrentDeviceReadiness(wellness({ readiness: READINESS_LOW }))).toBe(false);
    expect(lowCurrentDeviceReadiness(wellness({ readiness: 41, readinessSource: "afgeleid" }))).toBe(
      false,
    );
    expect(lowCurrentDeviceReadiness(null)).toBe(false);
  });

  it("herkent een voorstel dat de meting van vandaag al had", () => {
    const had = JSON.stringify({ wellness: { readinessCurrent: true, readinessSource: "device" } });
    const miste = JSON.stringify({ wellness: { readinessCurrent: false, readinessSource: "device" } });
    const berekend = JSON.stringify({ wellness: { readinessCurrent: true, readinessSource: "afgeleid" } });
    expect(promptHadCurrentReadiness(had)).toBe(true);
    expect(promptHadCurrentReadiness(miste)).toBe(false);
    expect(promptHadCurrentReadiness(berekend)).toBe(false);
    expect(promptHadCurrentReadiness(JSON.stringify({ wellness: null }))).toBe(false);
    expect(promptHadCurrentReadiness("geen json")).toBe(false);
    expect(promptHadCurrentReadiness(null)).toBe(false);
  });

  it("ziet een ontbrekende kolom vóór migratie 0324 niet als fout", () => {
    expect(
      lateColumnMissing(
        "Could not find the 'late_readiness' column of 'training_ai_generations' in the schema cache",
      ),
    ).toBe(true);
    expect(lateColumnMissing("duplicate key value")).toBe(false);
    expect(lateColumnMissing(null)).toBe(false);
  });
});
