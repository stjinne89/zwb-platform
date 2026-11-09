import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Zwift: een kleine lijst met pagina's van twee, zodat de cursor echt telt.
type Activity = { id: string; startDate: string; race: boolean };
const zwift = vi.hoisted(() => ({
  activities: [] as Array<{ id: string; startDate: string; race: boolean }>,
  listCalls: [] as number[],
  detailCalls: [] as string[],
  goneDetails: new Set<string>(),
}));

vi.mock("@/lib/events/zwift-club", () => ({
  ACTIVITIES_PER_PAGE: 2,
  fetchRiderRacePage: async (_zwiftId: string, start: number) => {
    zwift.listCalls.push(start);
    const page = zwift.activities.slice(start, start + 2);
    return {
      count: page.length,
      races: page.filter((row) => row.race).map((row) => ({ activityId: row.id, startedAt: row.startDate })),
      startedAts: page.map((row) => row.startDate),
    };
  },
  fetchActivityEvent: async (activityId: string) => {
    zwift.detailCalls.push(activityId);
    if (zwift.goneDetails.has(activityId)) throw new Error("Zwift-API gaf status 404 voor het detail.");
    return { eventId: `5${activityId}`, eventName: `Race ${activityId}`, subgroupId: `9${activityId}` };
  },
  fetchRiderScoreChange: async () => null,
}));

import { refreshRiderRaces, ridersDueForRaces, RECHECK_MS } from "@/lib/racen/zwift-races";

// --- Een nep-Supabase met precies de bouwstenen die de racejob gebruikt. ---
type Row = Record<string, unknown>;

