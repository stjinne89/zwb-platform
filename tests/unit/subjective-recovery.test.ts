import { describe, expect, it } from "vitest";
import {
  summarizeSubjectiveRecovery,
  type SubjectiveReport,
} from "@/lib/training/subjective-recovery";
import { computeZwbStatus } from "@/lib/training/zwbeterworden";

const NOW = new Date("2026-10-16T08:00:00Z");

function report(over: Partial<SubjectiveReport> = {}): SubjectiveReport {
  return {
    athlete_rpe: 5,
    athlete_feel: "goed",
    updated_at: "2026-10-15T18:00:00Z",
    intensity: "endurance",
    ...over,
  };
}

describe("summarizeSubjectiveRecovery", () => {
  it("geeft geen signaal als alles goed voelde", () => {
    expect(summarizeSubjectiveRecovery([report()], null, NOW)).toBeNull();
  });

  it("telt een rit die slecht ging", () => {
    const result = summarizeSubjectiveRecovery([report({ athlete_feel: "slecht" })], null, NOW);
    expect(result?.heavy).toBe(true);
  });

  it("telt een rustige rit die zwaar voelde, maar geen zware training die zwaar voelde", () => {
    expect(
      summarizeSubjectiveRecovery([report({ athlete_feel: "zwaar" })], null, NOW)?.heavy,
    ).toBe(true);
    expect(
      summarizeSubjectiveRecovery([report({ athlete_rpe: 7, athlete_feel: "neutraal" })], null, NOW)
        ?.heavy,
    ).toBe(true);
    expect(
      summarizeSubjectiveRecovery(
        [report({ intensity: "vo2max", athlete_feel: "zwaar", athlete_rpe: 9 })],
        null,
        NOW,
      ),
    ).toBeNull();
  });

  it("kijkt alleen naar de laatste drie dagen", () => {
    const oud = report({ athlete_feel: "slecht", updated_at: "2026-10-12T18:00:00Z" });
    expect(summarizeSubjectiveRecovery([oud], null, NOW)).toBeNull();
  });

  it("telt een hoge klachtenlast uit het logboek", () => {
    expect(summarizeSubjectiveRecovery([], 0.7, NOW)?.heavy).toBe(true);
    expect(summarizeSubjectiveRecovery([], 0.5, NOW)).toBeNull();
  });
});

describe("computeZwbStatus — HRV-bron", () => {
  it("gebruikt geen SDNN als rMSSD ontbreekt", () => {
    const wellness = Array.from({ length: 10 }, (_, i) => ({
      id: `2026-10-${String(16 - i).padStart(2, "0")}`,
      hrvSDNN: 70,
      restingHR: 45,
    }));
    const status = computeZwbStatus(wellness, { wellnessOptIn: true });
    expect(status.recoverySummary?.hrv).toBeNull();
  });
});
