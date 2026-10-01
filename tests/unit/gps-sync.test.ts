import polyline from "@mapbox/polyline";
import { describe, expect, it } from "vitest";
import { bestGpsColTimes, gpsSegmentAggregates } from "@/lib/cols/gps-col-times";
import { timedTrackFromStreams } from "@/lib/intervals/rides";
import type { TimedPoint } from "@/lib/segments/gps-efforts";
import { storeGpsEfforts } from "@/lib/segments/gps-sync";
import { timedTrackFromGpx } from "@/lib/strava/import";
import { fakeDb } from "./fake-db";

const A = "00000000-0000-0000-0000-00000000000a";
const START = Date.parse("2025-06-01T08:00:00Z");
const M_PER_DEG_LAT = 110_540;
const lat = (meters: number) => 50 + meters / M_PER_DEG_LAT;

/** 10 m/s naar het noorden vanaf 50°N, 5°O. */
function ride(seconds: number): TimedPoint[] {
  return Array.from({ length: seconds + 1 }, (_, s) => ({ lat: lat(s * 10), lon: 5, t: START + s * 1000 }));
}

function segment(id: number, fromM: number, toM: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    name: `Segment ${id}`,
    distance_m: toM - fromM,
    average_grade: 3,
    polyline: polyline.encode([[lat(fromM), 5], [lat((fromM + toM) / 2), 5], [lat(toM), 5]]),
    private: false,
    south: lat(fromM),
    north: lat(toM),
    west: 5,
    east: 5,
    ...extra,
  };
}

describe("storeGpsEfforts", () => {
  it("bewaart per uitgekozen segment de snelste tijd in de rit", async () => {
    const db = fakeDb({
      // 1 en 2 zijn uitgekozen; 3 is privé; 4 ligt op de route maar is niet uitgekozen.
      zwb_segment_maps: [segment(1, 200, 1200), segment(2, 5000, 6000), segment(3, 300, 900, { private: true }), segment(4, 400, 1000)],
      zwb_segments: [
        { slug: "een", strava_segment_id: 1, active: true },
        { slug: "twee", strava_segment_id: 2, active: true },
        { slug: "drie", strava_segment_id: 3, active: true },
        { slug: "uit", strava_segment_id: 4, active: false },
      ],
      cols: [],
      strava_activities: [{ id: -5, profile_id: A, raw: { import_source: "strava_gpx" } }],
    });

    const result = await storeGpsEfforts(db, A, -5, ride(200));

    expect(result).toEqual({ segments: 1, cols: 0 });
    const stored = db.tables.strava_activities[0].raw as { import_source: string; gps_segment_times: Array<{ segment_id: number; seconds: number; started_at: string }> };
    expect(stored.import_source).toBe("strava_gpx");
    expect(stored.gps_segment_times).toHaveLength(1);
    expect(stored.gps_segment_times[0]).toMatchObject({ segment_id: 1, seconds: 100 });
    // De polyline rondt af op ~1 m; op 10 m/s is dat een tiende seconde.
    expect(Math.abs(Date.parse(stored.gps_segment_times[0].started_at) - (START + 20_000))).toBeLessThan(100);
  });

  it("meet ook langs het segment van een col", async () => {
    const db = fakeDb({
      zwb_segment_maps: [segment(77, 200, 1200)],
      zwb_segments: [],
      cols: [{ slug: "col-met", strava_segment_id: 77, summit_lat: lat(1200), summit_lon: 5, start_lat: null, start_lon: null, detection_radius_m: 250 }],
      strava_activities: [{ id: -5, profile_id: A, raw: {} }],
    });

    expect(await storeGpsEfforts(db, A, -5, ride(200))).toEqual({ segments: 1, cols: 0 });
    expect(db.tables.strava_activities[0].raw).toMatchObject({ gps_segment_times: [{ segment_id: 77, seconds: 100 }] });
  });

  it("haalt een eerdere meting weg als de rit het segment niet meer raakt", async () => {
    const db = fakeDb({
      zwb_segment_maps: [segment(2, 5000, 6000)],
      zwb_segments: [{ slug: "twee", strava_segment_id: 2, active: true }],
      cols: [],
      strava_activities: [{ id: -5, profile_id: A, raw: { gps_segment_times: [{ segment_id: 2, seconds: 90, started_at: "x" }] } }],
    });

    await storeGpsEfforts(db, A, -5, ride(200));

    expect(db.tables.strava_activities[0].raw).toEqual({});
  });

  it("zet de tijd van een col zonder segment in de rit", async () => {
    const db = fakeDb({
      zwb_segment_maps: [],
      zwb_segments: [],
      cols: [
        { slug: "col-zonder", strava_segment_id: null, summit_lat: lat(1500), summit_lon: 5, start_lat: lat(100), start_lon: 5.001, detection_radius_m: 250 },
        { slug: "col-met", strava_segment_id: 77, summit_lat: lat(1500), summit_lon: 5, start_lat: lat(100), start_lon: 5, detection_radius_m: 250 },
      ],
      strava_activities: [{ id: -5, profile_id: A, raw: { import_source: "strava_gpx" } }],
    });

    await storeGpsEfforts(db, A, -5, ride(200));

    expect(db.tables.strava_activities[0].raw).toEqual({
      import_source: "strava_gpx",
      gps_col_times: [{ slug: "col-zonder", seconds: 140, started_at: new Date(START + 10_000).toISOString() }],
    });
  });
});

