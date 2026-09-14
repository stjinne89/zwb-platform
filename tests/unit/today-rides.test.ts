import { describe, expect, it } from "vitest";
import { todayRidesFrom } from "@/lib/training/adapt-context";

function ride(id: number, startDate: string, movingSeconds: number) {
  return {
    id,
    name: `Rit ${id}`,
    start_date: startDate,
    moving_time_seconds: movingSeconds,
    raw: { moving_time: movingSeconds, device_watts: true, weighted_average_watts: 248 },
  };
}

describe("todayRidesFrom", () => {
  it("geeft de ritten van de Amsterdamse dag, langste eerst", () => {
    const rides = [
      ride(1, "2026-09-12T05:00:00Z", 1800),
      ride(2, "2026-09-12T09:12:51Z", 10000),
      // 23:30 UTC op de 11e is 01:30 op de 12e in Amsterdam.
      ride(3, "2026-09-11T23:30:00Z", 900),
      // 22:30 UTC op de 12e is al de 13e.
      ride(4, "2026-09-12T22:30:00Z", 3600),
    ];
    const result = todayRidesFrom({ todayKey: "2026-09-12", rides, ftpWatts: 345 });
    expect(result.map((r) => r.name)).toEqual(["Rit 2", "Rit 1", "Rit 3"]);
    expect(result[0].minutes).toBe(167);
    expect(result[0].load).toBeGreaterThan(0);
  });

  it("is leeg zonder rit vandaag", () => {
    const rides = [ride(1, "2026-09-11T09:00:00Z", 3600)];
    expect(todayRidesFrom({ todayKey: "2026-09-12", rides, ftpWatts: 345 })).toEqual([]);
  });
});
