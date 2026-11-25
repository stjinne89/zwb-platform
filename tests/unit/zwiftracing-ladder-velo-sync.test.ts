import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/club", () => ({ getClub: async () => ({ texts: { shortName: "Test" } }) }));

import { dueZwiftIds, ladderRiderZwiftIds, runLadderVeloSync } from "@/lib/zwiftracing/rider-sync";

// Een kleine nep-Supabase: genoeg filters voor rider-sync, met een log van de schrijfacties.
type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

function fakeAdmin(tables: Record<string, Row[]>) {
  const writes: Array<{ table: string; op: string; values: Row; where?: Row }> = [];
  const from = (table: string) => {
    const filters: Filter[] = [];
    let op: "select" | "update" = "select";
    let values: Row = {};
    const where: Row = {};
    let order: { col: string; asc: boolean } | null = null;
    let limit: number | null = null;
    const builder = {
      select: () => builder,
      eq: (col: string, value: unknown) => {
        where[col] = value;
        filters.push((row) => row[col] === value);
        return builder;
      },
      in: (col: string, list: unknown[]) => {
        filters.push((row) => list.includes(row[col]));
        return builder;
      },
      is: (col: string, value: unknown) => {
        filters.push((row) => (row[col] ?? null) === value);
        return builder;
      },
      not: (col: string, _op: string, value: unknown) => {
        filters.push((row) => (row[col] ?? null) !== value);
        return builder;
      },
      gt: (col: string, value: string) => {
        filters.push((row) => String(row[col] ?? "") > value);
        return builder;
      },
      lt: (col: string, value: string) => {
        filters.push((row) => row[col] != null && String(row[col]) < value);
        return builder;
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        order = { col, asc: opts?.ascending !== false };
        return builder;
      },
      limit: (n: number) => {
        limit = n;
        return builder;
      },
      update: (next: Row) => {
        op = "update";
        values = next;
        return builder;
      },
      upsert: async (row: Row) => {
        writes.push({ table, op: "upsert", values: row });
        return { error: null };
      },
      then: (resolve: (value: { data: Row[] | null; error: null }) => unknown) => {
        if (op === "update") {
          writes.push({ table, op: "update", values, where: { ...where } });
          return Promise.resolve(resolve({ data: null, error: null }));
        }
        let rows = (tables[table] ?? []).filter((row) => filters.every((f) => f(row)));
        if (order) {
          const { col, asc } = order;
          rows = [...rows].sort((a, b) => String(a[col]).localeCompare(String(b[col])) * (asc ? 1 : -1));
        }
        if (limit != null) rows = rows.slice(0, limit);
        return Promise.resolve(resolve({ data: rows, error: null }));
      },
    };
    return builder;
  };
  return { admin: { from } as never, writes };
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

// Verzonnen renners: twee ladderleden, één in de pool, één rosterrenner, één lid van een ander team.
const BASE: Record<string, Row[]> = {
  teams: [
    { id: "t-ladder", type: "ladder" },
    { id: "t-archief", type: "ladder" },
    { id: "t-zrl", type: "zrl" },
  ],
  team_members: [
    { team_id: "t-ladder", profile_id: "p1" },
    { team_id: "t-archief", profile_id: "p2" },
    { team_id: "t-zrl", profile_id: "p9" },
  ],
  ladder_pool: [{ profile_id: "p3" }, { profile_id: "p1" }],
  ladder_roster_riders: [{ roster_entry_id: "r1" }],
  profiles: [
    { id: "p1", zwift_id: "1001" },
    { id: "p2", zwift_id: " 1002 " },
    { id: "p3", zwift_id: "1003" },
    { id: "p9", zwift_id: "1009" },
  ],
  roster_entries: [{ id: "r1", zwift_id: "1004" }],
  events: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ladderRiderZwiftIds", () => {
  it("neemt ladderteams (ook archief), de pool en het rooster, zonder dubbelen", async () => {
    const { admin } = fakeAdmin(BASE);
    expect(await ladderRiderZwiftIds(admin)).toEqual([1001, 1002, 1003, 1004]);
  });

  it("slaat een Zwift-ID over dat geen getal is", async () => {
    const { admin } = fakeAdmin({ ...BASE, profiles: [...BASE.profiles.filter((p) => p.id !== "p3"), { id: "p3", zwift_id: "abc" }] });
    expect(await ladderRiderZwiftIds(admin)).toEqual([1001, 1002, 1004]);
  });
});

