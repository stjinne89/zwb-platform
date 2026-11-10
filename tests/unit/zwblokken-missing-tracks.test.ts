import { describe, expect, it } from "vitest";
import { fakeDb } from "./fake-db";
import {
  loadMissingZwiftTracks,
  MISSING_TRACKS_MIN,
  summarizeMissingTracks,
} from "@/lib/zwblokken/missing-tracks";

const ME = "00000000-0000-0000-0000-00000000000a";
const OTHER = "00000000-0000-0000-0000-00000000000b";

function csvRide(id: number, overrides: Record<string, unknown> = {}, raw: Record<string, unknown> = {}) {
  return {
    id,
    profile_id: ME,
    sport_type: "VirtualRide",
    distance_m: 20000,
    raw: { import_source: "strava_csv", filename: `activities/${id}.fit.gz`, ...raw },
    ...overrides,
  };
}

describe("summarizeMissingTracks", () => {
  it("geeft niets onder de drempel", () => {
    expect(summarizeMissingTracks(Array.from({ length: MISSING_TRACKS_MIN - 1 }, () => ({ distance_m: 1000 })))).toBeNull();
  });

  it("telt ritten en kilometers", () => {
    const rows = Array.from({ length: MISSING_TRACKS_MIN }, () => ({ distance_m: "20000.50" }));
    expect(summarizeMissingTracks(rows)).toEqual({ rides: MISSING_TRACKS_MIN, km: 500 });
  });
});

describe("loadMissingZwiftTracks", () => {
  it("telt alleen eigen virtuele CSV-ritten zonder route, met een leesbaar bestand", async () => {
    const counted = Array.from({ length: MISSING_TRACKS_MIN }, (_, i) => csvRide(i + 1));
    const db = fakeDb({
      strava_activities: [
        ...counted,
        // Heeft al een route.
        csvRide(100, {}, { map: { summary_polyline: "abc" } }),
        // Geen bestand in de export.
        csvRide(101, {}, { filename: "" }),
        csvRide(102, {}, { filename: null }),
        // TCX kan de import niet lezen.
        csvRide(103, {}, { filename: "activities/103.tcx.gz" }),
        // Buitenrit, ander lid, andere bron.
        csvRide(104, { sport_type: "Ride" }),
        csvRide(105, { profile_id: OTHER }),
        csvRide(106, {}, { import_source: "intervals" }),
      ],
    });
    expect(await loadMissingZwiftTracks(db, ME)).toEqual({ rides: MISSING_TRACKS_MIN, km: 500 });
  });

  it("geeft niets als er te weinig zijn", async () => {
    const db = fakeDb({ strava_activities: [csvRide(1), csvRide(2)] });
    expect(await loadMissingZwiftTracks(db, ME)).toBeNull();
  });
});
