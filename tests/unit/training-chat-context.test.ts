import { beforeEach, describe, expect, it, vi } from "vitest";

// De context die de coach meekrijgt, en de tekst die daarvan naar OpenAI gaat.
// Twee dingen moeten hier vastliggen: de onderbouwing (de "Let op"-regels en de
// invoer waarop het schema is gemaakt) komt mee, en wat er niet heen mag — de
// naam van het lid, en hersteldata van wie die niet deelt — blijft weg.

type Row = Record<string, unknown>;

let tables: Record<string, Row[]>;

function fakeAdmin() {
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    const rows = () => tables[table] ?? [];
    const run = () => rows().filter((row) => filters.every((f) => f(row)));
    const builder = {
      select: () => builder,
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
      lte: (column: string, value: string) => {
        filters.push((row) => String(row[column] ?? "") <= value);
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: run(), error: null }).then(resolve),
    };
    return builder;
  }
  return { from };
}

// Loaders die hun eigen queries doen; hier niet in beeld.
vi.mock("@/lib/training/availability", () => ({ availabilityForAi: async () => null }));
vi.mock("@/lib/training/season-data", () => ({ seasonPlanForAi: async () => null }));
vi.mock("@/lib/training/compliance", () => ({
  buildComplianceContext: async () => ({
    workouts: [],
    summary: { planned: 6, ridden: 4, missed: 2, tooLight: 1, tooHard: 0, onPlan: 3, avgLoadPct: 92 },
  }),
}));
vi.mock("@/lib/training/wellness", () => ({
  getWellnessSummary: async () => ({ state: "normal", restingHr: 48 }),
}));

const { buildCoachChatContext } = await import("@/lib/training/chat-context");
const { buildCoachUserText, CHAT_HISTORY_LIMIT, replanResultMessage, shapeChatMessage } =
  await import("@/lib/training/coach-chat");

const LID = "lid-1";

function seed({ wellnessOptIn = false }: { wellnessOptIn?: boolean } = {}) {
  tables = {
    training_plans: [
      {
        id: "plan-1",
        profile_id: LID,
        parent_plan_id: null,
        title: "Opbouw najaar",
        status: "published",
        start_date: "2026-09-01",
        end_date: "2099-01-01",
        updated_at: "2026-09-10T00:00:00Z",
        ai_generation_id: "gen-1",
        summary:
          "Rustige opbouw naar de ZRL.\n\nLet op: je beschikbaarheid op woensdag is 60 minuten, daarom staat er geen lange duurrit.\n\nLet op: de eerste week blijft onder je gemiddelde omdat je twee weken niet reed.",
      },
    ],
    training_workouts: [
      {
        id: "w-1",
        plan_id: "plan-1",
        profile_id: LID,
        superseded_at: null,
        scheduled_at: "2099-01-01T09:00:00Z",
        title: "Tempo 3x10",
        duration_minutes: 90,
        intensity: "tempo",
        status: "planned",
        structure_json: [],
      },
    ],
    training_goals: [
      {
        profile_id: LID,
        status: "active",
        title: "ZRL winter",
        goal_type: "zrl",
        target_date: "2026-12-01",
        max_hours_per_week: 6,
        experience_level: "intermediate",
        desired_intensity: "balanced",
        risk_notes: null,
      },
    ],
    training_ai_generations: [
      {
        id: "gen-1",
        prompt_summary: JSON.stringify({
          athleteName: "Jan de Vries",
          profile: { ftpWatts: 250 },
          intervalsLoad: { ctl: 44, tsb: -5 },
        }),
      },
    ],
    intervals_connections: [{ profile_id: LID, wellness_opt_in: wellnessOptIn }],
  };
}

