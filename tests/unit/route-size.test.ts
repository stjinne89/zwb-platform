import { describe, expect, it } from "vitest";
import { eventRouteSize, eventRouteSizeLabel } from "@/lib/events/route-size";

const lap = { gpx_path: "u/ronde.gpx", distance_km: "8.14", elevation_m: 5 };

describe("eventRouteSize", () => {
  it("vermenigvuldigt een GPX-ronde met het aantal rondes", () => {
    expect(eventRouteSize({ ...lap, laps: 10 })).toEqual({
      distanceKm: 81.4,
      elevationM: 50,
      lapKm: 8.14,
      laps: 10,
      durationMinutes: null,
    });
  });

  it("kent bij rijden op tijd geen totale afstand", () => {
    const size = eventRouteSize({ ...lap, duration_minutes: 150 });
    expect(size.distanceKm).toBeNull();
    expect(size.lapKm).toBe(8.14);
    expect(size.durationMinutes).toBe(150);
  });

  it("laat een Zwift-event met zijn eigen totaal", () => {
    const size = eventRouteSize({ zwift_route_id: 7, distance_km: 41.2, elevation_m: 300, laps: 3 });
    expect(size).toMatchObject({ distanceKm: 41.2, elevationM: 300, laps: null });
  });

  it("laat een gewone GPX-rit zoals hij is", () => {
    expect(eventRouteSize({ gpx_path: "u/rit.gpx", distance_km: 120, elevation_m: 900 })).toMatchObject({
      distanceKm: 120,
      elevationM: 900,
      lapKm: null,
    });
  });
});

describe("eventRouteSizeLabel", () => {
  it("toont rondes met het totaal", () => {
    expect(eventRouteSizeLabel({ ...lap, laps: 10 })).toBe("10 × 8,1 km = 81,4 km · 50 hm");
  });

  it("toont de duur met de ronde", () => {
    expect(eventRouteSizeLabel({ ...lap, duration_minutes: 150 })).toBe("150 min · ronde 8,1 km");
  });

  it("is leeg zonder maten", () => {
    expect(eventRouteSizeLabel({ distance_km: null, elevation_m: null })).toBeNull();
  });
});
