import { describe, expect, it } from "vitest";
import {
  kilojoulesFromActivity,
  weeklyLoad,
  type ActivityLoadRow,
} from "@/lib/intervals/activities";

describe("kilojoulesFromActivity", () => {
  it("rekent joules om naar kilojoules", () => {
    expect(kilojoulesFromActivity({ id: "1", icu_joules: 1_250_000 })).toBe(1250);
    expect(kilojoulesFromActivity({ id: "1", joules: 900_000 })).toBe(900);
  });

  it("neemt een kilojoule-veld ongewijzigd over", () => {
    expect(kilojoulesFromActivity({ id: "1", kilojoules: 812 })).toBe(812);
  });

  it("valt terug op vermogen maal tijd", () => {
    // 200 W gedurende een uur = 720 kJ.
    expect(kilojoulesFromActivity({ id: "1", average_watts: 200, moving_time: 3600 })).toBe(720);
  });

  it("geeft null als er niets bruikbaars in zit", () => {
    expect(kilojoulesFromActivity({ id: "1" })).toBeNull();
    expect(kilojoulesFromActivity({ id: "1", average_watts: 0, moving_time: 3600 })).toBeNull();
  });
});

describe("weeklyLoad", () => {
  const row = (date: string, load: number, seconds: number, kj: number): ActivityLoadRow => ({
    intervals_id: `${date}-${load}`,
    start_date_local: date,
    name: null,
    type: "Ride",
    moving_time_seconds: seconds,
    training_load: load,
    intensity: null,
    normalized_watts: null,
    kilojoules: kj,
  });

  it("bundelt ritten per week vanaf maandag", () => {
    // 2026-07-28 is een dinsdag; 2026-07-27 is de maandag ervoor.
    const weeks = weeklyLoad([
      row("2026-07-27", 60, 3600, 700),
      row("2026-07-28", 40, 1800, 300),
    ]);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]).toEqual({ weekStart: "2026-07-27", load: 100, hours: 1.5, kilojoules: 1000 });
  });

  it("scheidt opeenvolgende weken en sorteert oudste eerst", () => {
    const weeks = weeklyLoad([row("2026-07-28", 40, 1800, 300), row("2026-07-20", 90, 7200, 900)]);
    expect(weeks.map((week) => week.weekStart)).toEqual(["2026-07-20", "2026-07-27"]);
  });

  it("houdt alleen de laatste N weken over", () => {
    const rows = Array.from({ length: 20 }, (_, index) => {
      const day = new Date(Date.UTC(2026, 0, 5 + index * 7)).toISOString().slice(0, 10);
      return row(day, 50, 3600, 500);
    });
    expect(weeklyLoad(rows, 12)).toHaveLength(12);
  });
});