describe("bestGpsColTimes", () => {
  it("neemt per col de snelste eigen tijd, uit segmenten en uit de rit", () => {
    const best = bestGpsColTimes({
      cols: [
        { slug: "alpe", strava_segment_id: 652851 },
        { slug: "falzarego", strava_segment_id: null },
      ],
      activities: [
        { id: -1, segment_times: [{ segment_id: 652851, seconds: 3000, started_at: "a" }] },
        { id: -2, segment_times: [{ segment_id: "652851", seconds: 2900, started_at: "b" }, { segment_id: 123, seconds: 10, started_at: "c" }] },
        { id: -3, col_times: [{ slug: "falzarego", seconds: 3600, started_at: "d" }] },
        { id: -4, col_times: [{ slug: "falzarego", seconds: 3500, started_at: "e" }] },
        { id: -5, col_times: "kapot", segment_times: "kapot" },
      ],
    });
    expect(Object.fromEntries(best)).toEqual({
      alpe: { seconds: 2900, activityId: -2, at: "b" },
      falzarego: { seconds: 3500, activityId: -4, at: "e" },
    });
  });
});

describe("gpsSegmentAggregates", () => {
  it("telt ritten per uitgekozen segment en laat cols aan de coltijden", () => {
    const aggregates = gpsSegmentAggregates({
      segments: [
        { slug: "vam", collection: "benelux_popular", strava_segment_id: 10 },
        { slug: "alpe", collection: "cols", strava_segment_id: 652851 },
      ],
      activities: [
        { id: -1, segment_times: [{ segment_id: 10, seconds: 300, started_at: "2026-01-02" }] },
        { id: -2, segment_times: [{ segment_id: "10", seconds: 280, started_at: "2026-03-01" }, { segment_id: 652851, seconds: 3000, started_at: "2026-03-01" }] },
        { id: -3, segment_times: [{ segment_id: 10, seconds: 310, started_at: "2025-12-01" }, { segment_id: 10, seconds: 0, started_at: "x" }] },
      ],
    });
    expect(aggregates).toEqual([
      {
        slug: "vam",
        count: 3,
        firstAt: "2025-12-01",
        firstActivityId: -3,
        lastAt: "2026-03-01",
        lastActivityId: -2,
        best: { seconds: 280, activityId: -2, at: "2026-03-01" },
      },
    ]);
  });
});

describe("timedTrackFromStreams", () => {
  it("koppelt tijd en positie per index, ook als een punt ongeldig is", () => {
    const body = [
      { type: "latlng", data: [52, null, 52.02], data2: [5, null, 5.02] },
      { type: "time", data: [0, 1, 5] },
    ];
    expect(timedTrackFromStreams(body, START)).toEqual([
      { lat: 52, lon: 5, t: START },
      { lat: 52.02, lon: 5.02, t: START + 5000 },
    ]);
  });

  it("is leeg zonder time-stream", () => {
    expect(timedTrackFromStreams([{ type: "latlng", data: [52, 52.01], data2: [5, 5.01] }], START)).toEqual([]);
  });
});

describe("timedTrackFromGpx", () => {
  it("houdt alleen punten met een tijd", () => {
    const gpx = [
      '<gpx><trk><trkseg>',
      '<trkpt lat="50.85" lon="4.35"><time>2025-06-01T08:00:00Z</time></trkpt>',
      '<trkpt lat="50.86" lon="4.35"></trkpt>',
      '<trkpt lat="50.87" lon="4.35"><time>2025-06-01T08:00:07Z</time></trkpt>',
      "</trkseg></trk></gpx>",
    ].join("");
    expect(timedTrackFromGpx(gpx)).toEqual([
      { lat: 50.85, lon: 4.35, t: START },
      { lat: 50.87, lon: 4.35, t: START + 7000 },
    ]);
  });
});
