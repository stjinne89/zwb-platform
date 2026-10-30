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
  entrants: vi.fn(),
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
  fetchEntrants: zwift.entrants,
}));

const { loadZwiftRaceData } = await import("@/lib/zrl-live/snapshot");

/** Een gereden race van vijf uur geleden met één groep: renner 1 (ZWB) en 2 (onbekend). */
function zwiftEvent() {
  const start = Date.now() - 5 * 3600_000;
  return {
    start,
    event: {
      name: "Zwift - Race: Testcup",
      eventType: "RACE",
      eventSubgroups: [{ id: 501, subgroupLabel: "C", eventSubgroupStart: new Date(start).toISOString(), routeId: 553661379, laps: 1 }],
    },
  };
}

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
  zwift.entrants.mockReset();
  zwift.entrants.mockResolvedValue([]);
});

describe("loadZwiftRaceData", () => {
  it("vult bevroren data één keer aan met vermogen en bewaart die met dezelfde ophaaltijd", async () => {
    db.frozen = oldSnapshot();
    zwift.results.mockResolvedValue([{ profileId: 1, rank: 1, durationMs: 2_600_000, avgWatts: 256, weightKg: 74 }]);
    zwift.segments.mockResolvedValue([{ id: "p1", athleteId: 1, avgPower: 324, weightKg: 74 }]);

    const data = await loadZwiftRaceData("5737449");

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

  it("vraagt niets aan Zwift als vermogen en ZRS er al zijn", async () => {
    db.frozen = { ...oldSnapshot(), withPower: true, withScores: true };
    const data = await loadZwiftRaceData("5737449");
    expect(data?.withPower).toBe(true);
    expect(zwift.results).not.toHaveBeenCalled();
    expect(zwift.segments).not.toHaveBeenCalled();
    expect(db.saved).toHaveLength(0);
  });

  it("vult data met vermogen maar zonder ZRS alleen aan met de ZRS van vóór de race", async () => {
    db.frozen = { ...oldSnapshot(), withPower: true };
    zwift.results.mockResolvedValue([{ profileId: 1, rank: 1, durationMs: 2_600_000, avgWatts: 999, scoreBefore: 312.5 }]);

    const data = await loadZwiftRaceData("5737449");

    expect(data?.withScores).toBe(true);
    // Alleen de score komt erbij; de rest van de bewaarde rij blijft.
    expect(data?.subgroups[0].results[0]).toEqual({ profileId: 1, rank: 1, durationMs: 2_600_000, scoreBefore: 312.5 });
    expect(zwift.results).toHaveBeenCalledWith("77");
    expect(zwift.segments).not.toHaveBeenCalled();
    expect(db.saved).toHaveLength(1);
    expect(db.saved[0].frozen_at).toBe(new Date(START + 3 * 3600_000).toISOString());
  });

  it("bewaart niets als het aanvullen van de ZRS mislukt", async () => {
    db.frozen = { ...oldSnapshot(), withPower: true };
    zwift.results.mockRejectedValue(new Error("Zwift-API gaf status 429"));
    const data = await loadZwiftRaceData("5737449");
    expect(data?.withScores).toBe(false);
    expect(db.saved).toHaveLength(0);
  });

  it("bewaart niets als een deel mislukt, zodat een volgende bezoeker het opnieuw probeert", async () => {
    db.frozen = oldSnapshot();
    zwift.results.mockResolvedValue([{ profileId: 1, rank: 1, durationMs: 2_600_000, avgWatts: 256 }]);
    zwift.segments.mockRejectedValue(new Error("Zwift-API gaf status 429"));

    const data = await loadZwiftRaceData("5737449");

    expect(data?.withPower).toBe(false);
    expect(data?.subgroups[0].results[0].avgWatts).toBe(256);
    expect(data?.passages[0].avgPower).toBeUndefined();
    expect(db.saved).toHaveLength(0);
  });

  it("geeft null als de race niet bevroren is en Zwift faalt", async () => {
    zwift.event.mockRejectedValue(new Error("weg"));
    expect(await loadZwiftRaceData("5737449")).toBeNull();
  });
});

describe("loadZwiftRaceData voor een geplakte link", () => {
  it("haalt geen segmenten op als het lid niet in de uitslag staat", async () => {
    zwift.event.mockResolvedValue(zwiftEvent().event);
    zwift.results.mockResolvedValue([{ profileId: 2, rank: 1, durationMs: 2_000_000 }]);

    expect(await loadZwiftRaceData("6000001", { requireRider: 1 })).toBeNull();
    expect(zwift.segments).not.toHaveBeenCalled();
    expect(db.saved).toHaveLength(0);
  });

  it("bewaart een gereden race, met details alleen van de ZWB'ers", async () => {
    const { event, start } = zwiftEvent();
    zwift.event.mockResolvedValue(event);
    zwift.entrants.mockResolvedValue([
      { zwiftId: "1", name: "Eigen", category: "C" },
      { zwiftId: "2", name: "Onbekende", category: "C" },
    ]);
    zwift.results.mockResolvedValue([
      { profileId: 2, rank: 1, durationMs: 2_000_000, avgWatts: 310, weightKg: 70, scoreBefore: 420 },
      { profileId: 1, rank: 2, durationMs: 2_030_000, avgWatts: 250, weightKg: 80, scoreBefore: 380 },
    ]);
    zwift.segments.mockImplementation(async (segmentId: string) => [
      { id: `${segmentId}-1`, athleteId: 1, segmentId, ts: start + 600_000, elapsed: 30, avgPower: 400, weightKg: 80 },
      { id: `${segmentId}-2`, athleteId: 2, segmentId, ts: start + 590_000, elapsed: 28, avgPower: 450, weightKg: 70 },
    ]);

    const data = await loadZwiftRaceData("6000001", { requireRider: 1, keepDetailsOf: new Set([1]) });

    expect(data?.eventType).toBe("RACE");
    // In het geheugen staat alles; bewaard wordt de kleine versie.
    expect(data?.subgroups[0].results.find((r) => r.profileId === 2)?.avgWatts).toBe(310);
    expect(db.saved).toHaveLength(1);
    const saved = db.saved[0].data as RaceData;
    expect(saved.subgroups[0].entrants.find((e) => e.zwiftId === "2")?.name).toBe("");
    // Van een onbekende ook de ZRS van vóór de race: die is nodig voor de verwachte volgorde.
    expect(saved.subgroups[0].results.find((r) => r.profileId === 2)).toEqual({ profileId: 2, rank: 1, durationMs: 2_000_000, scoreBefore: 420 });
    expect(saved.withScores).toBe(true);
    expect(saved.subgroups[0].results.find((r) => r.profileId === 1)?.avgWatts).toBe(250);
    expect(saved.passages.filter((p) => p.athleteId === 2).every((p) => p.avgPower === undefined)).toBe(true);
    expect(saved.passages.filter((p) => p.athleteId === 1).every((p) => p.avgPower === 400)).toBe(true);
  });
});
