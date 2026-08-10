import { describe, expect, it } from "vitest";
import { externalIntervalsEvents } from "@/app/(app)/zwbeter-worden/_data";
import type { IntervalsEvent } from "@/lib/intervals/client";
import type { WorkoutRow } from "@/app/(app)/zwbeter-worden/_components/types";

function event(id: string | number, extra: Partial<IntervalsEvent> = {}): IntervalsEvent {
  return { id, start_date_local: "2026-08-12T09:00:00", name: "Workout", ...extra };
}

function workout(extra: Partial<WorkoutRow> = {}): WorkoutRow {
  return {
    id: "w1",
    plan_id: "p1",
    profile_id: "lid",
    scheduled_at: "2026-08-12T09:00:00+01:00",
    title: "VO2 5x3",
    description: null,
    duration_minutes: 60,
    intensity: "vo2max",
    target_type: "power",
    structure_json: null,
    status: "planned",
    publish_status: "published",
    publish_error: null,
    intervals_event_id: null,
    intervals_external_id: null,
    origin: "ai",
    superseded_at: null,
    ...extra,
  };
}

describe("externalIntervalsEvents", () => {
  it("laat een event weg dat bij een gepubliceerde ZWB-workout hoort", () => {
    const events = [event("111"), event("222")];
    const workouts = [workout({ intervals_event_id: "111" })];
    expect(externalIntervalsEvents(events, workouts).map((row) => row.id)).toEqual(["222"]);
  });

  it("vergelijkt id's als tekst, ook als intervals.icu een getal teruggeeft", () => {
    const events = [event(111)];
    const workouts = [workout({ intervals_event_id: "111" })];
    expect(externalIntervalsEvents(events, workouts)).toEqual([]);
  });

  it("herkent ons eigen event ook aan de external_id als het id niet meer klopt", () => {
    const events = [event("999", { external_id: "zwb-p1-2026-08-12-vo2-5x3" })];
    const workouts = [
      workout({
        intervals_event_id: "111",
        intervals_external_id: "zwb-p1-2026-08-12-vo2-5x3",
      }),
    ];
    expect(externalIntervalsEvents(events, workouts)).toEqual([]);
  });

  it("toont een zwb-event waar geen actieve workout meer bij hoort", () => {
    // Een sessie die is vervangen maar in intervals.icu is blijven staan. Op
    // alleen de zwb-prefix filteren maakte die dag in ZWB helemaal leeg terwijl
    // er in intervals.icu gewoon een training stond.
    const events = [event("222", { external_id: "zwb-p1-2026-08-12-oude-sessie" })];
    const workouts = [
      workout({ intervals_event_id: "111", intervals_external_id: "zwb-p1-2026-08-12-nieuw" }),
    ];
    expect(externalIntervalsEvents(events, workouts).map((row) => row.id)).toEqual(["222"]);
  });

  it("houdt een rit die het lid buiten ZWB om plande gewoon staan", () => {
    const events = [event("333", { external_id: "garmin-abc", name: "Eigen intervaltraining" })];
    expect(externalIntervalsEvents(events, [workout()]).map((row) => row.name)).toEqual([
      "Eigen intervaltraining",
    ]);
  });

  it("laat alles staan als er nog geen ZWB-workouts zijn", () => {
    const events = [event("111"), event("222")];
    expect(externalIntervalsEvents(events, [])).toHaveLength(2);
  });
});
