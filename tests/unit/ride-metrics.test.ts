import { describe, expect, it } from "vitest";
import {
  intensityFactorFrom,
  rideLoadRows,
  rideMetricsFromStrava,
  trainingStressScore,
  weeklyLoad,
  type StravaRideRow,
} from "@/lib/training/ride-metrics";

describe("intensityFactorFrom", () => {
  it("is NP gedeeld door FTP", () => {
    expect(intensityFactorFrom(250, 250)).toBe(1);
    expect(intensityFactorFrom(215, 293)).toBe(0.73);
  });

  it("geeft null zonder NP of FTP", () => {
    expect(intensityFactorFrom(null, 250)).toBeNull();
    expect(intensityFactorFrom(215, null)).toBeNull();
    expect(intensityFactorFrom(215, 0)).toBeNull();
  });
});

describe("trainingStressScore", () => {
  it("levert per definitie 100 voor een uur op FTP", () => {
    expect(trainingStressScore(3600, 250, 250)).toBe(100);
  });

  it("schaalt met duur en intensiteit", () => {
    // 2 uur op FTP is twee keer zoveel belasting.
    expect(trainingStressScore(7200, 250, 250)).toBe(200);
    // Een uur op halve intensiteit: IF 0,5 => 0,5^2 * 100 = 25.
    expect(trainingStressScore(3600, 125, 250)).toBe(25);
  });

  it("rekent een echte rit door", () => {
    // 2u53 op NP 215 met FTP 293: IF 0,734 => ~156 TSS.
    expect(trainingStressScore(10407, 215, 293)).toBe(156);
  });

  it("geeft null zonder duur, NP of FTP", () => {
    expect(trainingStressScore(null, 250, 250)).toBeNull();
    expect(trainingStressScore(3600, null, 250)).toBeNull();
    expect(trainingStressScore(3600, 250, null)).toBeNull();
  });
});

describe("rideMetricsFromStrava", () => {
  const powered = {
    moving_time: 10407,
    device_watts: true,
    weighted_average_watts: 215,
    average_watts: 198,
    max_watts: 820,
    average_heartrate: 132.4,
    max_heartrate: 168,
    average_cadence: 82.3,
    kilojoules: 1721.1,
  };

  it("haalt alle cijfers uit een rit met vermogensmeter", () => {
    const metrics = rideMetricsFromStrava(powered, null, 293);
    expect(metrics).toEqual({
      movingMinutes: 173,
      averageWatts: 198,
      normalizedWatts: 215,
      maxWatts: 820,
      averageHr: 132.4,
      maxHr: 168,
      averageCadence: 82.3,
      kilojoules: 1721.1,
      hasPowerMeter: true,
      tss: 156,
      intensityFactor: 0.73,
    });
  });

  it("negeert het geschatte vermogen van een rit zonder meter", () => {
    const metrics = rideMetricsFromStrava(
      { ...powered, device_watts: false },
      null,
      293,
    );
    expect(metrics.hasPowerMeter).toBe(false);
    expect(metrics.normalizedWatts).toBeNull();
    expect(metrics.tss).toBeNull();
    expect(metrics.intensityFactor).toBeNull();
    // Duur, hartslag en cadans meet Strava wél echt.
    expect(metrics.movingMinutes).toBe(173);
    expect(metrics.averageHr).toBe(132.4);
    expect(metrics.averageCadence).toBe(82.3);
  });

  it("valt terug op de opgeslagen rijtijd als raw die mist", () => {
    expect(rideMetricsFromStrava({ device_watts: false }, 3600, 293).movingMinutes).toBe(60);
  });

  it("levert lege waarden bij een onbruikbare payload", () => {
    const metrics = rideMetricsFromStrava(null, null, 293);
    expect(metrics.movingMinutes).toBeNull();
    expect(metrics.tss).toBeNull();
    expect(metrics.hasPowerMeter).toBe(false);
  });

  it("behandelt een nulmeting als ontbrekend, niet als 0", () => {
    const metrics = rideMetricsFromStrava(
      { ...powered, average_cadence: 0, average_heartrate: 0 },
      null,
      293,
    );
    expect(metrics.averageCadence).toBeNull();
    expect(metrics.averageHr).toBeNull();
  });
});

function stravaRide(id: number, startDate: string, np: number | null): StravaRideRow {
  return {
    id,
    name: `Rit ${id}`,
    start_date: startDate,
    moving_time_seconds: 3600,
    raw: {
      moving_time: 3600,
      device_watts: np != null,
      weighted_average_watts: np,
      kilojoules: 700,
    },
  };
}

describe("rideLoadRows", () => {
  it("zet ritten om naar belastingrijen, nieuwste eerst", () => {
    const rows = rideLoadRows(
      [
        stravaRide(1, "2026-07-20T09:00:00Z", 250),
        stravaRide(2, "2026-07-22T09:00:00Z", 125),
      ],
      250,
    );
    expect(rows.map((row) => row.id)).toEqual([2, 1]);
    expect(rows[1]).toMatchObject({
      start_date_local: "2026-07-20",
      moving_time_seconds: 3600,
      training_load: 100,
      intensity: 1,
      normalized_watts: 250,
      hasPowerMeter: true,
    });
    expect(rows[0].training_load).toBe(25);
  });

  it("dateert een late avondrit op de Amsterdamse kalenderdag", () => {
    // 22:30 UTC op 19 juli is 00:30 op 20 juli in Amsterdam.
    const [row] = rideLoadRows([stravaRide(1, "2026-07-19T22:30:00Z", 250)], 250);
    expect(row.start_date_local).toBe("2026-07-20");
  });

  it("laat de belasting leeg zonder vermogensmeter", () => {
    const [row] = rideLoadRows([stravaRide(1, "2026-07-20T09:00:00Z", null)], 250);
    expect(row.training_load).toBeNull();
    expect(row.intensity).toBeNull();
    expect(row.hasPowerMeter).toBe(false);
    // De rijtijd blijft wel meetellen voor de weekuren.
    expect(row.moving_time_seconds).toBe(3600);
  });
});

describe("weeklyLoad", () => {
  it("bundelt Strava-ritten per week vanaf maandag", () => {
    const weeks = weeklyLoad(
      rideLoadRows(
        [
          // 2026-07-20 is een maandag.
          stravaRide(1, "2026-07-20T09:00:00Z", 250),
          stravaRide(2, "2026-07-22T09:00:00Z", 250),
          stravaRide(3, "2026-07-27T09:00:00Z", 125),
        ],
        250,
      ),
    );
    expect(weeks).toEqual([
      { weekStart: "2026-07-20", load: 200, hours: 2, kilojoules: 1400 },
      { weekStart: "2026-07-27", load: 25, hours: 1, kilojoules: 700 },
    ]);
  });

  it("telt een rit zonder vermogen wel mee in de uren, niet in de belasting", () => {
    const [week] = weeklyLoad(
      rideLoadRows(
        [
          stravaRide(1, "2026-07-20T09:00:00Z", 250),
          stravaRide(2, "2026-07-21T09:00:00Z", null),
        ],
        250,
      ),
    );
    expect(week.load).toBe(100);
    expect(week.hours).toBe(2);
  });
});
