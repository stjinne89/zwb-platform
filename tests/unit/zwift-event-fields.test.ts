import { describe, expect, it } from "vitest";
import { mapZwiftEvent } from "@/lib/events/zwift-route";
import { zwiftEventFields } from "@/lib/events/zwift-event-fields";

// Zoals de publieke API de ZWB Monday Ride van 26 oktober 2026 gaf: een rit op
// tijd (60 minuten), zonder afstand of ronden.
const MONDAY_RIDE = {
  id: 5750529,
  name: "ZWB Cycling - Monday Ride ",
  description: "<p>Welcome to the weekly ZWB Cycling - Monday Ride!</p>",
  imageUrl: "https://cdn.zwift.com/club-images/EVENT/banner.png",
  eventStart: "2026-10-26T17:35:00.000+0000",
  durationInSeconds: 3600,
  distanceInMeters: 0,
  laps: 0,
  routeId: 1178708985,
  eventType: "GROUP_RIDE",
  rulesSet: ["ALLOWS_LATE_JOIN"],
  tags: ["timestamp=1760000000", "ridefeed"],
  eventSubgroups: [
    {
      id: 1,
      subgroupLabel: "E",
      eventSubgroupStart: "2026-10-26T17:35:00.000+0000",
      routeId: 1178708985,
      laps: 0,
      distanceInMeters: 0,
    },
  ],
};

describe("zwiftEventFields", () => {
  it("geeft een clubrit dezelfde velden als het eventformulier", () => {
    const fields = zwiftEventFields(mapZwiftEvent(MONDAY_RIDE)!);

    expect(fields).toMatchObject({
      title: "ZWB Cycling - Monday Ride",
      description: "Welcome to the weekly ZWB Cycling - Monday Ride!",
      start_at: "2026-10-26T17:35:00.000Z",
      end_at: "2026-10-26T18:35:00.000Z",
      location: "Zwift · New York",
      type: "zwift",
      kind: null,
      zwift_event_id: 5750529,
      zwift_route_id: 1178708985,
      laps: 1,
      zwift_event_type: "GROUP_RIDE",
      zwift_rules: ["ALLOWS_LATE_JOIN"],
      zwift_tags: ["ridefeed"],
      zwift_bike_hash: null,
    });
    expect(fields.distance_km).toBeGreaterThan(0);
    expect(fields.elevation_m).toBeGreaterThan(0);
  });

  it("valt zonder bekende route terug op wat het event zelf noemt", () => {
    const fields = zwiftEventFields(
      mapZwiftEvent({ ...MONDAY_RIDE, routeId: 1, eventSubgroups: [], distanceInMeters: 30000, laps: 2 })!,
    );

    expect(fields.zwift_route_id).toBeNull();
    expect(fields.location).toBeNull();
    expect(fields.distance_km).toBe(30);
    expect(fields.laps).toBe(2);
    expect(fields.elevation_m).toBeNull();
  });
});
