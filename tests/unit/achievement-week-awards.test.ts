import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./fake-db";

// Weekbadges. Tot 2026-10-18 las de run alle ritten in één select; PostgREST gaf
// daarvan 1000 willekeurige rijen terug, en elke run koos andere winnaars.

const push = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null));
vi.mock("@/lib/push/send", () => ({ sendNotificationToMembers: push }));

const { awardCompletedAchievementWeeks } = await import("@/lib/achievements/awards");

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
// Woensdag 2026-10-14: de huidige week begint op 12 oktober, de vorige op 5 oktober.
const NOW = new Date("2026-10-14T12:00:00Z");

function rides(profileId: string, count: number, day: string, distance: number, firstId: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: firstId + index,
    profile_id: profileId,
    // Drie uur uit elkaar, zodat het geen dubbele opnames zijn.
    start_date: new Date(Date.parse(`${day}T00:00:00Z`) + index * 3 * 3600_000).toISOString(),
    distance_m: distance,
    total_elevation_gain_m: 10,
    kudos_count: 0,
    moving_time_seconds: 600,
  }));
}

function award(badge: string, profileId: string, week: string, id: string) {
  return { id, badge_id: badge, profile_id: profileId, period_start: week, period_end: week, value: 1, rank: 1 };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  push.mockClear();
});
afterEach(() => vi.useRealTimers());

describe("awardCompletedAchievementWeeks", () => {
  it("leest meer dan 1000 ritten en kiest de echte winnaar", async () => {
    // Lid A: 1200 korte ritten in vier weken (laatste ruim 1000 rijen); lid B: twee lange in de vorige week.
    const db = fakeDb(
      {
        strava_activities: [
          ...rides(A, 1200, "2026-09-14", 100, 1),
          ...rides(B, 2, "2026-10-06", 80_000, 5000),
        ],
        achievement_awards: [],
      },
      { maxRows: 1000 },
    );
    await awardCompletedAchievementWeeks(db);

    const weekly = (badge: string, week: string) =>
      db.tables.achievement_awards
        .filter((row) => row.badge_id === badge && row.period_start === week)
        .map((row) => row.profile_id);
    // Week van 5 oktober: B rijdt 160 km, A de laatste van zijn 1200 ritten.
    expect(weekly("distance_week", "2026-10-05")).toEqual([B]);
    expect(weekly("consistency_week", "2026-10-05")).toEqual([A]);
    // Alle vier weken van A zijn gezien, ook die na de eerste 1000 rijen.
    expect(weekly("distance_week", "2026-09-14")).toEqual([A]);
    expect(weekly("distance_week", "2026-10-05")).toHaveLength(1);
  });

  it("neemt een verouderde winnaar de badge af, maar alleen in de herrekende weken", async () => {
    const db = fakeDb({
      strava_activities: rides(B, 2, "2026-10-06", 80_000, 1),
      achievement_awards: [
        award("distance_week", A, "2026-10-05", "oud-recent"),
        award("distance_week", A, "2025-01-06", "oud-historie"),
      ],
    });
    const result = await awardCompletedAchievementWeeks(db);
    expect(result.removed).toBe(1);
    const ids = db.tables.achievement_awards.map((row) => row.id);
    expect(ids).toContain("oud-historie");
    expect(ids).not.toContain("oud-recent");

    const all = await awardCompletedAchievementWeeks(db, { weeks: "all" });
    expect(all.removed).toBe(1);
    expect(db.tables.achievement_awards.map((row) => row.id)).not.toContain("oud-historie");
  });

  it("stuurt alleen een melding voor de week die net af is", async () => {
    const db = fakeDb({
      strava_activities: [...rides(A, 1, "2026-09-22", 50_000, 1), ...rides(B, 1, "2026-10-06", 50_000, 2)],
      achievement_awards: [],
    });
    await awardCompletedAchievementWeeks(db);
    const notified = push.mock.calls.flatMap(
      (call) => (call[2] as { profileIds: string[] }).profileIds,
    );
    expect(notified).toEqual([B]);
  });

  it("telt een rit in de week van zijn starttijd, ook als achievement_week een zondag zegt", async () => {
    const db = fakeDb({
      strava_activities: [{ ...rides(A, 1, "2026-10-06", 50_000, 1)[0], achievement_week: "2026-10-04" }],
      achievement_awards: [],
    });
    await awardCompletedAchievementWeeks(db);
    expect(new Set(db.tables.achievement_awards.map((row) => row.period_start))).toEqual(
      new Set(["2026-10-05"]),
    );
  });
});
