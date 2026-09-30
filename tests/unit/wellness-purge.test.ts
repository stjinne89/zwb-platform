import { describe, expect, it } from "vitest";
import { purgeWellnessForProfile } from "@/lib/training/wellness";
import { fakeDb } from "./fake-db";

describe("purgeWellnessForProfile", () => {
  it("wist alleen de herstelwaarden van dat lid, niet de trainingsdata", async () => {
    const db = fakeDb({
      profile_wellness: [
        { profile_id: "a", date: "2026-09-29", hrv: 60 },
        { profile_id: "a", date: "2026-09-30", hrv: 62 },
        { profile_id: "b", date: "2026-09-30", hrv: 55 },
      ],
      intervals_activities: [{ profile_id: "a", intervals_id: "i1" }],
      strava_activities: [{ id: -1_000_000_000_001, profile_id: "a" }],
    });
    const result = await purgeWellnessForProfile(db, "a");
    expect(result.error).toBeNull();
    expect(db.tables.profile_wellness).toEqual([{ profile_id: "b", date: "2026-09-30", hrv: 55 }]);
    expect(db.tables.intervals_activities).toHaveLength(1);
    expect(db.tables.strava_activities).toHaveLength(1);
  });
});