function fakeAdmin(tables: Record<string, Row[]>) {
  const keys: Record<string, string[]> = {
    zwift_race_scores: ["zwift_id", "activity_id"],
    zwift_race_score_sync: ["zwift_id"],
  };
  const same = (a: unknown, b: unknown) => String(a) === String(b);
  return {
    from(table: string) {
      const rows = (tables[table] ??= []);
      const filters: Array<(row: Row) => boolean> = [];
      const orders: Array<[string, boolean]> = [];
      let projection: string | null = null;
      let range: [number, number] | null = null;
      let action: { kind: "select" } | { kind: "update"; values: Row } | { kind: "upsert"; values: Row[]; ignore: boolean } = {
        kind: "select",
      };
      const matching = () => rows.filter((row) => filters.every((filter) => filter(row)));
      const project = (row: Row) =>
        projection ? Object.fromEntries(projection.split(",").map((part) => [part.trim(), row[part.trim()] ?? null])) : { ...row };
      const run = () => {
        if (action.kind === "update") {
          for (const row of matching()) Object.assign(row, structuredClone(action.values));
          return { data: null, error: null };
        }
        if (action.kind === "upsert") {
          const key = keys[table];
          for (const value of action.values) {
            const existing = rows.find((row) => key.every((column) => same(row[column], value[column])));
            if (existing && action.ignore) continue;
            if (existing) Object.assign(existing, structuredClone(value));
            else rows.push(structuredClone(value));
          }
          return { data: null, error: null };
        }
        let out = matching();
        for (const [column, ascending] of [...orders].reverse()) {
          out = [...out].sort((a, b) => {
            const x = String(a[column]);
            const y = String(b[column]);
            return (x < y ? -1 : x > y ? 1 : 0) * (ascending ? 1 : -1);
          });
        }
        if (range) out = out.slice(range[0], range[1] + 1);
        return { data: out.map(project), error: null };
      };
      const builder = {
        select(columns: string) {
          projection = columns;
          return builder;
        },
        update(values: Row) {
          action = { kind: "update", values };
          return builder;
        },
        upsert(values: Row | Row[], options: { ignoreDuplicates?: boolean } = {}) {
          action = { kind: "upsert", values: Array.isArray(values) ? values : [values], ignore: options.ignoreDuplicates === true };
          return builder;
        },
        eq(column: string, value: unknown) {
          filters.push((row) => same(row[column], value));
          return builder;
        },
        in(column: string, values: unknown[]) {
          filters.push((row) => values.some((value) => same(row[column], value)));
          return builder;
        },
        // Alleen `.not(kolom, "is", null)` komt voor.
        not(column: string) {
          filters.push((row) => row[column] != null);
          return builder;
        },
        order(column: string, options: { ascending?: boolean } = {}) {
          orders.push([column, options.ascending !== false]);
          return builder;
        },
        range(from: number, to: number) {
          range = [from, to];
          return builder;
        },
        async maybeSingle() {
          const { data } = run();
          return { data: (data as Row[])[0] ?? null, error: null };
        },
        then(resolve: (value: { data: unknown; error: null }) => unknown, reject?: (error: unknown) => unknown) {
          return Promise.resolve(run()).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

const NOW = Date.parse("2026-11-09T12:00:00Z"); // venster vanaf 12 juli
const ZWIFT_ID = "4235693";

/** Nieuw naar oud, zoals Zwift's lijst. */
const ACTIVITIES: Activity[] = [
  { id: "101", startDate: "2026-11-05T18:00:00Z", race: true },
  { id: "102", startDate: "2026-10-20T18:00:00Z", race: false },
  { id: "103", startDate: "2026-09-01T18:00:00Z", race: true },
  { id: "104", startDate: "2026-07-01T18:00:00Z", race: true }, // vóór het venster
  { id: "105", startDate: "2026-06-01T18:00:00Z", race: true },
  { id: "106", startDate: "2026-05-01T18:00:00Z", race: false },
];

function setup(sync: Row[] = []) {
  zwift.activities = structuredClone(ACTIVITIES);
  zwift.listCalls = [];
  zwift.detailCalls = [];
  zwift.goneDetails = new Set();
  const tables: Record<string, Row[]> = { zwift_race_scores: [], zwift_race_score_sync: sync };
  return { tables, admin: fakeAdmin(tables) as never };
}

const eventsOf = (tables: Record<string, Row[]>) =>
  Object.fromEntries(tables.zwift_race_scores.map((row) => [row.activity_id, row.zwift_event_id ?? null]));

describe("races per lid voor ZWBeter racen (0317)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("leest de lijst tot het venster binnen is en zoekt alleen daarin de events op", async () => {
    const { tables, admin } = setup();
    const result = await refreshRiderRaces(admin, ZWIFT_ID, { budgetMs: 60_000, now: NOW });
    expect(result).toEqual({ events: 2, done: true, stop: false });
    // Na de tweede pagina ligt de oudste activiteit vóór het venster: niet verder.
    expect(zwift.listCalls).toEqual([0, 2]);
    expect(zwift.detailCalls).toEqual(["101", "103"]);
    expect(eventsOf(tables)).toEqual({ "101": 5101, "103": 5103, "104": null });
    const sync = tables.zwift_race_score_sync[0];
    expect(sync).toMatchObject({ next_start: 4, listed_until: "2026-07-01T18:00:00Z", newest_at: "2026-11-05T18:00:00Z" });
    expect(sync.races_checked_at).toBeTruthy();
    const race = tables.zwift_race_scores.find((row) => row.activity_id === "101");
    expect(race).toMatchObject({ event_name: "Race 101" });
    // De ZRS-historie blijft er los van: niet als opgezocht gemarkeerd.
    expect(race?.looked_up_at).toBeUndefined();
  }, 20_000);

  it("kijkt de volgende keer alleen bovenaan en zoekt alleen de nieuwe race op", async () => {
    const { tables, admin } = setup();
    await refreshRiderRaces(admin, ZWIFT_ID, { budgetMs: 60_000, now: NOW });
    zwift.activities = [{ id: "107", startDate: "2026-11-08T18:00:00Z", race: true }, ...ACTIVITIES];
    zwift.listCalls = [];
    zwift.detailCalls = [];
    const result = await refreshRiderRaces(admin, ZWIFT_ID, { budgetMs: 60_000, now: NOW });
    expect(result).toEqual({ events: 1, done: true, stop: false });
    expect(zwift.listCalls).toEqual([0]);
    expect(zwift.detailCalls).toEqual(["107"]);
    // De cursor schuift mee met de nieuwe activiteit bovenaan.
    expect(tables.zwift_race_score_sync[0]).toMatchObject({ next_start: 5, newest_at: "2026-11-08T18:00:00Z" });
  }, 20_000);

  it("bewaart een activiteit zonder detail als opgezocht, zonder event", async () => {
    const { tables, admin } = setup();
    zwift.goneDetails.add("103");
    const result = await refreshRiderRaces(admin, ZWIFT_ID, { budgetMs: 60_000, now: NOW });
    expect(result.done).toBe(true);
    const race = tables.zwift_race_scores.find((row) => row.activity_id === "103");
    expect(race).toMatchObject({ zwift_event_id: null, event_name: null });
    expect(race?.event_looked_up_at).toBeTruthy();
  }, 20_000);

  it("gaat een lid met een eerder complete lijst niet opnieuw van voor af lezen", async () => {
    // De ZRS-historie las de hele lijst al: alleen bovenaan kijken.
    const { admin } = setup([
      {
        zwift_id: Number(ZWIFT_ID),
        next_start: 6,
        list_complete: true,
        refused: false,
        newest_at: "2026-11-05T18:00:00Z",
        settled_at: null,
        listed_until: null,
        races_checked_at: null,
      },
    ]);
    await refreshRiderRaces(admin, ZWIFT_ID, { budgetMs: 60_000, now: NOW });
    expect(zwift.listCalls).toEqual([0]);
  }, 20_000);

  it("stopt zonder budget en zet het lid dan niet als bijgewerkt", async () => {
    const { tables, admin } = setup();
    const result = await refreshRiderRaces(admin, ZWIFT_ID, { budgetMs: 1_000, now: NOW });
    expect(result).toEqual({ events: 0, done: false, stop: false });
    expect(tables.zwift_race_score_sync[0]?.races_checked_at ?? null).toBeNull();
  });

  it("neemt wie het langst wacht, en slaat geweigerde en net bijgewerkte leden over", async () => {
    const recent = new Date(NOW - RECHECK_MS / 2).toISOString();
    const old = new Date(NOW - RECHECK_MS * 2).toISOString();
    const tables: Record<string, Row[]> = {
      profiles: [{ zwift_id: "1" }, { zwift_id: "2" }, { zwift_id: "3" }, { zwift_id: "4" }, { zwift_id: null }, { zwift_id: "1" }],
      zwift_race_score_sync: [
        { zwift_id: 1, refused: false, races_checked_at: old },
        { zwift_id: 2, refused: true, races_checked_at: null },
        { zwift_id: 3, refused: false, races_checked_at: recent },
      ],
    };
    expect(await ridersDueForRaces(fakeAdmin(tables) as never, NOW)).toEqual(["4", "1"]);
  });
});
