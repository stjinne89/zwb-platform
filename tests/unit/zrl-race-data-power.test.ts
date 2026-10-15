import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RaceData } from "@/lib/zrl-live/snapshot";

const START = 1_800_000_000_000;

const db = vi.hoisted(() => ({
  frozen: null as unknown,
  saved: [] as Array<Record<string, unknown>>,
}));
const zwift = vi.hoisted(() => ({
  results: vi.fn(),
  segments: vi.fn(),
  event: vi.fn(),
}));

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/zrl-live/team-result", () => ({ freezeZrlTeamResult: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.frozen ? { data: db.frozen } : null }) }) }),
      upsert: async (row: Record<string, unknown>) => {
        db.saved.push(row);
        return { error: null };
      },
    }),
  }),
}));
vi.mock("@/lib/events/zwift-club", () => ({
  fetchSubgroupResults: zwift.results,
  fetchSegmentResults: zwift.segments,
  fetchZwiftEvent: zwift.event,
  fetchEntrants: vi.fn(async () => []),
}));

const { loadZrlRaceData } = await import("@/lib/zrl-live/snapshot");

/** Bevroren data van vóór 2026-10-15: uitslag en passages zonder vermogen. */
function oldSnapshot(): RaceData {
  return {
    fetchedAt: START + 3 * 3600_000,
    eventName: "ZRL",
    format: "ttt",
    subgroups: [
      {
        id: "77",
        label: "B",
        startAt: START,
        routeId: "1",
        laps: 1,
        entrants: [{ zwiftId: "1", name: "Renner" }],
        results: [{ profileId: 1, rank: 1, durationMs: 2_600_000 }],
        resultsOk: true,
      },
      { id: "78", label: "C", startAt: START, routeId: "1", laps: 1, entrants: [], results: [], resultsOk: true },
    ],
    passages: [{ id: "p1", athleteId: 1, segmentId: "S", ts: START + 600_000, elapsed: 30 }],
    segmentsOk: true,
  };
}

beforeEach(() => {
  db.frozen = null;
  db.saved = [];
  zwift.results.mockReset();
  zwift.segments.mockReset();
  zwift.event.mockReset();
});

describe("loadZrlRaceData", () => {
  it("vult bevroren data één keer aan met vermogen en bewaart die met dezelfde ophaaltijd", async () => {
    db.frozen = oldSnapshot();
    zwift.results.mockResolvedValue([{ profileId: 1, rank: 1, durationMs: 2_600_000, avgWatts: 256, weightKg: 74 }]);
    zwift.segments.mockResolvedValue([{ id: "p1", athleteId: 1, avgPower: 324, weightKg: 74 }]);

    const data = await loadZrlRaceData("5737449");

    expect(data?.withPower).toBe(true);
    expect(data?.passages[0]).toMatchObject({ id: "p1", avgPower: 324, weightKg: 74 });
    expect(data?.subgroups[0].results[0].avgWatts).toBe(256);
    // De lege subgroep wordt niet opgevraagd.
    expect(zwift.results).toHaveBeenCalledTimes(1);
    expect(zwift.results).toHaveBeenCalledWith("77");
    // Het venster: vanaf de start tot twee uur erna.
    expect(zwift.segments).toHaveBeenCalledWith("S", { from: START, to: START + 2 * 3600_000 });
    expect(db.saved).toHaveLength(1);
    expect(db.saved[0].frozen_at).toBe(new Date(START + 3 * 3600_000).toISOString());
  });

  it("vraagt niets aan Zwift als het vermogen er al is", async () => {
    db.frozen = { ...oldSnapshot(), withPower: true };
    const data = await loadZrlRaceData("5737449");
    expect(data?.withPower).toBe(true);
    expect(zwift.results).not.toHaveBeenCalled();
    expect(zwift.segments).not.toHaveBeenCalled();
    expect(db.saved).toHaveLength(0);
  });

  it("bewaart niets als een deel mislukt, zodat een volgende bezoeker het opnieuw probeert", async () => {
    db.frozen = oldSnapshot();
    zwift.results.mockResolvedValue([{ profileId: 1, rank: 1, durationMs: 2_600_000, avgWatts: 256 }]);
    zwift.segments.mockRejectedValue(new Error("Zwift-API gaf status 429"));

    const data = await loadZrlRaceData("5737449");

    expect(data?.withPower).toBe(false);
    expect(data?.subgroups[0].results[0].avgWatts).toBe(256);
    expect(data?.passages[0].avgPower).toBeUndefined();
    expect(db.saved).toHaveLength(0);
  });

  it("geeft null als de race niet bevroren is en Zwift faalt", async () => {
    zwift.event.mockRejectedValue(new Error("weg"));
    expect(await loadZrlRaceData("5737449")).toBeNull();
  });
});
