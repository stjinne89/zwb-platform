import { describe, expect, it } from "vitest";
import {
  complianceBreakdown,
  EXPECTED_RPE_MIN_MINUTES,
  expectedSessionRpe,
  plannedIntensityFactor,
  zoneDistributionMatch,
} from "@/lib/training/compliance-breakdown";
import type { WorkoutMetricsSnapshot } from "@/lib/training/completion";
import type { WorkoutBlock } from "@/lib/training/workouts";

const FTP = 250;

function block(durationMinutes: number, target: string, intensity: WorkoutBlock["intensity"]): WorkoutBlock {
  return { label: "Blok", durationMinutes, target, notes: "", intensity };
}

/** 10 min inrijden, 2x20 op drempel met 10 min ertussen, 10 min uitrijden. */
const THRESHOLD: WorkoutBlock[] = [
  block(10, "55%", "recovery"),
  block(20, "90-95%", "threshold"),
  block(10, "55%", "recovery"),
  block(20, "90-95%", "threshold"),
  block(10, "55%", "recovery"),
];

describe("plannedIntensityFactor", () => {
  it("volgt uit TSS = IF² × uren × 100", () => {
    // 60 min op IF 0,65 = 42 TSS (afgerond 42,25).
    expect(plannedIntensityFactor(42, 60)).toBe(0.65);
    expect(plannedIntensityFactor(100, 60)).toBe(1);
  });

  it("geeft null zonder geplande belasting of duur", () => {
    expect(plannedIntensityFactor(null, 60)).toBeNull();
    expect(plannedIntensityFactor(42, 0)).toBeNull();
  });
});

describe("expectedSessionRpe", () => {
  it("neemt de zwaarste band met genoeg tijd", () => {
    // Drempel op 92,5 % → RPE 7.
    expect(expectedSessionRpe(THRESHOLD, FTP)).toEqual({ low: 7, high: 7 });
  });

  it("laat een korte opener de sessie niet optillen", () => {
    const blocks = [
      block(60, "65-70%", "endurance"),
      block(EXPECTED_RPE_MIN_MINUTES - 1, "120%", "anaerobic"),
    ];
    expect(expectedSessionRpe(blocks, FTP)).toEqual({ low: 4, high: 4 });
  });

  it("valt terug op de band met de meeste tijd bij een korte sessie", () => {
    expect(expectedSessionRpe([block(3, "55%", "recovery")], FTP)).toEqual({ low: 2, high: 3 });
  });

  it("geeft null zonder leesbaar doel", () => {
    expect(expectedSessionRpe([], FTP)).toBeNull();
  });
});

describe("zoneDistributionMatch", () => {
  it("is 100 bij dezelfde verhouding, ook als de duur verschilt", () => {
    expect(zoneDistributionMatch([600, 1200, 0, 0, 0, 0], [300, 600, 0, 0, 0, 0])).toBe(100);
  });

  it("telt alleen het deel dat in de geplande zone viel", () => {
    // Gepland alles Z2, gereden de helft Z2 en de helft Z3.
    expect(zoneDistributionMatch([0, 3600, 0, 0, 0, 0], [0, 1800, 1800, 0, 0, 0])).toBe(50);
  });

  it("geeft null zonder plan of rit", () => {
    expect(zoneDistributionMatch([0, 0, 0, 0, 0, 0], [0, 600, 0, 0, 0, 0])).toBeNull();
  });
});

describe("complianceBreakdown", () => {
  const metrics: Partial<WorkoutMetricsSnapshot> = {
    plannedMinutes: 70,
    movingMinutes: 63,
    plannedLoad: 64,
    tss: 70,
    loadPct: 109,
    intensityFactor: 0.82,
    zoneTimes: {
      source: "intervals",
      intervalsId: "i1",
      ftpWatts: FTP,
      // Z1 25 min, Z3 8 min, Z4 30 min.
      seconds: [1500, 0, 480, 1800, 0, 0],
    },
  };

  it("zet elk onderdeel gepland tegenover gereden", () => {
    const result = complianceBreakdown({ metrics, blocks: THRESHOLD, ftpWatts: FTP, rpe: 8 });
    expect(result.duration).toEqual({ planned: 70, actual: 63, pct: 90 });
    // Het TSS-percentage is dat van de pil.
    expect(result.load).toEqual({ planned: 64, actual: 70, pct: 109 });
    expect(result.intensity.planned).toBe(0.74);
    expect(result.intensity.pct).toBe(111);
    expect(result.rpe).toEqual({ expected: { low: 7, high: 7 }, actual: 8 });
  });

  it("geeft per zone het percentage van de geplande minuten", () => {
    const result = complianceBreakdown({ metrics, blocks: THRESHOLD, ftpWatts: FTP });
    const rows = result.zones?.rows ?? [];
    expect(rows.map((row) => row.zone)).toEqual([1, 3, 4]);
    // Z1: 25 van 30 min; Z4: 30 van 40 min; Z3 niet gepland → geen percentage.
    expect(rows[0].pct).toBe(83);
    expect(rows[1].pct).toBeNull();
    expect(rows[2].pct).toBe(75);
    // 30/70 en 40/70 gepland, 25/63 en 30/63 gereden.
    expect(result.zones?.match).toBe(87);
  });

  it("laat zones weg zonder gemeten zonetijden of geplande opbouw", () => {
    expect(complianceBreakdown({ metrics: { ...metrics, zoneTimes: undefined }, blocks: THRESHOLD }).zones).toBeNull();
    expect(complianceBreakdown({ metrics, blocks: [] }).zones).toBeNull();
    expect(
      complianceBreakdown({
        metrics: { ...metrics, zoneTimes: { source: "none", checkedAt: "2026-10-24" } },
        blocks: THRESHOLD,
      }).zones,
    ).toBeNull();
  });

  it("werkt met een oude momentopname zonder geplande cijfers", () => {
    const result = complianceBreakdown({ metrics: { movingMinutes: 45, tss: 30, intensityFactor: 0.63 } });
    expect(result.duration).toEqual({ planned: null, actual: 45, pct: null });
    expect(result.intensity).toEqual({ planned: null, actual: 0.63, pct: null });
    expect(result.rpe).toEqual({ expected: null, actual: null });
  });
});
