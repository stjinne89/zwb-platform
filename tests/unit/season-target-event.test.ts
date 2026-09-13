import { beforeEach, describe, expect, it, vi } from "vitest";

// Melding 8 (plannenboek, 4 september 2026): een lid had de Marmotte via de
// signalering "zet als C-doel" op zijn jaarplan staan en kon er geen A-doel van
// maken. Opnieuw toevoegen met prioriteit A gaf "gelukt" zonder iets te doen.

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
const replans = vi.fn();

function fake() {
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let patch: Row | null = null;
    const run = () => {
      const matched = (tables[table] ?? []).filter((row) => filters.every((f) => f(row)));
      if (patch) for (const row of matched) Object.assign(row, patch);
      return matched;
    };
    const builder = {
      select: () => builder,
      update: (values: Row) => {
        patch = values;
        return builder;
      },
      insert: async (values: Row) => {
        (tables[table] ??= []).push({ id: `nieuw-${table}`, ...values });
        return { error: null };
      },
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: run(), error: null }).then(resolve),
    };
    return builder;
  }
  return { from };
}

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fake() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fake() }));
vi.mock("@/lib/auth/permissions", () => ({
  getCurrentUserAccess: async () => ({ user: { id: "lid" } }),
}));
vi.mock("@/lib/training/replan", () => ({
  requestReplan: async (...args: unknown[]) => replans(...args),
}));

const { createSeasonTarget } = await import("@/app/(app)/zwbeter-worden/jaarplan/_actions");

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("createSeasonTarget met een event", () => {
  beforeEach(() => {
    replans.mockClear();
    tables = {
      events: [{ id: "marmotte", title: "La Marmotte", start_at: "2027-07-04T05:00:00Z" }],
      training_season_targets: [
        { id: "t1", profile_id: "lid", event_id: "marmotte", priority: "c", title: "La Marmotte" },
        { id: "t2", profile_id: "ander", event_id: "marmotte", priority: "c", title: "La Marmotte" },
      ],
    };
  });

  it("maakt van een bestaand C-doel een A-doel in plaats van niets te doen", async () => {
    const result = await createSeasonTarget(form({ event_id: "marmotte", priority: "a" }));
    expect(result).toEqual({ ok: true });
    expect(tables.training_season_targets).toHaveLength(2);
    expect(tables.training_season_targets[0].priority).toBe("a");
    // De prioriteit van een ander lid blijft wat hij was.
    expect(tables.training_season_targets[1].priority).toBe("c");
    // En het schema krijgt de wijziging te zien.
    expect(replans).toHaveBeenCalledTimes(1);
  });

  it("neemt titel en datum van het event over bij een nieuw mikpunt", async () => {
    tables.training_season_targets = [];
    await createSeasonTarget(form({ event_id: "marmotte", priority: "a" }));
    expect(tables.training_season_targets).toEqual([
      expect.objectContaining({
        profile_id: "lid",
        event_id: "marmotte",
        title: "La Marmotte",
        target_date: "2027-07-04",
        priority: "a",
      }),
    ]);
  });

  it("weigert een event dat het lid niet kan zien", async () => {
    const result = await createSeasonTarget(form({ event_id: "geheim", priority: "a" }));
    expect(result).toEqual({ ok: false, error: "Event niet gevonden." });
  });
});