describe("coachcontext", () => {
  beforeEach(() => seed());

  it("neemt de Let op-regels mee als losse onderbouwing", async () => {
    const context = await buildCoachChatContext(fakeAdmin() as never, LID);
    expect(context.schema?.letOp).toEqual([
      "je beschikbaarheid op woensdag is 60 minuten, daarom staat er geen lange duurrit.",
      "de eerste week blijft onder je gemiddelde omdat je twee weken niet reed.",
    ]);
    // De omschrijving blijft over zonder die regels.
    expect(context.schema?.omschrijving).toBe("Rustige opbouw naar de ZRL.");
  });

  it("stuurt de generatie-invoer mee, maar zonder de naam van het lid", async () => {
    const context = await buildCoachChatContext(fakeAdmin() as never, LID);
    const invoer = context.generatieInvoer as Record<string, unknown>;
    expect(invoer.intervalsLoad).toEqual({ ctl: 44, tsb: -5 });
    expect(invoer).not.toHaveProperty("athleteName");
    expect(JSON.stringify(context)).not.toContain("Jan de Vries");
  });

  it("laat hersteldata weg als het lid die niet deelt", async () => {
    const context = await buildCoachChatContext(fakeAdmin() as never, LID);
    expect(context.herstel).toBeNull();
  });

  it("neemt hersteldata wél mee bij opt-in", async () => {
    seed({ wellnessOptIn: true });
    const context = await buildCoachChatContext(fakeAdmin() as never, LID);
    expect(context.herstel).toEqual({ state: "normal", restingHr: 48 });
  });

  it("vat de naleving samen", async () => {
    const context = await buildCoachChatContext(fakeAdmin() as never, LID);
    expect(context.naleving).toMatchObject({ gepland: 6, gereden: 4, gemiddeldeBelastingPct: 92 });
  });
});

describe("berichttekst naar het model", () => {
  it("kapt de geschiedenis af en zet de vraag onderaan", () => {
    const history = Array.from({ length: CHAT_HISTORY_LIMIT + 5 }, (_, index) => ({
      role: "member" as const,
      body: `bericht ${index}`,
      created_at: "2026-09-16T10:00:00Z",
    }));
    const text = buildCoachUserText({ vandaag: "2026-09-16" }, history, "Waarom 90 minuten?");

    expect(text).not.toContain("bericht 0");
    expect(text).toContain(`bericht ${CHAT_HISTORY_LIMIT + 4}`);
    expect(text.trimEnd().endsWith("Waarom 90 minuten?")).toBe(true);
  });
});

describe("uitkomst van 'dit raakt mijn schema'", () => {
  it("vertelt per uitkomst wat er werkelijk gebeurde", () => {
    expect(replanResultMessage("started")).toBe("Je schema wordt herzien.");
    expect(replanResultMessage("cooldown")).toBe("Meegenomen bij de eerstvolgende herziening.");
    expect(replanResultMessage("no_plan")).toContain("nog geen lopend schema");
    expect(replanResultMessage("ignored")).toContain("ligt stil");
    expect(replanResultMessage("failed")).toContain("kon niet starten");
    expect(replanResultMessage(null)).toContain("kon niet starten");
  });

  it("zet de regel alleen bij een bericht dat het schema raakt", () => {
    const base = {
      id: "m1",
      author_id: "lid-1",
      role: "member" as const,
      body: "Ik was ziek",
      status: "sent" as const,
      created_at: "2026-09-16T10:00:00Z",
      profiles: { display_name: "Jan" },
    };
    expect(shapeChatMessage({ ...base, affects_plan: true, replan_result: "started" }).planNote).toBe(
      "Je schema wordt herzien.",
    );
    expect(shapeChatMessage({ ...base, affects_plan: false, replan_result: null }).planNote).toBeNull();
  });

  it("noemt een AI-antwoord Coach, ook zonder profiel", () => {
    const view = shapeChatMessage({
      id: "m2",
      author_id: null,
      role: "coach",
      body: "Omdat...",
      status: "sent",
      affects_plan: false,
      replan_result: null,
      created_at: "2026-09-16T10:01:00Z",
      profiles: null,
    });
    expect(view.name).toBe("Coach");
    expect(view.authorId).toBeNull();
  });
});
