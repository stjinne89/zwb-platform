import { describe, expect, it } from "vitest";
import {
  DEFAULT_RESTING_HR,
  heartRateStressScore,
  hrBasisFrom,
  type HrBasis,
} from "@/lib/training/hr-load";
import { rideLoadRows, rideMetricsFromStrava } from "@/lib/training/ride-metrics";

const basis = (overrides: Partial<HrBasis> = {}): HrBasis => ({
  lthr: 162,
  maxHr: 183,
  restingHr: 43,
  sexFactor: 1.92,
  ...overrides,
});

describe("heartRateStressScore", () => {
  it("levert per definitie 100 voor een uur op LTHR", () => {
    expect(heartRateStressScore(3600, 162, basis())).toBe(100);
    expect(heartRateStressScore(7200, 162, basis())).toBe(200);
  });

  it("zit dicht bij de HRSS van intervals voor echte ritten", () => {
    // intervals gaf 98 en 91 (per seconde over de hartslagstream).
    expect(heartRateStressScore(7918, 127, basis())).toBe(96);
    expect(heartRateStressScore(6084, 146, basis({ lthr: 177, maxHr: 195, restingHr: 42 }))).toBe(88);
  });

  it("loopt onder de drempel onder 100 en erboven over 100", () => {
    expect(heartRateStressScore(3600, 150, basis())).toBeLessThan(100);
    expect(heartRateStressScore(3600, 174, basis())).toBeGreaterThan(100);
  });

  it("geeft null zonder basis, duur of geloofwaardige hartslag", () => {
    expect(heartRateStressScore(3600, 150, null)).toBeNull();
    expect(heartRateStressScore(null, 150, basis())).toBeNull();
    expect(heartRateStressScore(3600, null, basis())).toBeNull();
    expect(heartRateStressScore(3600, 40, basis())).toBeNull();
    expect(heartRateStressScore(3600, 150, basis({ lthr: 190 }))).toBeNull();
  });
});

describe("hrBasisFrom", () => {
  it("rekent met een vaste rust-HR en de mannenfactor", () => {
    expect(hrBasisFrom({ lthr: 170, maxHr: 190, sex: "man" })).toEqual({
      lthr: 170,
      maxHr: 190,
      restingHr: DEFAULT_RESTING_HR,
      sexFactor: 1.92,
    });
  });

  it("gebruikt de vrouwenfactor voor vrouwen", () => {
    expect(hrBasisFrom({ lthr: 165, maxHr: 185, sex: "vrouw" })?.sexFactor).toBe(1.67);
  });

  it("is null zonder bruikbare LTHR en max-HR", () => {
    expect(hrBasisFrom({ lthr: null, maxHr: 190 })).toBeNull();
    expect(hrBasisFrom({ lthr: 170, maxHr: null })).toBeNull();
    expect(hrBasisFrom({ lthr: 190, maxHr: 180 })).toBeNull();
  });
});

describe("rideMetricsFromStrava zonder vermogensmeter", () => {
  const hrRide = {
    start_date: "2026-10-20T08:00:00Z",
    moving_time: 3600,
    average_watts: 140,
    device_watts: false,
    average_heartrate: 162,
  };

  it("rekent de TSS uit hartslag en laat IF leeg", () => {
    const metrics = rideMetricsFromStrava(hrRide, null, 250, basis());
    expect(metrics.tss).toBe(100);
    expect(metrics.tssSource).toBe("hr");
    expect(metrics.intensityFactor).toBeNull();
    expect(metrics.normalizedWatts).toBeNull();
  });

  it("neemt de HRSS van intervals over als die er is", () => {
    const metrics = rideMetricsFromStrava({ ...hrRide, hr_load: 87 }, null, 250, basis());
    expect(metrics.tss).toBe(87);
    expect(metrics.tssSource).toBe("hr");
    // Ook zonder eigen basis: de waarde komt van intervals.
    expect(rideMetricsFromStrava({ ...hrRide, hr_load: 87 }, null, 250).tss).toBe(87);
  });

  it("blijft leeg zonder basis of hartslag", () => {
    expect(rideMetricsFromStrava(hrRide, null, 250).tss).toBeNull();
    const { average_heartrate: _, ...noHr } = hrRide;
    void _;
    const metrics = rideMetricsFromStrava(noHr, null, 250, basis());
    expect(metrics.tss).toBeNull();
    expect(metrics.tssSource).toBeNull();
  });

  it("houdt vermogen voorop bij een echte meter", () => {
    const metrics = rideMetricsFromStrava(
      { ...hrRide, device_watts: true, weighted_average_watts: 250, hr_load: 87 },
      null,
      250,
      basis(),
    );
    expect(metrics.tss).toBe(100);
    expect(metrics.tssSource).toBe("power");
    expect(metrics.intensityFactor).toBe(1);
  });

  it("telt mee in de belasting per rit", () => {
    const [row] = rideLoadRows(
      [{ id: 1, name: "Rondje", start_date: hrRide.start_date, moving_time_seconds: 3600, raw: hrRide }],
      250,
      basis(),
    );
    expect(row.training_load).toBe(100);
    expect(row.tssSource).toBe("hr");
    expect(row.hasPowerMeter).toBe(false);
  });
});