describe("dueZwiftIds", () => {
  it("haalt ladderrenners na 6 uur opnieuw op, niet eerder", async () => {
    const { admin } = fakeAdmin({
      ...BASE,
      zwift_rider_metrics: [
        { zwift_id: 1001, velo_fetched_at: hoursAgo(7) },
        { zwift_id: 1002, velo_fetched_at: hoursAgo(3) },
        { zwift_id: 1003, velo_fetched_at: hoursAgo(16) },
      ],
      zwift_legacy_velo: [],
    });
    // 1004 heeft nog geen rij en is dus ook aan de beurt; 1009 hoort niet bij de ladder.
    expect(await dueZwiftIds(admin)).toEqual([1001, 1003, 1004]);
  });
});

const riderPage = (id: number, max30: number) =>
  `<html><script>$R[0]={rider:$R[1]={riderId:${id},power:$R[2]={wkg15:12,wkg60:7},legacyRatings:$R[3]={live:${max30},max30:${max30},max90:${max30}}}};</script></html>`;

describe("runLadderVeloSync", () => {
  it("de oudste eerst, slaat wie net is opgehaald over en schrijft alleen vELO1", async () => {
    const { admin, writes } = fakeAdmin({
      ...BASE,
      zwift_legacy_velo: [
        { zwift_id: 1001, fetched_at: hoursAgo(16) },
        { zwift_id: 1002, fetched_at: hoursAgo(0.5) },
        { zwift_id: 1003, fetched_at: hoursAgo(30) },
        { zwift_id: 1004, fetched_at: hoursAgo(2) },
      ],
    });
    const asked: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      asked.push(url);
      const id = Number(/riders\/(\d+)/.exec(url)?.[1]);
      return new Response(riderPage(id, 1500 + id - 1000), { status: 200 });
    });

    const result = await runLadderVeloSync(admin, Date.now() + 60_000);

    expect(asked).toEqual([
      "https://zwiftracing.app/riders/1003",
      "https://zwiftracing.app/riders/1001",
      "https://zwiftracing.app/riders/1004",
    ]);
    expect(result).toMatchObject({ due: 3, fetched: 3, legacy: 3, remaining: 0, stopped: null });
    expect(new Set(writes.map((w) => w.table))).toEqual(new Set(["zwift_legacy_velo"]));
    expect(writes[0].values).toMatchObject({ zwift_id: 1003, velo_max30: 1503 });
  }, 10_000);

  it("een trage pagina stopt de run zonder melding; de rest blijft staan", async () => {
    const { admin, writes } = fakeAdmin({ ...BASE, zwift_legacy_velo: [] });
    vi.stubGlobal("fetch", async () => {
      throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    });

    const result = await runLadderVeloSync(admin, Date.now() + 60_000, 8_000);

    expect(result).toMatchObject({ due: 4, fetched: 0, remaining: 4, stopped: null });
    expect(writes).toEqual([]);
  });

  it("een 429 stopt de run met een reden", async () => {
    const { admin } = fakeAdmin({ ...BASE, zwift_legacy_velo: [] });
    vi.stubGlobal("fetch", async () => new Response("", { status: 429 }));

    expect(await runLadderVeloSync(admin, Date.now() + 60_000)).toMatchObject({ stopped: "status 429", remaining: 4 });
  });
});
