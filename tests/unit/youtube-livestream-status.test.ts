import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  fetchVideoStatuses,
  liveNotificationText,
  planStatusChanges,
  videoStatus,
  type OpenStream,
} from "@/lib/youtube-live/status";
import { overlayRows, overlayValue } from "@/lib/zrl-live/overlay";
import type { TeamScore } from "@/lib/zrl-live/scoring";

// Livestreams, fase 2 (0339): live-status bij YouTube, één melding per race,
// en de ZRL-overlay voor OBS. Tegen de echte API is dit niet getest.

afterEach(() => vi.unstubAllGlobals());

const NOW = new Date("2026-12-22T19:05:00Z");

function stream(overrides: Partial<OpenStream>): OpenStream {
  return {
    id: "s1",
    event_id: "race",
    profile_id: "p1",
    youtube_video_id: "aaaaaaaaaaa",
    scheduled_start_at: "2026-12-22T18:50:00Z",
    status: "gepland",
    live_notified_at: null,
    ...overrides,
  };
}

describe("status van een video", () => {
  it("leest live, gepland, afgelopen en weg", () => {
    expect(videoStatus({ id: "a", snippet: { liveBroadcastContent: "live" } })).toBe("live");
    expect(videoStatus({ id: "a", snippet: { liveBroadcastContent: "upcoming" } })).toBe("gepland");
    expect(
      videoStatus({
        id: "a",
        snippet: { liveBroadcastContent: "none" },
        liveStreamingDetails: { actualStartTime: "x", actualEndTime: "y" },
      }),
    ).toBe("afgelopen");
    expect(videoStatus(undefined)).toBe("weg");
  });

  it("vraagt tot vijftig video's per keer, met de API-sleutel", async () => {
    const urls: URL[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL) => {
        urls.push(new URL(String(url)));
        return new Response(
          JSON.stringify({ items: [{ id: "v0", snippet: { liveBroadcastContent: "live" } }] }),
          { status: 200 },
        );
      }),
    );
    const ids = Array.from({ length: 51 }, (_, i) => `v${i}`);
    const statuses = await fetchVideoStatuses("sleutel", ids);
    expect(urls).toHaveLength(2);
    expect(urls[0].searchParams.get("id")?.split(",")).toHaveLength(50);
    expect(urls[0].searchParams.get("key")).toBe("sleutel");
    expect(statuses.get("v0")).toBe("live");
    expect(statuses.get("v1")).toBe("weg");
    expect(statuses.size).toBe(51);
  });
});

describe("wat er verandert", () => {
  it("geeft één melding per race, ook als twee streams tegelijk live gaan", () => {
    const streams = [stream({}), stream({ id: "s2", profile_id: "p2", youtube_video_id: "bbbbbbbbbbb" })];
    const fetched = new Map([
      ["aaaaaaaaaaa", "live" as const],
      ["bbbbbbbbbbb", "live" as const],
    ]);
    const plan = planStatusChanges(streams, fetched, new Set(), NOW);
    expect([...plan.updates]).toEqual([
      ["s1", "live"],
      ["s2", "live"],
    ]);
    expect(plan.notifyEvents).toEqual(["race"]);
  });

  it("stuurt geen tweede melding als de race er al een kreeg", () => {
    const streams = [stream({ status: "live" }), stream({ id: "s2", youtube_video_id: "bbbbbbbbbbb" })];
    const fetched = new Map([
      ["aaaaaaaaaaa", "live" as const],
      ["bbbbbbbbbbb", "live" as const],
    ]);
    expect(planStatusChanges(streams, fetched, new Set(["race"]), NOW).notifyEvents).toEqual([]);
    const notified = [stream({ status: "live", live_notified_at: "2026-12-22T19:01:00Z" })];
    expect(planStatusChanges(notified, fetched, new Set(), NOW).notifyEvents).toEqual([]);
  });

  it("zet een stream die te lang open bleef op afgelopen, zonder YouTube", () => {
    const old = stream({ scheduled_start_at: "2026-12-22T12:00:00Z", status: "live" });
    const plan = planStatusChanges([old], new Map(), new Set(), NOW);
    expect([...plan.updates]).toEqual([["s1", "afgelopen"]]);
    expect(plan.notifyEvents).toEqual([]);
  });

  it("verandert niets als de status gelijk blijft", () => {
    const plan = planStatusChanges([stream({})], new Map([["aaaaaaaaaaa", "gepland" as const]]), new Set(), NOW);
    expect(plan.updates.size).toBe(0);
  });

  it("noemt wie er streamt", () => {
    expect(liveNotificationText("ZRL · B3", ["Anna"])).toEqual({
      title: "ZRL · B3 is live",
      body: "Anna streamt de race.",
    });
    expect(liveNotificationText("ZRL · B3", ["Anna", "Bram", "Cas", "Anna"]).body).toBe(
      "Anna, Bram en Cas streamen de race.",
    );
  });
});

