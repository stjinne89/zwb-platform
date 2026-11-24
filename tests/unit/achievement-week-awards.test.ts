import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./fake-db";

// Weekbadges. Tot 2026-10-18 las de run alle ritten in één select; PostgREST gaf
// daarvan 1000 willekeurige rijen terug, en elke run koos andere winnaars.

const push = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null));
vi.mock("@/lib/push/send", () => ({ sendNotificationToMembers: push }));

const { awardCompletedAchievementWeeks, BADGES } = await import("@/lib/achievements/awards");
const { SCALE_VERSION } = await import("@/lib/briljant/norms");

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

const T = "00000000-0000-0000-0000-00000000000f";

function members() {
  return [A, B].map((id) => ({ id, is_test: false, is_approved: true }));
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
        profiles: members(),
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
      profiles: members(),
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
      profiles: members(),
      achievement_awards: [],
    });
    await awardCompletedAchievementWeeks(db);
    const notified = push.mock.calls.flatMap(
      (call) => (call[2] as { profileIds: string[] }).profileIds,
    );
    expect(notified).toEqual([B]);
  });

  it("kent Zitvleeskampioen toe en Kudo-magneet niet meer", async () => {
    const db = fakeDb({
      strava_activities: [
        { ...rides(A, 1, "2026-10-06", 20_000, 1)[0], moving_time_seconds: 3 * 3600, kudos_count: 40 },
        { ...rides(B, 1, "2026-10-07", 60_000, 2)[0], moving_time_seconds: 2 * 3600 },
      ],
      profiles: members(),
      achievement_awards: [],
    });
    await awardCompletedAchievementWeeks(db);
    const badges = db.tables.achievement_awards.map((row) => `${row.badge_id}:${row.profile_id}`);
    expect(badges).toContain(`hours_week:${A}`);
    expect(badges).toContain(`distance_week:${B}`);
    expect(badges.some((badge) => badge.startsWith("kudos_received_week"))).toBe(false);
  });

  it("slaat een badge over die nog niet in achievement_badges staat", async () => {
    const db = fakeDb({
      strava_activities: rides(B, 1, "2026-10-06", 50_000, 1),
      profiles: members(),
      achievement_awards: [],
    });
    // Zoals Postgres zonder migratie 0277: de foreign key weigert hours_week.
    const missingBadge = {
      ...db,
      from(table: string) {
        const query = db.from(table);
        if (table !== "achievement_awards") return query;
        const upsert = query.upsert.bind(query);
        type Upsert = (rows: Array<{ badge_id: string }>, options?: { onConflict?: string }) => unknown;
        (query as unknown as { upsert: Upsert }).upsert = (rows, options) =>
          rows.some((row) => row.badge_id === "hours_week")
            ? Promise.resolve({ data: null, error: { code: "23503", message: "foreign key" } })
            : upsert(rows, options);
        return query;
      },
    };
    const result = await awardCompletedAchievementWeeks(missingBadge);
    const badges = db.tables.achievement_awards.map((row) => row.badge_id);
    expect(badges).toContain("distance_week");
    expect(badges).not.toContain("hours_week");
    expect(result.awarded).toBe(badges.length);
    const bodies = push.mock.calls.map((call) => (call[1] as { body: string }).body);
    expect(bodies.join(" ")).not.toContain("Zitvlees");
  });

  it("geeft een testaccount (0333) geen badge en neemt een eerdere af", async () => {
    const db = fakeDb({
      strava_activities: [...rides(T, 1, "2026-10-06", 200_000, 1), ...rides(B, 1, "2026-10-06", 50_000, 2)],
      profiles: [...members(), { id: T, is_test: true }],
      achievement_awards: [award("distance_week", T, "2026-10-05", "test-oud")],
    });
    await awardCompletedAchievementWeeks(db);
    const winners = db.tables.achievement_awards.map((row) => row.profile_id);
    expect(winners).not.toContain(T);
    expect(db.tables.achievement_awards.filter((row) => row.badge_id === "distance_week").map((row) => row.profile_id)).toEqual([B]);
  });

  it("telt een rit in de week van zijn starttijd, ook als achievement_week een zondag zegt", async () => {
    const db = fakeDb({
      strava_activities: [{ ...rides(A, 1, "2026-10-06", 50_000, 1)[0], achievement_week: "2026-10-04" }],
      profiles: members(),
      achievement_awards: [],
    });
    await awardCompletedAchievementWeeks(db);
    expect(new Set(db.tables.achievement_awards.map((row) => row.period_start))).toEqual(
      new Set(["2026-10-05"]),
    );
  });

  describe("elke ranglijst een badge (0356)", () => {
    const C = "00000000-0000-0000-0000-00000000000c";
    const D = "00000000-0000-0000-0000-00000000000d";
    const facets = (level: number) => ({
      sprint: level,
      anaeroob: level,
      vo2max: level,
      drempel: level,
      durability: level,
      fitheid: level,
      racen: level,
    });
    const snapshot = (profile: string, week: string, level: number) => ({
      profile_id: profile,
      week,
      facets: facets(level),
      consistency: null,
      provenance: { scale: SCALE_VERSION },
    });

    function week(extra: Record<string, Array<Record<string, unknown>>> = {}) {
      return fakeDb({
        strava_activities: [
          // A: één lange buitenrit. B: twee dagen op de rollenbank.
          { ...rides(A, 1, "2026-10-06", 50_000, 1)[0], moving_time_seconds: 2 * 3600 },
          { ...rides(B, 1, "2026-10-07", 30_000, 2)[0], moving_time_seconds: 5400, trainer: true },
          { ...rides(B, 1, "2026-10-08", 10_000, 3)[0], moving_time_seconds: 1800, trainer: true },
        ],
        profiles: [
          ...members(),
          { id: C, is_test: false, is_approved: true },
          { id: D, is_test: false, is_approved: false },
        ],
        events: [{ id: "e1", start_at: "2026-10-07T18:00:00.000Z" }],
        event_rsvps: [
          { event_id: "e1", profile_id: A, status: "yes" },
          { event_id: "e1", profile_id: B, status: "no" },
        ],
        live_sessions: [
          { id: "l1", profile_id: A, started_at: "2026-10-09T18:00:00.000Z", last_seen_at: null, ended_at: "2026-10-09T19:00:00.000Z" },
          { id: "l2", profile_id: B, started_at: "2026-10-08T18:00:00.000Z", last_seen_at: null, ended_at: "2026-10-08T19:00:00.000Z" },
        ],
        zwbriljant_preferences: [
          { profile_id: A, visible: true },
          { profile_id: B, visible: true },
          { profile_id: C, visible: false },
          { profile_id: D, visible: true },
        ],
        zwbriljant_snapshots: [
          snapshot(A, "2026-09-28", 3),
          snapshot(A, "2026-10-05", 3.5),
          snapshot(B, "2026-09-28", 4),
          snapshot(B, "2026-10-05", 4.1),
          // C groeit het meest maar deelt niet; D deelt maar is niet goedgekeurd.
          snapshot(C, "2026-09-28", 2),
          snapshot(C, "2026-10-05", 4),
          snapshot(D, "2026-09-28", 2),
          snapshot(D, "2026-10-05", 4),
        ],
        achievement_awards: [],
        ...extra,
      });
    }

    const winners = (db: ReturnType<typeof fakeDb>, badge: string, period = "2026-10-05") =>
      db.tables.achievement_awards
        .filter((row) => row.badge_id === badge && row.period_start === period)
        .map((row) => row.profile_id)
        .sort();

    it("kent voor elke ranglijst een weekbadge toe", async () => {
      const db = week();
      await awardCompletedAchievementWeeks(db);
      expect(BADGES).toHaveLength(10);
      expect(winners(db, "longest_ride_week")).toEqual([A]);
      expect(winners(db, "outdoor_week")).toEqual([A]);
      expect(winners(db, "indoor_week")).toEqual([B]);
      expect(winners(db, "days_week")).toEqual([B]);
      // A: een event en een andere dag live; B zei nee en reed één keer live.
      expect(winners(db, "clubmens_week")).toEqual([A]);
      expect(winners(db, "growth_week")).toEqual([A]);
      for (const badge of BADGES) expect(winners(db, badge.id).length).toBeGreaterThan(0);
      const growth = db.tables.achievement_awards.find((row) => row.badge_id === "growth_week");
      expect(Number(growth?.value)).toBeGreaterThan(0);
      expect(growth?.metadata).toEqual({ unit: "punten" });
    });

    it("geeft bij gelijke stand iedereen op plek 1 de badge", async () => {
      const db = fakeDb({
        strava_activities: [...rides(A, 1, "2026-10-06", 40_000, 1), ...rides(B, 1, "2026-10-07", 40_000, 2)],
        profiles: members(),
        achievement_awards: [],
      });
      await awardCompletedAchievementWeeks(db);
      expect(winners(db, "distance_week")).toEqual([A, B].sort());
      expect(winners(db, "days_week")).toEqual([A, B].sort());
    });

    it("neemt een Groeibriljant-badge af van wie niet (meer) deelt", async () => {
      const db = week({ achievement_awards: [award("growth_week", C, "2026-10-05", "groei-c")] });
      await awardCompletedAchievementWeeks(db);
      expect(winners(db, "growth_week")).toEqual([A]);
      expect(db.tables.achievement_awards.map((row) => row.id)).not.toContain("groei-c");
    });

    it("laat de badges van een bron die niet te lezen is staan", async () => {
      const db = week({ achievement_awards: [award("growth_week", B, "2026-10-05", "groei-b")] });
      const broken = {
        ...db,
        from(table: string) {
          if (table === "zwbriljant_preferences") throw new Error("tabel weg");
          return db.from(table);
        },
      };
      await awardCompletedAchievementWeeks(broken);
      expect(db.tables.achievement_awards.map((row) => row.id)).toContain("groei-b");
      expect(winners(db, "growth_week")).toEqual([B]);
      expect(winners(db, "distance_week")).toEqual([A]);
    });
  });
});
