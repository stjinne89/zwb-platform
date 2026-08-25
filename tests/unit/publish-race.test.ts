import { beforeEach, describe, expect, it, vi } from "vitest";

// Op 24 augustus 2026 publiceerden twee schema's tegelijk. Het nieuwste
// vervangde de workouts van het oudste terwijl dat nog naar intervals.icu stond
// te pushen, en die push schreef daarna gewoon een intervals_event_id terug op
// een al vervangen rij. Resultaat: 85 events in intervals.icu die geen enkele
// actieve workout meer kende, door de schemakalender getekend als tweede blok
// naast de training die ze had vervangen.
//
// Deze tests bewaken de twee grendels die dat tegenhouden.

const upsert = vi.fn(async () => ({ id: 4242 }));
const remove = vi.fn(async () => undefined);

vi.mock("@/lib/intervals/client", () => ({
  upsertIntervalsWorkoutEvent: (...args: unknown[]) => upsert(...(args as [])),
  deleteIntervalsWorkoutEvent: (...args: unknown[]) => remove(...(args as [])),
}));

const { pushPlanWorkoutsToIntervals } = await import("@/lib/training/publish");

type Row = Record<string, unknown>;

/**
 * Supabase-stub met net genoeg querytaal voor publish.ts: filters, updates die
 * de rij echt aanpassen, en `.select()` na een update die teruggeeft wat er
 * geraakt is. Dat laatste is hier de kern — daarop rust de grendel.
 */
function fakeAdmin(tables: Record<string, Row[]>) {
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let patch: Row | null = null;

    const run = () => {
      const matched = (tables[table] ?? []).filter((row) => filters.every((f) => f(row)));
      if (patch) for (const row of matched) Object.assign(row, patch);
      return matched.map((row) => ({ ...row }));
    };

    const builder = {
      select: () => builder,
      update: (values: Row) => {
        patch = values;
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push((row) => String(row[column] ?? "") === String(value));
        return builder;
      },
      neq: (column: string, value: unknown) => {
        filters.push((row) => String(row[column] ?? "") !== String(value));
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => (row[column] ?? null) === value);
        return builder;
      },
      gt: (column: string, value: string) => {
        filters.push((row) => String(row[column] ?? "") > value);
        return builder;
      },
      gte: (column: string, value: string) => {
        filters.push((row) => String(row[column] ?? "") >= value);
        return builder;
      },
      lte: (column: string, value: string) => {
        filters.push((row) => String(row[column] ?? "") <= value);
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => ({ data: run()[0] ?? null }),
      single: async () => ({ data: run()[0] ?? null }),
      then: (resolve: (value: { data: Row[] }) => unknown) =>
        Promise.resolve({ data: run() }).then(resolve),
    };
    return builder;
  }
  return { from } as never;
}

function scenario({ withSecond = false }: { withSecond?: boolean } = {}) {
  const workout: Row = {
    id: "w1",
    plan_id: "planA",
    profile_id: "p1",
    scheduled_at: "2026-08-25T09:00:00+02:00",
    title: "Herstelweek – rustige duur",
    description: null,
    duration_minutes: 90,
    intensity: "endurance",
    structure_json: [{ label: "Duur", durationMinutes: 90, target: "65%", intensity: "endurance" }],
    status: "planned",
    origin: "ai",
    test_type: null,
    superseded_at: null,
    publish_status: "pending",
    intervals_event_id: null,
    intervals_external_id: null,
  };

  const second: Row | null = withSecond
    ? {
        ...workout,
        id: "w2",
        scheduled_at: "2026-08-26T09:00:00+02:00",
        title: "Herstelweek – souplesse duur",
      }
    : null;

  const tables: Record<string, Row[]> = {
    training_workouts: second ? [workout, second] : [workout],
    training_plans: [
      {
        id: "planA",
        profile_id: "p1",
        created_at: "2026-08-24T20:44:37+00:00",
        adapt_from_date: null,
        end_date: "2026-09-30",
      },
    ],
    intervals_connections: [{ profile_id: "p1", api_key: "key", athlete_id: "i1" }],
    profiles: [{ id: "p1", ftp_watts: 250 }],
  };

  return { workout, second, admin: fakeAdmin(tables) };
}

beforeEach(() => {
  upsert.mockClear();
  remove.mockClear();
});

describe("pushPlanWorkoutsToIntervals en het vervangen tijdens de push", () => {
  it("plaatst een gewone workout en houdt het event vast", async () => {
    const { workout, admin } = scenario();

    const result = await pushPlanWorkoutsToIntervals(admin, "planA", "p1");

    expect(result).toMatchObject({ connected: true, pushed: 1, failed: 0, skipped: 0 });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(workout.intervals_event_id).toBe("4242");
    expect(workout.publish_status).toBe("published");
  });

  it("slaat verderop in de lus over wat intussen vervangen is", async () => {
    // Een schema van zestig trainingen staat een kwartier te pushen. Wordt het
    // halverwege vervangen, dan mag de rest van de lus geen events meer
    // aanmaken die daarna toch weer weg moeten.
    const { workout, admin, second } = scenario({ withSecond: true });
    upsert.mockImplementationOnce(async () => {
      second!.superseded_at = "2026-08-24T20:44:41+00:00";
      return { id: 4242 };
    });

    const result = await pushPlanWorkoutsToIntervals(admin, "planA", "p1");

    expect(result).toMatchObject({ pushed: 1, failed: 0, skipped: 1 });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(workout.intervals_event_id).toBe("4242");
    expect(second!.intervals_event_id).toBeNull();
  });

  it("haalt het event meteen weer weg als het vervangen tijdens de call gebeurt", async () => {
    const { workout, admin } = scenario();
    // Precies het gaatje van 24 augustus: bij de voorcontrole stond de rij nog
    // open, tijdens de HTTP-call vervangt een nieuwer schema hem alsnog.
    upsert.mockImplementationOnce(async () => {
      workout.superseded_at = "2026-08-24T20:44:41+00:00";
      return { id: 4242 };
    });

    const result = await pushPlanWorkoutsToIntervals(admin, "planA", "p1");

    expect(result).toMatchObject({ pushed: 0, failed: 0, skipped: 1 });
    expect(remove).toHaveBeenCalledWith("key", "i1", "4242");
    // De rij blijft van het nieuwere schema: geen event-id, niet 'published'.
    expect(workout.intervals_event_id).toBeNull();
    expect(workout.publish_status).not.toBe("published");
  });
});