describe("ZRL-overlay", () => {
  const team = (name: string, rank: number, total = 10 * (20 - rank)): TeamScore => ({
    team: name,
    total,
    riders: 6,
    finishers: 6,
    time: null,
    rank,
    league: 0,
  });
  const teams = Array.from({ length: 12 }, (_, i) => team(`t${i + 1}`, i + 1));

  it("toont de top, en de eigen ploeg ook als die lager staat", () => {
    expect(overlayRows(teams, "t2", 8).map((t) => t.team)).toEqual(["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"]);
    expect(overlayRows(teams, "t11", 8).map((t) => t.team)).toEqual(["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t11"]);
  });

  it("houdt het aantal tussen vijf en vijftien", () => {
    expect(overlayRows(teams, null, 2)).toHaveLength(5);
    expect(overlayRows(teams, null, 99)).toHaveLength(12);
  });

  it("toont punten, of in een ploegentijdrit de tijd", () => {
    expect(overlayValue(team("t1", 1, 123), "points")).toBe("123");
    expect(overlayValue({ ...team("t1", 1), time: 1_682_500 }, "ttt")).toBe("28:03");
    expect(overlayValue(team("t1", 1), "ttt")).toBe("—");
  });
});

describe("migratie 0339", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(
      [
        "create role anon; create role authenticated; create role service_role;",
        "create schema auth;",
        "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
        "create table public.profiles(id uuid primary key, is_approved boolean not null default true);",
        "create table public.events(id uuid primary key, title text not null);",
        "create table public.notification_preferences(profile_id uuid primary key, on_live_started boolean not null default true);",
      ].join("\n"),
    );
    await db.exec(await readFile("supabase/migrations/0338_youtube_livestreams.sql", "utf8"));
    const sql = await readFile("supabase/migrations/0339_race_stream_live_status.sql", "utf8");
    await db.exec(sql);
    await db.exec(sql);
    await db.exec(`
      insert into public.profiles(id) values ('11111111-1111-1111-1111-111111111111');
      insert into public.events(id, title) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Race');
      insert into public.notification_preferences(profile_id) values ('11111111-1111-1111-1111-111111111111');
    `);
  }, 30000);

  afterAll(async () => {
    await db?.close();
  });

  it("zet de melding Liverace standaard aan", async () => {
    const { rows } = await db.query<{ on_race_stream_live: boolean }>(
      "select on_race_stream_live from public.notification_preferences",
    );
    expect(rows).toEqual([{ on_race_stream_live: true }]);
  });

  it("kent de status weg, en verder niets nieuws", async () => {
    const insert = (status: string) =>
      db.exec(`insert into public.event_streams(event_id, profile_id, youtube_video_id, scheduled_start_at, status)
               values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'abcdefghijk', now(), '${status}')`);
    await db.exec("begin");
    try {
      await insert("weg");
    } finally {
      await db.exec("rollback");
    }
    await expect(insert("verwijderd")).rejects.toThrow();
  });
});
