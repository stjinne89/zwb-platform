import { describe, expect, it } from "vitest";
import { ftpResolver } from "@/lib/training/ftp-history";
import {
  aggregate,
  bucketEnd,
  bucketKey,
  bucketLabel,
  bucketsBetween,
  calendarDays,
  efficiencyTrend,
  fitnessFromTss,
  periodRecords,
  personalRidesFromRows,
  powerTrend,
  previousYearWindow,
  rideRecords,
  streaks,
  totalsBetween,
  windowFor,
  yearCumulative,
  type PersonalRide,
  type PersonalRideRow,
} from "@/lib/stats/personal";

function ride(day: string, overrides: Partial<PersonalRide> = {}): PersonalRide {
  return {
    id: Math.floor(Math.random() * 1e9),
    name: "Rit",
    sportType: "Ride",
    day,
    distanceKm: 30,
    movingSeconds: 3600,
    elevationM: 100,
    averageWatts: 200,
    normalizedWatts: 220,
    maxWatts: 700,
    kilojoules: 720,
    averageHr: 140,
    maxHr: 170,
    hasPowerMeter: true,
    tss: 70,
    intensityFactor: 0.8,
    ...overrides,
  };
}

describe("periodes", () => {
  it("laat de week op maandag beginnen", () => {
    // 2026-10-18 is een zondag, 2026-10-19 een maandag.
    expect(bucketKey("2026-10-18", "week")).toBe("2026-10-12");
    expect(bucketKey("2026-10-19", "week")).toBe("2026-10-19");
    expect(bucketEnd("2026-10-12", "week")).toBe("2026-10-18");
  });

  it("kent maand- en jaargrenzen, ook in februari van een schrikkeljaar", () => {
    expect(bucketKey("2028-02-29", "maand")).toBe("2028-02");
    expect(bucketEnd("2028-02", "maand")).toBe("2028-02-29");
    expect(bucketEnd("2027-02", "maand")).toBe("2027-02-28");
    expect(bucketKey("2026-12-31", "jaar")).toBe("2026");
  });

  it("geeft alle periodes, ook lege, over de jaargrens", () => {
    expect(bucketsBetween("2025-11-15", "2026-02-01", "maand")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(bucketsBetween("2025-12-29", "2026-01-12", "week")).toEqual([
      "2025-12-29",
      "2026-01-05",
      "2026-01-12",
    ]);
  });

  it("maakt van 12 maanden per maand precies twaalf staven", () => {
    const window = windowFor("12m", "maand", "2026-10-16", "2020-01-01");
    expect(window.start).toBe("2025-11-01");
    expect(bucketsBetween(window.start, window.end, "maand")).toHaveLength(12);
    expect(bucketsBetween(...Object.values(windowFor("12m", "week", "2026-10-16", null)) as [string, string], "week")).toHaveLength(52);
  });

  it("neemt per jaar het beginjaar van het bereik mee, en 'alles' vanaf de eerste rit", () => {
    expect(windowFor("12m", "jaar", "2026-10-16", null).start).toBe("2025-01-01");
    expect(windowFor("alles", "maand", "2026-10-16", "2021-03-14").start).toBe("2021-03-01");
  });

  it("labelt kort", () => {
    expect(bucketLabel("2026-10", "maand")).toBe("okt '26");
    expect(bucketLabel("2026-10-12", "week")).toBe("12 okt");
    expect(bucketLabel("2026-10-12", "week", true)).toBe("12 okt '26");
    expect(bucketLabel("2026", "jaar")).toBe("2026");
  });
});

describe("personalRidesFromRows", () => {
  const row = (overrides: Partial<PersonalRideRow> = {}): PersonalRideRow => ({
    id: 1,
    name: "Ochtendrit",
    sport_type: "Ride",
    start_date: "2026-09-09T23:30:00Z",
    distance_m: "42000",
    total_elevation_gain_m: 300,
    moving_time_seconds: 3600,
    average_watts: 230,
    weighted_average_watts: 250,
    device_watts: true,
    max_watts: 800,
    kilojoules: 828,
    average_heartrate: 150,
    max_heartrate: 180,
    ...overrides,
  });

  it("rekent TSS met de FTP van de Amsterdamse ritdag", () => {
    const at = ftpResolver(
      [
        { effectiveFrom: "1900-01-01", ftpWatts: 250 },
        { effectiveFrom: "2026-09-10", ftpWatts: 266 },
      ],
      266,
    );
    const [parsed] = personalRidesFromRows([row()], at);
    expect(parsed.day).toBe("2026-09-10");
    expect(parsed.distanceKm).toBe(42);
    expect(parsed.intensityFactor).toBe(0.94);
    expect(parsed.normalizedWatts).toBe(250);
  });

  it("negeert de geschatte NP zonder vermogensmeter", () => {
    const [parsed] = personalRidesFromRows([row({ device_watts: false })], 250);
    expect(parsed.hasPowerMeter).toBe(false);
    expect(parsed.normalizedWatts).toBeNull();
    expect(parsed.tss).toBeNull();
    expect(parsed.averageWatts).toBe(230);
  });

  it("slaat een rit zonder geldige datum over", () => {
    expect(personalRidesFromRows([row({ start_date: "nee" })], 250)).toEqual([]);
  });
});

describe("totalen", () => {
  const rides = [ride("2026-10-01"), ride("2026-10-15", { tss: null }), ride("2025-10-10")];

  it("telt op binnen het venster", () => {
    const totals = totalsBetween(rides, "2026-10-01", "2026-10-31");
    expect(totals.rides).toBe(2);
    expect(totals.km).toBe(60);
    expect(totals.hours).toBe(2);
    expect(totals.tss).toBe(70);
  });

  it("vergelijkt met hetzelfde venster een jaar eerder", () => {
    expect(previousYearWindow("2026-10-01", "2026-10-16")).toEqual({
      start: "2025-10-01",
      end: "2025-10-16",
    });
  });

  it("geeft per periode een regel, ook als die leeg is", () => {
    const keys = bucketsBetween("2026-09-01", "2026-10-31", "maand");
    const rows = aggregate(rides, keys, "maand");
    expect(rows.map((row) => [row.key, row.rides])).toEqual([
      ["2026-09", 0],
      ["2026-10", 2],
    ]);
  });
});

describe("vermogen", () => {
  it("neemt alleen ritten met meter van minstens twintig minuten", () => {
    const rides = [
      ride("2026-10-01", { normalizedWatts: 250, movingSeconds: 3600 }),
      ride("2026-10-02", { normalizedWatts: 210, movingSeconds: 7200 }),
      ride("2026-10-03", { normalizedWatts: 400, movingSeconds: 600 }),
      ride("2026-10-04", { normalizedWatts: null, hasPowerMeter: false }),
    ];
    const [point] = powerTrend(rides, ["2026-10"], "maand", () => 260, "2026-10-16");
    expect(point.bestNp).toBe(250);
    // (250×1 + 210×2) / 3 = 223,3
    expect(point.averageNp).toBe(223);
    expect(point.rides).toBe(2);
    expect(point.ftp).toBe(260);
  });

  it("vraagt de FTP op aan het eind van de periode, maar niet na vandaag", () => {
    const asked: Array<string | null> = [];
    powerTrend([], ["2026-09", "2026-10"], "maand", (day) => {
      asked.push(day);
      return null;
    }, "2026-10-16");
    expect(asked).toEqual(["2026-09-30", "2026-10-16"]);
  });

  it("rekent watt per hartslag gewogen naar rijtijd", () => {
    const rides = [
      ride("2026-10-01", { normalizedWatts: 210, averageHr: 140, movingSeconds: 3600 }),
      ride("2026-10-02", { normalizedWatts: 240, averageHr: 160, movingSeconds: 3600 }),
      ride("2026-10-03", { averageHr: null }),
    ];
    const [point] = efficiencyTrend(rides, ["2026-10"], "maand");
    expect(point.factor).toBe(1.5);
    expect(point.rides).toBe(2);
  });
});

describe("fitnessFromTss", () => {
  it("bouwt CTL en ATL op vanaf de eerste rit, ook vóór het venster", () => {
    const points = fitnessFromTss([ride("2026-10-01", { tss: 100 })], "2026-10-02", "2026-10-03");
    expect(points.map((point) => point.date)).toEqual(["2026-10-02", "2026-10-03"]);
    // Na één dag van 100: CTL 100/42 = 2,4, ATL 100/7 = 14,3; daarna zakken ze.
    expect(points[0].ctl).toBeCloseTo(2.3, 1);
    expect(points[0].atl).toBeLessThan(14.3);
    expect(points[0].tsb).toBeLessThan(0);
  });

  it("is leeg zonder TSS", () => {
    expect(fitnessFromTss([ride("2026-10-01", { tss: null })], "2026-10-01", "2026-10-03")).toEqual([]);
  });
});

describe("jaar op jaar", () => {
  it("telt cumulatief op en stopt het huidige jaar bij vandaag", () => {
    const lines = yearCumulative(
      [ride("2025-01-01", { distanceKm: 10 }), ride("2025-12-31", { distanceKm: 5 }), ride("2026-01-08", { distanceKm: 20 })],
      ["2025", "2026"],
      "2026-01-20",
    );
    expect(lines[0].total).toBe(15);
    expect(lines[0].weeks[0]).toBe(10);
    expect(lines[0].weeks.at(-1)).toBe(15);
    expect(lines[1].weeks[0]).toBe(0);
    expect(lines[1].weeks[1]).toBe(20);
    expect(lines[1].weeks[2]).toBe(20);
    expect(lines[1].weeks[3]).toBeNull();
  });
});

describe("kalender en reeksen", () => {
  it("geeft 53 weken vanaf een maandag tot en met vandaag", () => {
    const days = calendarDays([ride("2026-10-16")], "2026-10-16");
    expect(days[0].day).toBe("2025-10-13");
    expect(days.at(-1)).toEqual({ day: "2026-10-16", km: 30, rides: 1 });
  });

  it("telt weken op rij, en een reeks breekt pas na een lege week", () => {
    const rides = [
      ride("2026-09-21"),
      ride("2026-09-28"),
      ride("2026-10-07"),
      ride("2026-10-08"),
      ride("2026-08-01"),
    ];
    // Maandag 12 oktober zonder rit: de reeks loopt nog (vorige week wel).
    expect(streaks(rides, "2026-10-12")).toEqual({ currentWeeks: 3, longestWeeks: 3, longestDays: 2 });
    expect(streaks(rides, "2026-10-20").currentWeeks).toBe(0);
  });
});

describe("records", () => {
  it("vindt de beste rit per soort en slaat korte NP over", () => {
    const records = rideRecords([
      ride("2026-10-01", { distanceKm: 120, normalizedWatts: 230 }),
      ride("2026-10-02", { elevationM: 2000, normalizedWatts: 330, movingSeconds: 900 }),
    ]);
    const byLabel = Object.fromEntries(records.map((record) => [record.label, record.value]));
    expect(byLabel["Langste rit (km)"]).toBe(120);
    expect(byLabel["Meeste hoogtemeters"]).toBe(2000);
    expect(byLabel["Hoogste NP (20 min+)"]).toBe(230);
  });

  it("vindt de beste week, maand en jaar", () => {
    const records = periodRecords([
      ride("2026-10-12", { distanceKm: 50 }),
      ride("2026-10-13", { distanceKm: 50 }),
      ride("2026-11-30", { distanceKm: 60 }),
    ]);
    expect(records.map((record) => [record.label, record.key, record.km])).toEqual([
      ["Beste week", "2026-10-12", 100],
      ["Beste maand", "2026-10", 100],
      ["Beste jaar", "2026", 160],
    ]);
  });
});
