import { describe, expect, it } from "vitest";

import { eventWorkoutDefaults, type ClubEventRow } from "@/lib/training/events";
import { racePaceFactor } from "@/lib/training/race-pace";

/** Een race van 30 km en 300 hm (geen klim boven 10 hm/km), `ratio` keer de modeltijd. */
function ride(ratio: number, over: Partial<{ distance_m: number; moving_time_seconds: number }> = {}) {
  const modelMinutes = (30 / 40.6) * 60;
  return {
    distance_m: 30_000,
    total_elevation_gain_m: 300,
    moving_time_seconds: Math.round(modelMinutes * ratio * 60),
    ...over,
  };
}

describe("racePaceFactor", () => {
  it("is de mediaan, afgerond op 0,05", () => {
    expect(racePaceFactor([ride(0.88), ride(0.91), ride(0.93), ride(1.2)])).toBe(0.9);
  });

  it("blijft 1 met minder dan drie races", () => {
    expect(racePaceFactor([ride(0.8), ride(0.8)])).toBe(1);
  });

  it("telt korte ritten en kwartiertjes niet mee", () => {
    const short = ride(0.8, { distance_m: 8_000 });
    const quick = ride(0.8, { moving_time_seconds: 600 });
    expect(racePaceFactor([short, quick, ride(0.9), ride(0.9)])).toBe(1);
  });

  it("begrenst de factor tussen 0,85 en 1,25", () => {
    expect(racePaceFactor([ride(0.6), ride(0.6), ride(0.6)])).toBe(0.85);
    expect(racePaceFactor([ride(1.5), ride(1.5), ride(1.5)])).toBe(1.25);
  });

  it("neemt alleen de tien nieuwste races", () => {
    const recent = Array.from({ length: 10 }, () => ride(0.9));
    const old = Array.from({ length: 10 }, () => ride(1.1));
    expect(racePaceFactor([...recent, ...old])).toBe(0.9);
  });
});

describe("eventWorkoutDefaults met racetempo", () => {
  const ladder: ClubEventRow = {
    id: "muckle",
    title: "Club Ladder",
    type: "ladder",
    start_at: "2026-11-06T18:30:00Z",
    end_at: null,
    distance_km: 23.7,
    elevation_m: 282,
  };

  it("schaalt de duur van een Zwift-race", () => {
    // De Muckle Yin: 23,7 km bij 40,6 km/u plus 45 hm boven 10 per km x 0,028.
    expect(eventWorkoutDefaults(ladder).durationMinutes).toBe(36);
    expect(eventWorkoutDefaults(ladder, { racePace: 0.9 }).durationMinutes).toBe(33);
  });

  it("laat een ingestelde eindtijd en een buitenrit staan", () => {
    const fixed = { ...ladder, end_at: "2026-11-06T19:15:00Z" };
    expect(eventWorkoutDefaults(fixed, { racePace: 0.9 }).durationMinutes).toBe(45);
    const outdoor = { ...ladder, type: "outdoor" };
    expect(eventWorkoutDefaults(outdoor, { racePace: 0.9 }).durationMinutes).toBe(
      eventWorkoutDefaults(outdoor).durationMinutes,
    );
  });
});
