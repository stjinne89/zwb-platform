import polyline from "@mapbox/polyline";
import { describe, expect, it } from "vitest";
import fixture from "../fixtures/intervals/activities.json";
import {
  dedupeRides,
  encodeTrackPolyline,
  intervalsActivityToRideRow,
  intervalsRideId,
  isIntervalsRideId,
  isSameRide,
  isUsableIntervalsRide,
  latLngFromStreams,
  rideSourceFor,
  startInstant,
  type IntervalsRideInput,
  type LatLng,
} from "@/lib/intervals/rides";
import { stravaActivityFromGpx, syntheticAthleteId } from "@/lib/strava/import";
import { rideMetricsFromStrava } from "@/lib/training/ride-metrics";

// De fixture volgt de verwachte vorm. Vervang hem door de uitvoer van
// `node scripts/intervals-probe.mjs --fixture` zodra die er is.
const activities = fixture as IntervalsRideInput[];
const [wahoo, zwift, garminTrainer, stravaStub, run, gravel] = activities;
const profileId = "00000000-0000-0000-0000-000000000001";
const now = new Date("2026-09-30T12:00:00Z");

describe("rideSourceFor", () => {
  it("geeft Strava voorrang, en intervals alleen zonder Strava", () => {
    expect(rideSourceFor({ hasActiveStrava: true, hasIntervals: true })).toBe("strava");
    expect(rideSourceFor({ hasActiveStrava: false, hasIntervals: true })).toBe("intervals");
    expect(rideSourceFor({ hasActiveStrava: false, hasIntervals: false })).toBe("none");
  });
});

describe("intervalsRideId", () => {
  it("is negatief, omkeerbaar en herkenbaar", () => {
    expect(intervalsRideId("i81234567")).toBe(-1_000_081_234_567);
    expect(intervalsRideId("81234567")).toBe(-1_000_081_234_567);
    expect(isIntervalsRideId(intervalsRideId("i81234567"))).toBe(true);
    expect(isIntervalsRideId(12345)).toBe(false);
  });

  it("slaat een id over dat niet numeriek is", () => {
    expect(intervalsRideId("abc")).toBeNull();
    expect(intervalsRideId(null)).toBeNull();
  });

  it("botst niet met de hash van een GPX-import", () => {
    const gpx = stravaActivityFromGpx(
      '<gpx><trk><type>cycling</type><trkseg>' +
        '<trkpt lat="52.0" lon="5.0"><time>2026-09-27T06:30:00Z</time></trkpt>' +
        '<trkpt lat="52.01" lon="5.0"><time>2026-09-27T06:35:00Z</time></trkpt>' +
        "</trkseg></trk></gpx>",
      profileId,
    );
    expect(gpx.ok).toBe(true);
    if (!gpx.ok) return;
    expect(Number(gpx.row.id)).toBeGreaterThan(-(2 ** 32));
    expect(isIntervalsRideId(gpx.row.id)).toBe(false);
  });
});

describe("isUsableIntervalsRide", () => {
  it("neemt fietsritten mee en laat stubs en hardlopen liggen", () => {
    expect(isUsableIntervalsRide(wahoo)).toBe(true);
    expect(isUsableIntervalsRide(zwift)).toBe(true);
    expect(isUsableIntervalsRide(gravel)).toBe(true);
    expect(isUsableIntervalsRide(stravaStub)).toBe(false);
    expect(isUsableIntervalsRide(run)).toBe(false);
  });
});

describe("startInstant", () => {
  it("gebruikt start_date als die er is", () => {
    expect(startInstant(wahoo)?.toISOString()).toBe("2026-09-27T06:30:00.000Z");
  });

  it("rekent anders terug via de tijdzone, ook in de wintertijd", () => {
    expect(startInstant(gravel)?.toISOString()).toBe("2026-01-15T09:15:00.000Z");
    expect(
      startInstant({ ...gravel, start_date_local: "2026-07-15T10:15:00" })?.toISOString(),
    ).toBe("2026-07-15T08:15:00.000Z");
  });
});

