import { describe, expect, it } from "vitest";
import { matchStravaRides } from "@/lib/strava/summary-writer";

const ride = (id: number, start: string, distance: number) => ({
  id,
  start_date: start,
  distance_m: distance,
});

describe("matchStravaRides", () => {
  it("koppelt een intervals-rit aan de Strava-rit met dezelfde start en afstand", () => {
    const matches = matchStravaRides(
      [ride(-1_000_000_000_001, "2026-11-01T08:45:14Z", 100_308)],
      [
        { id: 501, start_date: "2026-11-01T07:10:00Z", distance: 4_000, sport_type: "Walk" },
        { id: 502, start_date: "2026-11-01T08:45:14Z", distance: 100_310, sport_type: "VirtualRide" },
      ],
    );
    expect(matches.get(-1_000_000_000_001)).toBe(502);
  });

  it("slaat een andere sport en een andere rit over", () => {
    const matches = matchStravaRides(
      [ride(-1, "2026-11-01T08:45:14Z", 100_308)],
      [
        { id: 601, start_date: "2026-11-01T08:45:14Z", distance: 100_308, sport_type: "Run" },
        { id: 602, start_date: "2026-11-01T12:00:00Z", distance: 100_308, sport_type: "Ride" },
      ],
    );
    expect(matches.size).toBe(0);
  });

  it("gebruikt elke Strava-rit hooguit één keer", () => {
    const matches = matchStravaRides(
      [ride(-1, "2026-11-01T08:45:14Z", 50_000), ride(-2, "2026-11-01T08:45:30Z", 50_100)],
      [{ id: 701, start_date: "2026-11-01T08:45:20Z", distance: 50_050, type: "Ride" }],
    );
    expect([...matches.values()]).toEqual([701]);
  });
});
