import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Zwift: een kleine lijst met pagina's van twee, zodat de cursor echt telt.
type Activity = { id: string; startDate: string; race: boolean };
const zwift = vi.hoisted(() => ({
  activities: [] as Array<{ id: string; startDate: string; race: boolean }>,
  scores: new Map<string, { before: number | null; after: number | null } | null>(),
  listCalls: [] as number[],
  failListAt: null as number | null,
}));

vi.mock("@/lib/events/zwift-club", () => ({
  ACTIVITIES_PER_PAGE: 2,
  fetchRiderRacePage: async (_zwiftId: string, start: number) => {
    zwift.listCalls.push(start);
    if (zwift.failListAt != null && zwift.listCalls.length === zwift.failListAt) {
      throw new Error("Zwift-API gaf status 429 voor de lijst.");
    }
    const page = zwift.activities.slice(start, start + 2);
    return {
      count: page.length,
      races: page.filter((row) => row.race).map((row) => ({ activityId: row.id, startedAt: row.startDate })),
      startedAts: page.map((row) => row.startDate),
    };
  },
  fetchActivitySubgroup: async (activityId: string) => `9${activityId}`,
  fetchRiderScoreChange: async (subgroup: string) => zwift.scores.get(subgroup.slice(1)) ?? null,
}));

import { fillZrsHistory, membersWithZrsWork } from "@/lib/briljant/zrs-history";
import { SCALE_VERSION } from "@/lib/briljant/norms";

