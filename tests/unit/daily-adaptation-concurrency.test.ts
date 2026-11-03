import { beforeEach, describe, expect, it, vi } from "vitest";

// Melding 15 (plannenboek, 12 september 2026): "vandaag automatisch veel schema
// updates gekregen". De oorzaak van toen (een dagcheck die nooit iets vond) is in
// 1839204 opgelost. Wat daarna nog openstond: twee runs die elkaar overlappen
// zien allebei geen generatie en zetten er allebei een uit. Deze test draait twee
// runs echt tegelijk tegen een database-stub met de unieke index uit migratie
// 0153, en telt de betaalde OpenAI-starts. Er gaat geen echte generatie uit.

type Row = Record<string, unknown>;

const openAiStarts = vi.fn();

vi.mock("@/lib/training/ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/training/ai")>()),
  startTrainingPlanDraftBackground: async () => {
    openAiStarts();
    return { status: "queued", model: "mock", promptSummary: "{}", responseId: `resp-${openAiStarts.mock.calls.length}` };
  },
}));

// Beide runs wachten hier op elkaar: zo liggen hun dagchecks gegarandeerd vóór
// allebei hun inserts, zoals bij twee echt overlappende invocaties.
let arrived = 0;
let release: () => void = () => undefined;
const barrier = new Promise<void>((resolve) => {
  release = resolve;
});

vi.mock("@/lib/training/draft", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/training/draft")>()),
  buildRecentLoad: async () => {
    arrived += 1;
    if (arrived >= 2) release();
    await barrier;
    return null;
  },
  buildIntervalsLoad: async () => null,
  finishAiGeneration: async () => ({ ok: true, status: "queued" }),
  startPlanUpdate: async () => ({ ok: false, error: "niet in deze test" }),
}));

vi.mock("@/lib/training/adapt-context", () => ({
  buildYesterdayContext: async () => null,
  buildTodayRides: async () => [],
}));
vi.mock("@/lib/training/symptoms", () => ({ loadSymptomLoadForAi: async () => null }));
// De meting van vannacht en het uur van de run; per test in te stellen.
let wellnessNow: { readinessDate: string | null } | null = null;
let hourNow = 10;
vi.mock("@/lib/training/wellness", () => ({
  wellnessForAi: async () => wellnessNow,
  wellnessInputForAi: () => null,
}));
vi.mock("@/lib/greeting", () => ({ amsterdamHour: () => hourNow }));
vi.mock("@/lib/training/availability", () => ({
  availabilityForAi: async () => null,
  loadFixedWorkouts: async () => [],
  mondayKey: (key: string) => key,
}));
vi.mock("@/lib/training/replan", () => ({
  availabilityNeedsReplan: () => false,
  clearReplanPending: async () => undefined,
  loadPendingReplan: async () => null,
  planIsIgnored: async () => false,
}));

let tables: Record<string, Row[]>;

/** Genoeg querytaal voor de route, plus de unieke index uit 0153 op de insert. */
function fakeAdmin() {
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let patch: Row | null = null;
    let inserted: Row | null = null;
    let insertError: { code: string; message: string } | null = null;

    const rows = () => (tables[table] ??= []);
    const run = () => {
      if (inserted) return [inserted];
      const matched = rows().filter((row) => filters.every((f) => f(row)));
      if (patch) for (const row of matched) Object.assign(row, patch);
      return matched;
    };

    const builder = {
      select: () => builder,
      update: (values: Row) => {
        patch = values;
        return builder;
      },
      insert: (values: Row) => {
        const row: Row = { id: `${table}-${rows().length + 1}`, created_at: new Date().toISOString(), ...values };
        const clash =
          table === "training_ai_generations" &&
          row.adaptation_kind === "daily" &&
          rows().some(
            (other) =>
              other.adaptation_kind === "daily" &&
              other.parent_plan_id === row.parent_plan_id &&
              other.adapt_from_date === row.adapt_from_date,
          );
        if (clash) insertError = { code: "23505", message: "duplicate key value violates unique constraint" };
        else {
          rows().push(row);
          inserted = row;
        }
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        filters.push((row) => values.includes(row[column]));
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => (row[column] ?? null) === value);
        return builder;
      },
      gte: (column: string, value: string) => {
        filters.push((row) => String(row[column] ?? "") >= value);
        return builder;
      },
      lt: (column: string, value: string) => {
        filters.push((row) => String(row[column] ?? "") < value);
        return builder;
      },
      lte: () => builder,
      not: () => builder,
      or: () => builder,
      order: () => builder,
      limit: () => builder,
      single: async () => ({ data: run()[0] ?? null, error: insertError }),
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      then: (resolve: (value: unknown) => unknown) => {
        const data = run();
        return Promise.resolve({ data, error: insertError, count: data.length }).then(resolve);
      },
    };
    return builder;
  }
  return { from };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fakeAdmin() }));

