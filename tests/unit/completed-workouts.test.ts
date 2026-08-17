import { describe, expect, it } from "vitest";
import { recentCompleted } from "@/app/(app)/zwbeter-worden/_components/completed-workouts";
import type {
  WorkoutReportRow,
  WorkoutRow,
} from "@/app/(app)/zwbeter-worden/_components/types";

const TODAY = "2026-08-17";

function workout(overrides: Partial<WorkoutRow> & { id: string; scheduled_at: string }): WorkoutRow {
  return {
    plan_id: "p1",
    profile_id: "u1",
    title: `Workout ${overrides.id}`,
    description: null,
    duration_minutes: 60,
    intensity: "endurance",
    target_type: "power",
    structure_json: null,
    status: "completed",
    publish_status: "published",
    publish_error: null,
    intervals_event_id: null,
    intervals_external_id: null,
    origin: "plan",
    event_id: null,
    superseded_at: null,
    ...overrides,
  };
}

function report(overrides: Partial<WorkoutReportRow> & { workout_id: string }): WorkoutReportRow {
  return {
    id: `r-${overrides.workout_id}`,
    profile_id: "u1",
    athlete_rpe: null,
    athlete_feel: null,
    athlete_report: null,
    trainer_feedback: null,
    updated_at: `${TODAY}T10:00:00Z`,
    ...overrides,
  };
}

function reportMap(rows: WorkoutReportRow[]) {
  return new Map(rows.map((row) => [row.workout_id, row]));
}

describe("recentCompleted", () => {
  it("houdt alleen afgeronde trainingen binnen het venster over, nieuwste eerst", () => {
    const items = recentCompleted(
      [
        workout({ id: "oud", scheduled_at: "2026-08-09T09:00:00Z" }),
        workout({ id: "gisteren", scheduled_at: "2026-08-16T09:00:00Z" }),
        workout({ id: "vandaag", scheduled_at: `${TODAY}T09:00:00Z` }),
        workout({ id: "morgen", scheduled_at: "2026-08-18T09:00:00Z", status: "planned" }),
      ],
      undefined,
      TODAY,
    );
    expect(items.map((item) => item.workoutId)).toEqual(["vandaag", "gisteren"]);
  });

  it("laat een geplande rustdag weg, maar toont een afgeschreven training", () => {
    const items = recentCompleted(
      [
        workout({ id: "rust", scheduled_at: "2026-08-15T09:00:00Z", intensity: "rest" }),
        workout({ id: "afgeschreven", scheduled_at: "2026-08-15T09:00:00Z", status: "skipped" }),
      ],
      undefined,
      TODAY,
    );
    expect(items.map((item) => [item.workoutId, item.outcome])).toEqual([
      ["afgeschreven", "rustdag"],
    ]);
  });

  it("markeert een voorbije training zonder rit als gemist", () => {
    const items = recentCompleted(
      [workout({ id: "w1", scheduled_at: "2026-08-15T09:00:00Z", status: "planned" })],
      undefined,
      TODAY,
    );
    expect(items.map((item) => item.outcome)).toEqual(["gemist"]);
  });

  it("rekent de training van vandaag nog niet als gemist", () => {
    const items = recentCompleted(
      [workout({ id: "w1", scheduled_at: `${TODAY}T09:00:00Z`, status: "planned" })],
      undefined,
      TODAY,
    );
    expect(items).toEqual([]);
  });

  it("neemt een nog niet afgeronde training mee zodra het lid een RPE invulde", () => {
    const items = recentCompleted(
      [workout({ id: "w1", scheduled_at: "2026-08-15T09:00:00Z", status: "planned" })],
      reportMap([report({ workout_id: "w1", athlete_rpe: 7, athlete_feel: "zwaar" })]),
      TODAY,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ rpe: 7, feel: "zwaar", metrics: null });
  });

  it("zet de momentopname van gepland versus gereden erbij", () => {
    const items = recentCompleted(
      [workout({ id: "w1", scheduled_at: "2026-08-15T09:00:00Z" })],
      reportMap([
        report({
          workout_id: "w1",
          athlete_rpe: 8,
          metrics_json: { tss: 71, loadPct: 84, verdict: "volgens_plan" } as never,
        }),
      ]),
      TODAY,
    );
    expect(items[0].metrics).toMatchObject({ tss: 71, loadPct: 84 });
    expect(items[0].plannedMinutes).toBe(60);
  });
});
