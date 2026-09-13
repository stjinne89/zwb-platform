import { describe, expect, it } from "vitest";
import { runScheduledSegmentBackfill, type BackfillDeps } from "@/lib/segments/scheduled-backfill";
import type { IngestOutcome } from "@/lib/strava/ingest-activity";
import type { GeometryOutcome } from "@/lib/segments/geometry-sync";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";

function fakeAdmin(queue: Array<{ id: number; profile_id: string }>) {
  const updates: number[] = [];
  const connections = [A, B].map((profile_id, i) => ({ profile_id, strava_athlete_id: i + 1, access_token: "t", refresh_token: "r", expires_at: 0 }));
  const admin = {
    updates,
    from(table: string) {
      const state = { update: false, head: false, id: 0 };
      const builder = {
        select: (_cols: string, opts?: { head?: boolean }) => { state.head = Boolean(opts?.head); return builder; },
        update: () => { state.update = true; return builder; },
        eq: (column: string, value: unknown) => { if (state.update && column === "id") state.id = Number(value); return builder; },
        in: () => builder, is: () => builder, order: () => builder, limit: () => builder,
        then: (resolve: (value: unknown) => void) => {
          if (table === "strava_connections") return resolve({ data: connections, error: null });
          if (state.update) { updates.push(state.id); return resolve({ error: null }); }
          if (state.head) return resolve({ count: queue.length, error: null });
          return resolve({ data: queue, error: null });
        },
      };
      return builder;
    },
  };
  return admin;
}

type Geo = Array<{ id: string; profile_id: string }>;
function deps(outcomes: Record<number, IngestOutcome>, extra: Partial<BackfillDeps> = {}, geo: Geo = [], geoOutcomes: Record<string, GeometryOutcome> = {}) {
  const calls: number[] = [];
  const geometryCalls: string[] = [];
  const order: string[] = [];
  const value: Partial<BackfillDeps> = {
    now: () => 0,
    loadUsage: async () => null,
    tokenFor: async (c) => `token-${c.profile_id}`,
    ingest: async (_c, id) => { calls.push(id); order.push("ride"); return outcomes[id] ?? { status: "stored", activityId: id, efforts: 3 }; },
    geometryCandidates: async (limit) => geo.slice(0, limit),
    fetchGeometry: async (_t, id) => { geometryCalls.push(id); order.push("geo"); return geoOutcomes[id] ?? "ready"; },
    ...extra,
  };
  return { value, calls, geometryCalls, order };
}

