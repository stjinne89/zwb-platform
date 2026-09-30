import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import feed from "../fixtures/src/events-feed.json";
import { groupSrcFeed, type SrcFeedRow } from "@/lib/src/feed";
import { importSrcSundays } from "@/lib/src/import";
import { syncSrcCalendar } from "@/lib/src/sync";

type Row = Record<string, unknown>;

/**
 * Supabase-stub met net genoeg querytaal voor de SRC-import: filters, insert
 * met teruggave, update en upsert op één sleutelkolom.
 */
function fakeAdmin(tables: Record<string, Row[]>) {
  let nextId = 1;
  function from(table: string) {
    const rows = (tables[table] ??= []);
    const filters: Array<(row: Row) => boolean> = [];
    let action: "select" | "insert" | "update" | "upsert" = "select";
    let payload: Row = {};
    let conflict = "id";

    const run = () => {
      if (action === "insert") {
        const row = { id: `e${nextId++}`, ...payload };
        rows.push(row);
        return [{ ...row }];
      }
      if (action === "upsert") {
        const known = rows.find((row) => row[conflict] === payload[conflict]);
        if (known) Object.assign(known, payload);
        else rows.push({ ...payload });
        return [];
      }
      const matched = rows.filter((row) => filters.every((f) => f(row)));
      if (action === "update") for (const row of matched) Object.assign(row, payload);
      return matched.map((row) => ({ ...row }));
    };
    const result = () => ({ data: run(), error: null });

    const builder = {
      select: () => builder,
      insert: (values: Row) => {
        action = "insert";
        payload = values;
        return builder;
      },
      update: (values: Row) => {
        action = "update";
        payload = values;
        return builder;
      },
      upsert: (values: Row, options?: { onConflict?: string }) => {
        action = "upsert";
        payload = values;
        conflict = options?.onConflict ?? "id";
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => (row[column] ?? null) === value);
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        filters.push((row) => values.includes(row[column]));
        return builder;
      },
      single: async () => ({ data: run()[0] ?? null, error: null }),
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => resolve(result()),
    };
    return builder;
  }
  return { from } as unknown as SupabaseClient;
}

const rows = feed.data as SrcFeedRow[];

describe("importSrcSundays", () => {
  it("maakt één zondag met twee races, en maakt bij herhalen niets dubbel", async () => {
    const tables: Record<string, Row[]> = { events: [], src_races: [] };
    const admin = fakeAdmin(tables);
    const { sundays } = groupSrcFeed(rows);

    const first = await importSrcSundays(admin, sundays, "beheerder");
    expect(first).toEqual({ sundaysCreated: 1, racesCreated: 2, updated: 0 });

    const parent = tables.events.find((row) => row.src_sunday === "2026-10-04")!;
    expect(parent).toMatchObject({
      type: "src",
      title: "SRC oktober · Kwalificatie 1",
      start_at: "2026-10-04T07:25:00.000Z",
      created_by: "beheerder",
    });
    const children = tables.events.filter((row) => row.parent_event_id === parent.id);
    expect(children.map((row) => row.title).sort()).toEqual([
      "SRC oktober · Kwalificatie 1 · Dames",
      "SRC oktober · Kwalificatie 1 · Heren",
    ]);
    expect(tables.src_races).toHaveLength(2);
    expect(tables.src_races.find((row) => row.gender === "men")).toMatchObject({
      registration_closes_at: "2026-10-01T03:00:00.000Z",
      pre_weight_categories: [1, 2],
      round: 1,
    });

    const again = await importSrcSundays(admin, sundays, "beheerder");
    expect(again).toEqual({ sundaysCreated: 0, racesCreated: 0, updated: 0 });
    expect(tables.events).toHaveLength(3);
    expect(tables.src_races).toHaveLength(2);
  });

  it("werkt een verschoven starttijd bij en laat een hernoemde titel staan", async () => {
    const tables: Record<string, Row[]> = { events: [], src_races: [] };
    const admin = fakeAdmin(tables);
    await importSrcSundays(admin, groupSrcFeed(rows).sundays, "beheerder");
    const women = tables.src_races.find((row) => row.gender === "women")!;
    const womenEvent = tables.events.find((row) => row.id === women.event_id)!;
    womenEvent.title = "SRC-dames met de hele club";

    const shifted = rows.map((row) =>
      row.name?.includes("Women") ? { ...row, time: "11:30 AM", categories: null } : row,
    );
    const result = await importSrcSundays(admin, groupSrcFeed(shifted).sundays, "beheerder");

    expect(result.updated).toBe(2); // de race en de zondag erboven
    expect(womenEvent.start_at).toBe("2026-10-04T07:30:00.000Z");
    expect(womenEvent.title).toBe("SRC-dames met de hele club");
    const parent = tables.events.find((row) => row.src_sunday === "2026-10-04")!;
    expect(parent.start_at).toBe("2026-10-04T07:30:00.000Z");
  });
});

describe("syncSrcCalendar", () => {
  it("weigert zonder maker en onthoudt de beheerder voor de cron", async () => {
    const tables: Record<string, Row[]> = { events: [], src_races: [], src_sync_state: [] };
    const admin = fakeAdmin(tables);

    const cron = await syncSrcCalendar(admin, { rows });
    expect(cron.error).toMatch(/beheer\/src/);
    expect(tables.events).toHaveLength(0);

    const manual = await syncSrcCalendar(admin, { rows, createdBy: "beheerder" });
    expect(manual).toMatchObject({ error: null, racesInFeed: 2, racesCreated: 2 });

    const later = await syncSrcCalendar(admin, { rows });
    expect(later.error).toBeNull();
    expect(tables.src_sync_state[0]).toMatchObject({
      created_by: "beheerder",
      sync_error: null,
      races_in_feed: 2,
    });
  });
});