const { POST } = await import("@/app/api/training/adaptations/daily/route");
const { amsterdamDayKey } = await import("@/lib/training/zwbeterworden");

function request() {
  return new Request("https://example.test/api/training/adaptations/daily", {
    method: "POST",
    headers: { authorization: "Bearer geheim" },
  });
}

describe("dagelijkse aanpassing bij overlappende runs", () => {
  beforeEach(() => {
    process.env.TRAINING_ADAPTATION_SECRET = "geheim";
    openAiStarts.mockClear();
    wellnessNow = null;
    hourNow = 10;
    tables = {
      training_plans: [
        {
          id: "plan-1",
          profile_id: "lid",
          trainer_id: null,
          goal_id: "doel",
          title: "Schema",
          end_date: "2099-01-01",
          root_plan_id: null,
          created_at: "2026-09-01T00:00:00Z",
          parent_plan_id: null,
          status: "published",
        },
      ],
      training_goals: [{ id: "doel", title: "Doel", goal_type: "base_fitness" }],
      profiles: [{ id: "lid", display_name: "Lid" }],
      strava_activities: [{ profile_id: "lid", start_date: "2099-01-01T00:00:00Z" }],
      training_adaptation_runs: [],
      training_ai_generations: [],
      training_workouts: [],
    };
  });

  it("zet voor hetzelfde schema maar één betaalde generatie uit", async () => {
    const responses = await Promise.all([POST(request()), POST(request())]);
    const bodies = await Promise.all(responses.map((response) => response.json()));

    expect(openAiStarts).toHaveBeenCalledTimes(1);
    expect(tables.training_ai_generations).toHaveLength(1);
    const statuses = bodies.flatMap((body) => body.results.map((result: { status: string }) => result.status));
    expect(statuses.sort()).toEqual(["already_started", "queued"]);
    // Een verloren race is geen mislukte run.
    expect(tables.training_adaptation_runs.filter((row) => row.status === "failed")).toHaveLength(0);
  });

  it("start dezelfde dag geen tweede keer na een afgeronde run", async () => {
    await POST(request());
    await POST(request());
    expect(openAiStarts).toHaveBeenCalledTimes(1);
  });
});

// Het dagvoorstel draaide tussen middernacht en zes uur, vóór het horloge de nacht
// had gesynchroniseerd: van 41 voorstellen met wellness hadden er 2 de meting
// van die dag (2026-11-03). Nu wacht het tot de meting er is, uiterlijk tot negen.
describe("dagvoorstel wacht op de meting van vannacht", () => {
  const today = amsterdamDayKey();
  const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

  beforeEach(() => {
    process.env.TRAINING_ADAPTATION_SECRET = "geheim";
    openAiStarts.mockClear();
    tables = {
      training_plans: [
        {
          id: "plan-1",
          profile_id: "lid",
          trainer_id: null,
          goal_id: "doel",
          title: "Schema",
          end_date: "2099-01-01",
          root_plan_id: null,
          created_at: "2026-09-01T00:00:00Z",
          parent_plan_id: null,
          status: "published",
        },
      ],
      training_goals: [{ id: "doel", title: "Doel", goal_type: "base_fitness" }],
      profiles: [{ id: "lid", display_name: "Lid" }],
      strava_activities: [{ profile_id: "lid", start_date: "2099-01-01T00:00:00Z" }],
      training_adaptation_runs: [],
      training_ai_generations: [],
      training_workouts: [],
    };
  });

  it("wacht om zes uur als alleen de meting van gisteren er is", async () => {
    hourNow = 6;
    wellnessNow = { readinessDate: yesterday };
    const body = await (await POST(request())).json();
    expect(openAiStarts).not.toHaveBeenCalled();
    expect(body.results.map((r: { status: string }) => r.status)).toEqual(["waiting_readiness"]);
    // Wachten bezet de dagcheck niet: het volgende uur probeert hij het weer.
    expect(tables.training_adaptation_runs).toHaveLength(0);
  });

  it("gaat meteen zodra de meting van vannacht binnen is", async () => {
    hourNow = 6;
    wellnessNow = { readinessDate: today };
    await POST(request());
    expect(openAiStarts).toHaveBeenCalledTimes(1);
  });

  it("gaat om negen uur door, ook zonder meting van vannacht", async () => {
    hourNow = 9;
    wellnessNow = { readinessDate: yesterday };
    await POST(request());
    expect(openAiStarts).toHaveBeenCalledTimes(1);
  });

  it("wacht nergens op bij een lid zonder readiness", async () => {
    hourNow = 3;
    wellnessNow = null;
    await POST(request());
    expect(openAiStarts).toHaveBeenCalledTimes(1);
  });
});
