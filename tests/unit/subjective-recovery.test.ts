import { describe, expect, it } from "vitest";
import {
  rideReportsFrom,
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

describe("rideReportsFrom — RPE bij een losse rit", () => {
  function ride(watts: number | null, rpe: number | null) {
    return {
      id: 1,
      name: "Rondje",
      start_date: "2026-10-15T09:00:00Z",
      moving_time_seconds: 3600,
      raw: watts == null ? { moving_time: 3600 } : { moving_time: 3600, device_watts: true, weighted_average_watts: watts },
      athlete_rpe: rpe,
    };
  }

  it("telt een rustige losse rit die zwaar voelde", () => {
    // NP 150 bij FTP 250: IF 0,6, zo'n 36 TSS in een uur, duurtempo.
    const reports = rideReportsFrom([ride(150, 8)], 250, null);
    expect(reports[0]).toMatchObject({ athlete_rpe: 8, intensity: "endurance" });
    expect(summarizeSubjectiveRecovery(reports, null, NOW)?.heavy).toBe(true);
  });

  it("telt geen harde losse rit die zwaar voelde", () => {
    const reports = rideReportsFrom([ride(260, 9)], 250, null);
    expect(summarizeSubjectiveRecovery(reports, null, NOW)).toBeNull();
  });

  it("telt een rit zonder vermogen of hartslag niet: rustig of niet is onbekend", () => {
    const reports = rideReportsFrom([ride(null, 9)], 250, null);
    expect(reports[0].intensity).toBeNull();
    expect(summarizeSubjectiveRecovery(reports, null, NOW)).toBeNull();
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