describe("runScheduledSegmentBackfill", () => {
  it("haalt ritten op zolang er tijd is", async () => {
    const admin = fakeAdmin([{ id: 1, profile_id: A }, { id: 2, profile_id: B }]);
    const d = deps({});
    const result = await runScheduledSegmentBackfill(admin, { deadline: 8000, deps: d.value });
    expect(d.calls).toEqual([1, 2]);
    expect(result.fetched).toBe(2);
  });

  it("begint met één voorrangslijn zolang er ritten openstaan", async () => {
    const admin = fakeAdmin([{ id: 1, profile_id: A }]);
    const d = deps({}, {}, [{ id: "10", profile_id: A }, { id: "11", profile_id: B }]);
    const result = await runScheduledSegmentBackfill(admin, { deadline: 8000, deps: d.value });
    expect(d.order).toEqual(["geo", "ride"]);
    expect(d.geometryCalls).toEqual(["10"]);
    expect(result.geometry).toBe(1);
  });

  it("gaat door met ritten als de voorrangslijst niet op tijd antwoordt", async () => {
    let signal: AbortSignal | undefined;
    const admin = Object.assign(fakeAdmin([{ id: 1, profile_id: A }]), {
      rpc: () => ({ abortSignal: (s: AbortSignal) => { signal = s; return Promise.reject(new DOMException("timeout", "TimeoutError")); } }),
    });
    const d = deps({});
    delete d.value.geometryCandidates;
    const result = await runScheduledSegmentBackfill(admin, { deadline: 8000, deps: d.value });
    expect(signal).toBeDefined();
    expect(d.geometryCalls).toEqual([]);
    expect(result.fetched).toBe(1);
  });

  it("slaat een voorrangslijn zonder bruikbare token over in plaats van vast te lopen", async () => {
    const admin = fakeAdmin([{ id: 1, profile_id: A }]);
    const d = deps({}, {}, [{ id: "10", profile_id: "onbekend" }, { id: "11", profile_id: B }]);
    await runScheduledSegmentBackfill(admin, { deadline: 8000, deps: d.value });
    expect(d.geometryCalls).toEqual(["11"]);
  });

  it("besteedt de hele run aan segmentlijnen zodra alle ritten binnen zijn", async () => {
    const admin = fakeAdmin([]);
    const geo = ["10", "11", "12"].map((id) => ({ id, profile_id: A }));
    const d = deps({}, {}, geo, { "11": "private" });
    const result = await runScheduledSegmentBackfill(admin, { deadline: 8000, deps: d.value });
    expect(d.geometryCalls).toEqual(["10", "11", "12"]);
    expect(result).toMatchObject({ geometry: 2, remaining: 0, stopped: "done" });
  });

  it("stopt als er minder dan 2,5 s over is", async () => {
    const admin = fakeAdmin([{ id: 1, profile_id: A }]);
    const d = deps({}, { now: () => 6000 }, [{ id: "10", profile_id: A }]);
    const result = await runScheduledSegmentBackfill(admin, { deadline: 8000, deps: d.value });
    expect(d.calls).toEqual([]);
    expect(d.geometryCalls).toEqual([]);
    expect(result.stopped).toBe("deadline");
  });

  it("laat de helft van het kwartierbudget over voor leden", async () => {
    const admin = fakeAdmin([{ id: 1, profile_id: A }]);
    const d = deps({}, { loadUsage: async () => ({ shortTermUsed: 200, shortTermLimit: 400, dailyUsed: 10, dailyLimit: 4000 }) });
    const result = await runScheduledSegmentBackfill(admin, { deadline: 8000, deps: d.value });
    expect(d.calls).toEqual([]);
    expect(result.stopped).toBe("budget");
  });

  it("vinkt een onvolledige rit af, maar laat een tijdelijke fout staan", async () => {
    const admin = fakeAdmin([{ id: 1, profile_id: A }, { id: 2, profile_id: A }]);
    const d = deps({ 1: { status: "skipped", reason: "Onvolledige activiteit." }, 2: { status: "failed", error: "503" } });
    const result = await runScheduledSegmentBackfill(admin, { deadline: 8000, deps: d.value });
    expect(admin.updates).toEqual([1]);
    expect(result).toMatchObject({ abandoned: 1, failed: 1 });
  });

  it("stopt bij een storing en bij een rate limit", async () => {
    const failing = fakeAdmin([1, 2, 3, 4].map((id) => ({ id, profile_id: A })));
    const d = deps(Object.fromEntries([1, 2, 3, 4].map((id) => [id, { status: "failed", error: "timeout" } as IngestOutcome])));
    expect((await runScheduledSegmentBackfill(failing, { deadline: 8000, deps: d.value })).stopped).toBe("failures");
    expect(d.calls).toEqual([1, 2, 3]);

    const limited = fakeAdmin([{ id: 1, profile_id: A }, { id: 2, profile_id: A }]);
    const r = deps({ 1: { status: "rate_limited" } });
    expect((await runScheduledSegmentBackfill(limited, { deadline: 8000, deps: r.value })).stopped).toBe("rate_limited");
    expect(r.calls).toEqual([1]);

    const geoLimited = fakeAdmin([{ id: 1, profile_id: A }]);
    const g = deps({}, {}, [{ id: "10", profile_id: A }], { "10": "rate_limited" });
    expect((await runScheduledSegmentBackfill(geoLimited, { deadline: 8000, deps: g.value })).stopped).toBe("rate_limited");
    expect(g.calls).toEqual([]);
  });

  it("slaat een lid met een dode token over zonder de rest op te houden", async () => {
    const admin = fakeAdmin([{ id: 1, profile_id: A }, { id: 2, profile_id: B }, { id: 3, profile_id: A }]);
    const d = deps({ 1: { status: "auth_failed" } });
    const result = await runScheduledSegmentBackfill(admin, { deadline: 8000, deps: d.value });
    expect(d.calls).toEqual([1, 2]);
    expect(result.fetched).toBe(1);
    expect(admin.updates).toEqual([]);
  });
});