// --- Een nep-Supabase met precies de bouwstenen die zrs-history gebruikt. ---
type Row = Record<string, unknown>;
const pick = (row: Row, path: string): unknown => {
  const [column, key] = path.split("->>");
  const value = row[column];
  return key ? ((value ?? {}) as Row)[key] ?? null : value;
};

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
      const project = (row: Row) => {
        if (!projection) return { ...row };
        return Object.fromEntries(
          projection.split(",").map((part) => {
            const [alias, path] = part.trim().includes(":") ? part.trim().split(":") : [part.trim(), part.trim()];
            return [alias, pick(row, path)];
          }),
        );
      };
      const run = () => {
        if (action.kind === "update") {
          for (const row of matching()) Object.assign(row, structuredClone(action.values));
          return { data: null, error: null };
        }
        if (action.kind === "upsert") {
          const key = keys[table] ?? ["profile_id", "week"];
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
            const x = String(pick(a, column));
            const y = String(pick(b, column));
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
          filters.push((row) => same(pick(row, column), value));
          return builder;
        },
        in(column: string, values: unknown[]) {
          filters.push((row) => values.some((value) => same(pick(row, column), value)));
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

const SPAN = "test-span";
const PROFILE = "p1";
const ZWIFT_ID = "4235693";

const terugblik = (week: string, racen?: "historie" | "geen", level = 4.27): Row => ({
  profile_id: PROFILE,
  week,
  source: "terugblik",
  score: 3,
  facets: { racen: level, drempel: 3 },
  consistency: 0.5,
  provenance: { scale: SCALE_VERSION, terugblik: SPAN, ...(racen ? { racen } : {}) },
});

/** Nieuw naar oud, zoals Zwift's lijst. */
const ACTIVITIES: Activity[] = [
  { id: "101", startDate: "2026-10-20T18:00:00Z", race: false },
  { id: "102", startDate: "2026-10-05T18:00:00Z", race: true }, // 410 → 427
  { id: "103", startDate: "2026-09-29T18:00:00Z", race: false },
  { id: "104", startDate: "2026-09-20T18:00:00Z", race: true }, // 309 → 330
  { id: "105", startDate: "2026-08-10T18:00:00Z", race: true }, // geen score
  { id: "106", startDate: "2026-07-15T18:00:00Z", race: false },
  { id: "107", startDate: "2026-06-10T18:00:00Z", race: true }, // 300 → 309
  { id: "108", startDate: "2026-05-01T18:00:00Z", race: false },
];

function setup() {
  zwift.activities = structuredClone(ACTIVITIES);
  zwift.scores = new Map([
    ["102", { before: 410, after: 427 }],
    ["104", { before: 309, after: 330 }],
    ["105", null],
    ["107", { before: 300, after: 309 }],
  ]);
  zwift.listCalls = [];
  zwift.failListAt = null;
  const tables: Record<string, Row[]> = {
    profiles: [{ id: PROFILE, zwift_id: ZWIFT_ID }],
    zwbriljant_snapshots: [
      terugblik("2026-09-28"),
      // Een vondst van vóór 0271 die niet klopt: wordt rechtgezet.
      terugblik("2026-08-31", "historie", 9.99),
      terugblik("2026-06-29"),
      // Vóór de eerste race: de score vóór de eerste race erna.
      terugblik("2026-04-27"),
    ],
    zwift_race_scores: [],
    zwift_race_score_sync: [],
  };
  return { tables, admin: fakeAdmin(tables) as never };
}

const racen = (tables: Record<string, Row[]>) =>
  Object.fromEntries(
    tables.zwbriljant_snapshots.map((row) => [
      row.week,
      [(row.facets as Row).racen, (row.provenance as Row).racen ?? null],
    ]),
  );

describe("ZRS van vroeger (0271)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("vult alle maanden in en bewaart de races en de cursor", async () => {
    const { tables, admin } = setup();
    const result = await fillZrsHistory(admin, PROFILE, SPAN, { budgetMs: 60_000 });
    expect(result).toEqual({ months: 4, stop: false });
    expect(racen(tables)).toEqual({
      "2026-09-28": [3.3, "historie"],
      "2026-08-31": [3.09, "historie"],
      "2026-06-29": [3.09, "historie"],
      "2026-04-27": [3, "historie"],
    });
    expect(tables.zwift_race_scores).toHaveLength(4);
    const sync = tables.zwift_race_score_sync[0];
    expect(sync).toMatchObject({ next_start: 8, list_complete: true, refused: false, newest_at: "2026-10-20T18:00:00Z" });
    expect(sync.settled_at).toBeTruthy();
    // De lijst één keer van voor naar achter, plus de lege pagina aan het eind.
    expect(zwift.listCalls).toEqual([0, 2, 4, 6, 8]);
  }, 20_000);

  it("gaat na een 429 verder waar hij stopte, zonder opnieuw te lezen", async () => {
    const { tables, admin } = setup();
    zwift.failListAt = 3;
    const first = await fillZrsHistory(admin, PROFILE, SPAN, { budgetMs: 60_000 });
    expect(first.stop).toBe(true);
    expect(tables.zwift_race_score_sync[0]).toMatchObject({ next_start: 4, list_complete: false });

    zwift.failListAt = null;
    zwift.listCalls = [];
    const second = await fillZrsHistory(admin, PROFILE, SPAN, { budgetMs: 60_000 });
    expect(second.stop).toBe(false);
    // Eerst bovenaan kijken of er iets nieuws is (niets), dan verder vanaf 4.
    expect(zwift.listCalls).toEqual([0, 4, 6, 8]);
    expect(racen(tables)["2026-04-27"]).toEqual([3, "historie"]);
  }, 20_000);

  it("schuift de cursor mee met nieuwe activiteiten bovenaan", async () => {
    const { tables, admin } = setup();
    zwift.failListAt = 2; // na de eerste pagina stoppen
    await fillZrsHistory(admin, PROFILE, SPAN, { budgetMs: 60_000 });
    expect(tables.zwift_race_score_sync[0]).toMatchObject({ next_start: 2 });

    // Drie nieuwe activiteiten, waarvan één race; de rest schuift drie plekken op.
    zwift.activities = [
      { id: "111", startDate: "2026-10-23T07:00:00Z", race: false },
      { id: "110", startDate: "2026-10-22T18:00:00Z", race: true },
      { id: "109", startDate: "2026-10-21T18:00:00Z", race: false },
      ...ACTIVITIES,
    ];
    zwift.scores.set("110", { before: 427, after: 440 });
    zwift.failListAt = null;
    zwift.listCalls = [];
    const result = await fillZrsHistory(admin, PROFILE, SPAN, { budgetMs: 60_000 });
    expect(result.stop).toBe(false);
    // Bovenaan twee pagina's (drie nieuw), dan verder bij 2 + 3 = 5: geen gat.
    expect(zwift.listCalls).toEqual([0, 2, 5, 7, 9, 11]);
    expect(tables.zwift_race_score_sync[0]).toMatchObject({ newest_at: "2026-10-23T07:00:00Z", list_complete: true });
    expect(tables.zwift_race_scores.map((row) => row.activity_id).sort()).toEqual(["102", "104", "105", "107", "110"]);
    expect(racen(tables)["2026-09-28"]).toEqual([3.3, "historie"]);
  }, 20_000);

  it("geeft zonder score 'geen' en laat de actuele ZRS staan", async () => {
    const { tables, admin } = setup();
    zwift.scores = new Map();
    await fillZrsHistory(admin, PROFILE, SPAN, { budgetMs: 60_000 });
    expect(racen(tables)).toEqual({
      "2026-09-28": [4.27, "geen"],
      // Een eerdere vondst gaat niet terug naar "geen".
      "2026-08-31": [9.99, "historie"],
      "2026-06-29": [4.27, "geen"],
      "2026-04-27": [4.27, "geen"],
    });
  }, 20_000);

  it("neemt eerst leden met open maanden, dan wie het langst niet aan de beurt was", async () => {
    const tables: Record<string, Row[]> = {
      profiles: [
        { id: "a", zwift_id: "1" },
        { id: "b", zwift_id: "2" },
        { id: "c", zwift_id: "3" },
        { id: "d", zwift_id: "4" },
      ],
      zwbriljant_snapshots: [
        { ...terugblik("2026-09-28", "historie"), profile_id: "a" },
        { ...terugblik("2026-09-28"), profile_id: "b" },
        { ...terugblik("2026-09-28", "historie"), profile_id: "c" },
        { ...terugblik("2026-09-28", "geen"), profile_id: "d" },
      ],
      zwift_race_score_sync: [
        { zwift_id: 1, settled_at: null, attempted_at: "2026-10-23T09:00:00Z" },
        { zwift_id: 3, settled_at: null, attempted_at: null },
        { zwift_id: 4, settled_at: "2026-10-23T08:00:00Z", attempted_at: "2026-10-23T08:00:00Z" },
      ],
    };
    expect(await membersWithZrsWork(fakeAdmin(tables) as never, SPAN)).toEqual(["b", "c", "a"]);
  });
});
