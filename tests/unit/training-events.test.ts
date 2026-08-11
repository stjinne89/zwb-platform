import { describe, expect, it } from "vitest";
import { eventWorkoutDefaults, type ClubEventRow } from "@/lib/training/events";

function event(over: Partial<ClubEventRow> = {}): ClubEventRow {
  return {
    id: "e1",
    title: "Clubrit",
    type: "outdoor",
    start_at: "2026-08-16T09:00:00+02:00",
    end_at: null,
    distance_km: null,
    elevation_m: null,
    ...over,
  };
}

describe("eventWorkoutDefaults", () => {
  it("gebruikt de eindtijd als die er is", () => {
    const result = eventWorkoutDefaults(
      event({ start_at: "2026-08-16T09:00:00+02:00", end_at: "2026-08-16T11:30:00+02:00" }),
    );
    expect(result.durationMinutes).toBe(150);
  });

  it("rekent anders de afstand om naar minuten", () => {
    // 84 km bij 28 km/u = 3 uur.
    expect(eventWorkoutDefaults(event({ distance_km: 84 })).durationMinutes).toBe(180);
  });

  it("valt terug op een typegemiddelde zonder eindtijd en afstand", () => {
    expect(eventWorkoutDefaults(event({ type: "outdoor" })).durationMinutes).toBe(120);
    expect(eventWorkoutDefaults(event({ type: "zrl" })).durationMinutes).toBe(60);
    expect(eventWorkoutDefaults(event({ type: "training" })).durationMinutes).toBe(75);
  });

  it("laat een wedstrijd als race tellen en een clubrit als duur", () => {
    expect(eventWorkoutDefaults(event({ type: "zrl" })).intensity).toBe("race");
    expect(eventWorkoutDefaults(event({ type: "ladder" })).intensity).toBe("race");
    expect(eventWorkoutDefaults(event({ type: "outdoor" })).intensity).toBe("endurance");
  });

  it("houdt de duur binnen wat een workout mag zijn", () => {
    expect(
      eventWorkoutDefaults(event({ distance_km: 400 })).durationMinutes,
    ).toBeLessThanOrEqual(480);
    expect(eventWorkoutDefaults(event({ distance_km: 1 })).durationMinutes).toBeGreaterThanOrEqual(
      20,
    );
  });

  it("negeert een eindtijd die vóór de start ligt", () => {
    const result = eventWorkoutDefaults(
      event({ start_at: "2026-08-16T09:00:00+02:00", end_at: "2026-08-16T08:00:00+02:00" }),
    );
    expect(result.durationMinutes).toBe(120);
  });

  it("valt bij een onbekend type terug op de buitenrit-standaard", () => {
    expect(eventWorkoutDefaults(event({ type: "iets_nieuws" })).durationMinutes).toBe(120);
  });
});