describe("intervalsActivityToRideRow", () => {
  const row = intervalsActivityToRideRow(profileId, wahoo, {
    summaryPolyline: "abc",
    now,
  })!;

  it("vult de kolommen zoals een Strava-rit", () => {
    expect(row).toMatchObject({
      id: -1_000_081_234_567,
      profile_id: profileId,
      strava_athlete_id: syntheticAthleteId(profileId),
      name: "Rondje Veluwe",
      sport_type: "Ride",
      start_date: "2026-09-27T06:30:00.000Z",
      achievement_week: "2026-09-21",
      distance_m: 67512,
      total_elevation_gain_m: 412,
      kudos_count: 0,
      moving_time_seconds: 8298,
      elapsed_time_seconds: 9120,
      trainer: false,
      efforts_fetched_at: now.toISOString(),
    });
  });

  it("zet de lokale tijd zoals Strava, met Z", () => {
    expect(row.raw.start_date_local).toBe("2026-09-27T08:30:00Z");
    expect(new Date(String(row.raw.start_date_local)).getUTCHours()).toBe(8);
  });

  it("markeert de bron en bewaart het spoor", () => {
    expect(row.raw.import_source).toBe("intervals");
    expect(row.raw.intervals_id).toBe("i81234567");
    expect(row.raw.map).toEqual({ summary_polyline: "abc" });
  });

  it("zet geen privévelden in raw, want raw is voor elk lid leesbaar", () => {
    expect(Object.keys(row.raw).filter((key) => key.startsWith("icu_"))).toEqual([]);
    expect(JSON.stringify(row.raw)).not.toContain("74.5");
  });

  it("levert de cijfers die de trainingsnaleving leest", () => {
    const metrics = rideMetricsFromStrava(row.raw, row.moving_time_seconds, 280);
    expect(metrics.hasPowerMeter).toBe(true);
    expect(metrics.averageWatts).toBe(198);
    expect(metrics.normalizedWatts).toBe(214);
    expect(metrics.maxWatts).toBe(812);
    expect(metrics.averageHr).toBe(141);
    expect(metrics.kilojoules).toBe(1643);
    expect(metrics.tss).toBeGreaterThan(0);
  });

  it("ziet een rit zonder vermogen niet als vermogensmeter", () => {
    const noPower = intervalsActivityToRideRow(profileId, gravel, { now })!;
    expect(noPower.raw.device_watts).toBe(false);
    expect(rideMetricsFromStrava(noPower.raw, 7200, 280).tss).toBeNull();
  });

  it("maakt van een Zwift-rit een virtuele trainerrit", () => {
    const virtual = intervalsActivityToRideRow(profileId, zwift, { now })!;
    expect(virtual.sport_type).toBe("VirtualRide");
    expect(virtual.trainer).toBe(true);
  });

  it("geeft null voor een stub of een loop", () => {
    expect(intervalsActivityToRideRow(profileId, stravaStub, { now })).toBeNull();
    expect(intervalsActivityToRideRow(profileId, run, { now })).toBeNull();
  });
});

describe("latLngFromStreams", () => {
  it("leest data en data2", () => {
    expect(
      latLngFromStreams([{ type: "latlng", data: [52, 52.1, null], data2: [5, 5.1, null] }]),
    ).toEqual([
      [52, 5],
      [52.1, 5.1],
    ]);
  });

  it("leest paren en losse lat/lng-streams", () => {
    expect(latLngFromStreams([{ type: "latlng", data: [[52, 5], [0, 0], [52.2, 5.2]] }])).toEqual([
      [52, 5],
      [52.2, 5.2],
    ]);
    expect(latLngFromStreams({ lat: [52, 52.3], lng: [5, 5.3] })).toEqual([
      [52, 5],
      [52.3, 5.3],
    ]);
  });

  it("geeft een lege lijst zonder spoor", () => {
    expect(latLngFromStreams([{ type: "watts", data: [200] }])).toEqual([]);
    expect(latLngFromStreams(null)).toEqual([]);
  });
});

describe("encodeTrackPolyline", () => {
  it("dunt uit en houdt begin en eind", () => {
    const points: LatLng[] = Array.from({ length: 2001 }, (_, i) => [52 + i / 10000, 5]);
    const encoded = encodeTrackPolyline(points, 500)!;
    const decoded = polyline.decode(encoded);
    expect(decoded.length).toBeLessThanOrEqual(501);
    expect(decoded[0]).toEqual([52, 5]);
    expect(decoded[decoded.length - 1]).toEqual([52.2, 5]);
  });

  it("geeft null bij minder dan twee punten", () => {
    expect(encodeTrackPolyline([[52, 5]])).toBeNull();
  });
});

describe("dedupeRides", () => {
  const zwiftRow = intervalsActivityToRideRow(profileId, zwift, { now })!;
  const garminRow = intervalsActivityToRideRow(profileId, garminTrainer, { now })!;
  const wahooRow = intervalsActivityToRideRow(profileId, wahoo, { now })!;

  it("herkent dezelfde trainerrit van twee toestellen", () => {
    expect(isSameRide(zwiftRow, garminRow)).toBe(true);
    expect(isSameRide(zwiftRow, wahooRow)).toBe(false);
  });

  it("houdt de rit met vermogen", () => {
    const { keep, skipped } = dedupeRides([garminRow, zwiftRow, wahooRow], []);
    expect(keep.map((ride) => ride.id).sort()).toEqual([wahooRow.id, zwiftRow.id].sort());
    expect(skipped.map((ride) => ride.id)).toEqual([garminRow.id]);
  });

  it("laat een update van dezelfde rij door", () => {
    const { keep } = dedupeRides([wahooRow], [wahooRow]);
    expect(keep).toHaveLength(1);
  });

  it("slaat een rit over die al als import bestaat", () => {
    const imported = {
      id: -123456,
      start_date: "2026-09-27T06:31:00.000Z",
      distance_m: 67400,
      raw: { import_source: "strava_gpx" },
    };
    const { keep, skipped } = dedupeRides([wahooRow], [imported]);
    expect(keep).toHaveLength(0);
    expect(skipped).toHaveLength(1);
  });
});

describe("isStravaActivityId", () => {
  it("geldt alleen voor echte Strava-ritten", async () => {
    const { isStravaActivityId } = await import("@/lib/intervals/ride-id");
    expect(isStravaActivityId(12345678901)).toBe(true);
    expect(isStravaActivityId("12345678901")).toBe(true);
    expect(isStravaActivityId(-123456)).toBe(false);
    expect(isStravaActivityId(intervalsRideId("i81234567"))).toBe(false);
    expect(isStravaActivityId(null)).toBe(false);
  });
});
