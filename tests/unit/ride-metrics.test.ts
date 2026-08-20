import { describe, expect, it } from "vitest";
import {
  summarizeRecentRides,
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
    distance_m: 30000,
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
      {
        weekStart: "2026-07-20",
        load: 200,
        seconds: 7200,
        kilometers: 60,
        kilojoules: 1400,
        ctlChange: null,
      },
      {
        weekStart: "2026-07-27",
        load: 25,
        seconds: 3600,
        kilometers: 30,
        kilojoules: 700,
        ctlChange: null,
      },
    ]);
  });

  it("zet de CTL-groei van de week uit de intervals-punten", () => {
    const weeks = weeklyLoad(
      rideLoadRows([stravaRide(1, "2026-07-22T09:00:00Z", 250)], 250),
      12,
      [
        { date: "2026-07-19", ctl: 60 },
        { date: "2026-07-22", ctl: 62 },
        { date: "2026-07-26", ctl: 63.4 },
        { date: "2026-07-28", ctl: 70 },
      ],
    );
    expect(weeks[0].ctlChange).toBe(3.4);
  });

  it("laat de CTL-groei leeg zonder waarde vóór de week", () => {
    const weeks = weeklyLoad(
      rideLoadRows([stravaRide(1, "2026-07-22T09:00:00Z", 250)], 250),
      12,
      [{ date: "2026-07-24", ctl: 62 }],
    );
    expect(weeks[0].ctlChange).toBeNull();
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
    expect(week.seconds).toBe(7200);
  });
});

describe("summarizeRecentRides", () => {
  const rit = (minuten: number) => ({
    moving_time_seconds: minuten * 60,
    distance_m: minuten * 500,
    total_elevation_gain_m: minuten,
  });

  it("rekent uren, ritten en gemiddelde duur per week uit", () => {
    // Zes ritten van een uur en één van vier, in 28 dagen.
    const rides = [rit(60), rit(60), rit(60), rit(60), rit(60), rit(60), rit(240)];
    const shape = summarizeRecentRides(rides, 28);
    expect(shape.activities).toBe(7);
    expect(shape.hours).toBeCloseTo(10, 5);
    expect(shape.hoursPerWeek).toBe(2.5);
    expect(shape.ridesPerWeek).toBe(1.8);
    expect(shape.avgDurationMinutes).toBe(86);
    expect(shape.longestRideMinutes).toBe(240);
  });

  it("onderscheidt vaak-en-kort van weinig-en-lang bij hetzelfde weektotaal", () => {
    // Precies waar dit voor bedoeld is: zelfde uren, ander ritme.
    const vaakKort = summarizeRecentRides(Array.from({ length: 28 }, () => rit(60)), 28);
    const weinigLang = summarizeRecentRides(Array.from({ length: 7 }, () => rit(240)), 28);
    expect(vaakKort.hoursPerWeek).toBe(weinigLang.hoursPerWeek);
    expect(vaakKort.avgDurationMinutes).toBe(60);
    expect(weinigLang.avgDurationMinutes).toBe(240);
    expect(vaakKort.ridesPerWeek).toBe(7);
    expect(weinigLang.ridesPerWeek).toBe(1.8);
  });

  it("gaat om met een leeg venster", () => {
    const shape = summarizeRecentRides([], 28);
    expect(shape).toMatchObject({
      activities: 0,
      hoursPerWeek: 0,
      ridesPerWeek: 0,
      avgDurationMinutes: 0,
      longestRideMinutes: 0,
    });
  });

  it("negeert een rit zonder bruikbare tijd bij de langste rit", () => {
    const shape = summarizeRecentRides([{ moving_time_seconds: null }, rit(90)], 28);
    expect(shape.longestRideMinutes).toBe(90);
    expect(shape.activities).toBe(2);
  });

  it("laat ritten zonder tijd het gemiddelde niet naar beneden trekken", () => {
    // Komt echt voor: handmatig ingevoerde ritten zonder duur.
    const shape = summarizeRecentRides(
      [{ moving_time_seconds: null }, { moving_time_seconds: 0 }, rit(90)],
      28,
    );
    expect(shape.avgDurationMinutes).toBe(90);
  });
});
