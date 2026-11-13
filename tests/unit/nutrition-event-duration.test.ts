import { describe, expect, it } from "vitest";
import {
  CLUB_DURATION_P90,
  ROUTE_MARGIN,
  durationMargin,
  durationRatios,
  percentile90,
  withMargin,
} from "@/lib/nutrition/event-duration";
import { eventWorkoutDefaults, type ClubEventRow } from "@/lib/training/events";

function event(overrides: Partial<ClubEventRow>): ClubEventRow {
  return {
    id: "e",
    title: "Event",
    type: "toertocht",
    start_at: "2026-12-01T09:00:00Z",
    end_at: null,
    distance_km: null,
    elevation_m: null,
    gpx_path: null,
    zwift_route_id: null,
    laps: null,
    duration_minutes: null,
    ...overrides,
  } as ClubEventRow;
}

describe("de duur met marge (stap 5)", () => {
  it("neemt het 90e percentiel", () => {
    expect(percentile90([])).toBeNull();
    expect(percentile90([1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2])).toBe(1.8);
    expect(percentile90([1.2])).toBe(1.2);
  });

  it("geen marge met een pacingplan of een vaste koersduur", () => {
    const own = [1.3, 1.3, 1.3, 1.3, 1.3];
    expect(durationMargin({ paced: true, source: "type", eventType: "zrl", ownRatios: own })).toEqual({ factor: 1, from: "geen" });
    expect(durationMargin({ paced: false, source: "vast", eventType: "zrl", ownRatios: own }).factor).toBe(1);
  });

  it("je eigen events gaan voor, vanaf vijf", () => {
    const four = [1.2, 1.2, 1.2, 1.2];
    expect(durationMargin({ paced: false, source: "type", eventType: "zrl", ownRatios: four })).toEqual({
      factor: CLUB_DURATION_P90.zrl,
      from: "club",
    });
    expect(durationMargin({ paced: false, source: "type", eventType: "zrl", ownRatios: [...four, 1.25] })).toEqual({
      factor: 1.25,
      from: "eigen",
    });
    // Nooit korter dan verwacht, hoogstens anderhalf keer.
    expect(durationMargin({ paced: false, source: "type", eventType: "zrl", ownRatios: [0.8, 0.8, 0.8, 0.8, 0.8] }).factor).toBe(1);
    expect(durationMargin({ paced: false, source: "type", eventType: "toertocht", ownRatios: [2, 2, 2, 2, 2] }).factor).toBe(1.5);
  });

  it("met een route de afwijking van het racemodel, zonder clubwaarde geen marge", () => {
    expect(durationMargin({ paced: false, source: "route", eventType: "zrl", ownRatios: [] })).toEqual({
      factor: ROUTE_MARGIN,
      from: "route",
    });
    expect(durationMargin({ paced: false, source: "route", eventType: "toertocht", ownRatios: [] }).from).toBe("geen");
    expect(durationMargin({ paced: false, source: "type", eventType: "gran_fondo", ownRatios: [] }).factor).toBe(1);
  });

  it("rondt de duur met marge op 5 minuten naar boven", () => {
    expect(withMargin(50, { factor: 1.37, from: "club" })).toBe(70);
    expect(withMargin(122, { factor: 1, from: "geen" })).toBe(125);
  });

  it("legt elke geplande eventrit naast de rit van die dag die er het dichtst bij ligt", () => {
    const ratios = durationRatios(
      [
        { day: "2026-10-01", minutes: 50 },
        { day: "2026-10-08", minutes: 60 },
        { day: "2026-10-15", minutes: 40 },
      ],
      [
        { day: "2026-10-01", minutes: 20 },
        { day: "2026-10-01", minutes: 55 },
        { day: "2026-10-08", minutes: 10 },
        { day: "2026-10-15", minutes: 200 },
      ],
    );
    // 1 oktober: 55 tegen 50; 8 oktober alleen een rit van 10 minuten; 15 oktober 5×: geen eventrit.
    expect(ratios).toEqual([1.1]);
  });
});

describe("eventWorkoutDefaults", () => {
  it("geeft een toertocht zonder afstand 180 minuten duurtempo", () => {
    const defaults = eventWorkoutDefaults(event({ type: "toertocht" }));
    expect(defaults.durationMinutes).toBe(180);
    expect(defaults.intensity).toBe("endurance");
    expect(defaults.durationSource).toBe("type");
  });

  it("zegt waar de duur vandaan komt", () => {
    expect(eventWorkoutDefaults(event({ type: "toertocht", distance_km: 100 })).durationSource).toBe("route");
    expect(eventWorkoutDefaults(event({ type: "zrl", duration_minutes: 45 })).durationSource).toBe("vast");
    expect(eventWorkoutDefaults(event({ type: "zrl" })).durationSource).toBe("type");
  });
});
