import { describe, expect, it } from "vitest";
import { parseHourUtc, pickHourForTime } from "@/lib/route-weather-map";
import type { HourForecast } from "@/lib/weather";

function hour(timeUtc: string, extra: Partial<HourForecast> = {}): HourForecast {
  return {
    timeUtc,
    windSpeedKmh: 15,
    windGustKmh: null,
    windDirectionFrom: 270,
    temperatureC: 18,
    precipitationMm: 0,
    ...extra,
  };
}

describe("parseHourUtc", () => {
  it("parset Open-Meteo UTC zonder offset als UTC", () => {
    expect(parseHourUtc("2026-06-25T12:00")).toBe(Date.parse("2026-06-25T12:00:00Z"));
  });
});

describe("pickHourForTime", () => {
  const hours = [
    hour("2026-06-25T12:00", { temperatureC: 12 }),
    hour("2026-06-25T13:00", { temperatureC: 13 }),
    hour("2026-06-25T14:00", { temperatureC: 14 }),
  ];

  it("kiest het dichtstbijzijnde uur", () => {
    const picked = pickHourForTime(hours, new Date("2026-06-25T12:40:00Z"));
    expect(picked?.temperatureC).toBe(13);
  });

  it("kiest het exacte uur", () => {
    expect(pickHourForTime(hours, new Date("2026-06-25T14:00:00Z"))?.temperatureC).toBe(14);
  });

  it("geeft null ver buiten het venster", () => {
    expect(pickHourForTime(hours, new Date("2026-06-25T20:00:00Z"))).toBeNull();
  });

  it("geeft null bij een lege reeks", () => {
    expect(pickHourForTime([], new Date("2026-06-25T12:00:00Z"))).toBeNull();
  });
});
