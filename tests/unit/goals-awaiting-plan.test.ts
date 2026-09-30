import { describe, expect, it } from "vitest";
import { goalsAwaitingPlan, pickGoalsAwaitingPlan } from "@/lib/training/goals-awaiting-plan";
import { fakeDb } from "./fake-db";

const today = "2026-09-30";

describe("pickGoalsAwaitingPlan", () => {
  it("houdt actieve doelen zonder schema over, per renner", () => {
    const result = pickGoalsAwaitingPlan(
      [
        { id: "g1", profile_id: "a", status: "active", target_date: "2026-11-01" },
        { id: "g2", profile_id: "a", status: "active", target_date: null },
        { id: "g3", profile_id: "b", status: "active", target_date: "2026-10-05" },
      ],
      new Set(["g3"]),
      today,
    );
    expect(result.get("a")).toEqual(["g1", "g2"]);
    expect(result.has("b")).toBe(false);
  });

  it("slaat verlopen en niet-actieve doelen over; vandaag telt nog mee", () => {
    const result = pickGoalsAwaitingPlan(
      [
        { id: "old", profile_id: "a", status: "active", target_date: "2026-09-29" },
        { id: "done", profile_id: "a", status: "completed", target_date: null },
        { id: "now", profile_id: "a", status: "active", target_date: "2026-09-30" },
      ],
      new Set(),
      today,
    );
    expect(result.get("a")).toEqual(["now"]);
  });
});

describe("goalsAwaitingPlan", () => {
  it("telt een doel met schema of lopende generatie niet, een mislukte wel", async () => {
    const db = fakeDb({
      training_goals: [
        { id: "met-schema", profile_id: "a", status: "active", target_date: null },
        { id: "loopt", profile_id: "a", status: "active", target_date: null },
        { id: "mislukt", profile_id: "a", status: "active", target_date: null },
        { id: "nieuw", profile_id: "a", status: "active", target_date: null },
        { id: "ander-lid", profile_id: "x", status: "active", target_date: null },
      ],
      training_plans: [
        { id: "p1", profile_id: "a", goal_id: "met-schema" },
        { id: "p2", profile_id: "a", goal_id: null },
      ],
      training_ai_generations: [
        { id: "r1", profile_id: "a", goal_id: "loopt", status: "in_progress" },
        { id: "r2", profile_id: "a", goal_id: "mislukt", status: "failed" },
      ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await goalsAwaitingPlan(db as any, ["a"], today);
    expect(result.get("a")).toEqual(["mislukt", "nieuw"]);
    expect(result.has("x")).toBe(false);
  });

  it("doet niets zonder renners", async () => {
    const db = fakeDb({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((await goalsAwaitingPlan(db as any, [], today)).size).toBe(0);
  });
});
