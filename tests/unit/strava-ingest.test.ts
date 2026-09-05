import { describe, expect, it } from "vitest";
import {
  activityRowFromDetail,
  RAW_DETAIL_DROP_KEYS,
  trimActivityRaw,
} from "@/lib/strava/ingest-activity";
import { isCyclingSportType } from "@/lib/strava/sports";

// Velden die consumenten uit strava_activities.raw lezen. Het pollpad sloeg een
// SummaryActivity op, het webhook-pad een (getrimd) detailobject — deze lijst is
// de afspraak dat die twee inwisselbaar blijven.
//   cols/detector.ts:        map.polyline / map.summary_polyline, total_elevation_gain
//   milestone-evaluators.ts: start_date_local, sport_type, type, name,
//                            athlete_count, achievement_count, pr_count
//   pacing/draft.ts:         device_watts, average_watts, weighted_average_watts
const CONSUMED_RAW_KEYS = [
  "map",
  "total_elevation_gain",
  "start_date_local",
  "sport_type",
  "type",
  "name",
  "athlete_count",
  "achievement_count",
  "pr_count",
  "device_watts",
  "average_watts",
  "weighted_average_watts",
];

const DETAIL = {
  id: 1360128428,
  name: "Ochtendrit",
  sport_type: "Ride",
  type: "Ride",
  start_date: "2026-09-05T06:12:00Z",
  start_date_local: "2026-09-05T08:12:00Z",
  distance: 42123.4,
  total_elevation_gain: 512,
  kudos_count: 7,
  moving_time: 4830,
  elapsed_time: 5100,
  trainer: false,
  commute: false,
  athlete_count: 3,
  achievement_count: 2,
  pr_count: 1,
  device_watts: true,
  average_watts: 213,
  weighted_average_watts: 240,
  map: { polyline: "abc", summary_polyline: "def" },
  segment_efforts: Array.from({ length: 40 }, (_, i) => ({ id: i })),
  laps: [{ id: 1 }],
  splits_metric: [{ split: 1 }],
  best_efforts: [{ id: 9 }],
};

describe("trimActivityRaw", () => {
  it("gooit alleen de bulk weg", () => {
    const trimmed = trimActivityRaw(DETAIL);
    for (const key of RAW_DETAIL_DROP_KEYS) {
      expect(trimmed[key]).toBeUndefined();
    }
  });

  it("bewaart elk veld dat een consument uit raw leest", () => {
    // Deze test is de vangrail: raakt hier een veld kwijt, dan verliezen badges,
    // cols of de pacing-analyse stil data voor ritten die via webhooks binnenkwamen.
    const trimmed = trimActivityRaw(DETAIL);
    for (const key of CONSUMED_RAW_KEYS) {
      expect(trimmed, `raw.${key} moet bewaard blijven`).toHaveProperty(key);
    }
    expect(trimmed.map).toEqual({ polyline: "abc", summary_polyline: "def" });
  });

  it("laat het origineel ongemoeid", () => {
    trimActivityRaw(DETAIL);
    expect(DETAIL.segment_efforts).toHaveLength(40);
  });
});

describe("activityRowFromDetail", () => {
  it("mapt naar dezelfde rijvorm als het reconcile-pad", () => {
    const row = activityRowFromDetail(DETAIL, "profiel-1", 134815)!;
    expect(row.id).toBe(1360128428);
    expect(row.profile_id).toBe("profiel-1");
    expect(row.strava_athlete_id).toBe(134815);
    expect(row.sport_type).toBe("Ride");
    expect(row.start_date).toBe("2026-09-05T06:12:00.000Z");
    expect(row.distance_m).toBe(42123.4);
    expect(row.total_elevation_gain_m).toBe(512);
    expect(row.moving_time_seconds).toBe(4830);
    expect(row.elapsed_time_seconds).toBe(5100);
    expect(row.trainer).toBe(false);
    expect(row.raw).not.toHaveProperty("segment_efforts");
  });

  it("zet achievement_week op de maandag van die week", () => {
    // 5 september 2026 is een zaterdag.
    const row = activityRowFromDetail(DETAIL, "profiel-1", 1)!;
    expect(new Date(`${row.achievement_week}T12:00:00Z`).getUTCDay()).toBe(1);
  });

  it("valt terug op type als sport_type ontbreekt", () => {
    const row = activityRowFromDetail(
      { ...DETAIL, sport_type: undefined },
      "profiel-1",
      1,
    )!;
    expect(row.sport_type).toBe("Ride");
  });

  it("vult ontbrekende getallen met 0 in plaats van NaN", () => {
    const row = activityRowFromDetail(
      { id: 1, start_date: "2026-09-05T06:12:00Z" },
      "profiel-1",
      1,
    )!;
    expect(row.distance_m).toBe(0);
    expect(row.kudos_count).toBe(0);
    expect(row.name).toBe("Strava activiteit");
  });

  it("weigert een activiteit zonder id of startdatum", () => {
    expect(activityRowFromDetail({ start_date: "2026-09-05T06:12:00Z" }, "p", 1)).toBeNull();
    expect(activityRowFromDetail({ id: 1 }, "p", 1)).toBeNull();
    expect(activityRowFromDetail({ id: 1, start_date: "onzin" }, "p", 1)).toBeNull();
  });
});

describe("isCyclingSportType", () => {
  it("herkent de fietsdisciplines die beide sync-paden moeten delen", () => {
    for (const sport of ["Ride", "VirtualRide", "GravelRide", "EBikeRide", "MountainBikeRide"]) {
      expect(isCyclingSportType(sport)).toBe(true);
    }
  });

  it("laat lopen en zwemmen buiten", () => {
    expect(isCyclingSportType("Run")).toBe(false);
    expect(isCyclingSportType("Swim")).toBe(false);
    expect(isCyclingSportType(null)).toBe(false);
  });
});
