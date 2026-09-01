import { describe, expect, it } from "vitest";
import { adoptSharedPlan, sharedPlanView } from "@/lib/pacing/share";
import type { PlanSegment } from "@/lib/pacing/plan";
import type { PlanSummary, StoredPlan } from "@/lib/pacing/store";

const SEGMENTS: PlanSegment[] = [
  { startKm: 0, endKm: 8, targetWkg: 3, label: "Aanloop", effort: "duur" },
  {
    startKm: 8,
    endKm: 10,
    targetWkg: 4.2,
    label: "De Muur",
    effort: "vol",
    accentId: "de-muur",
  },
];

const SUMMARY: PlanSummary = {
  totalSeconds: 1800,
  avgWatts: 240,
  avgWkg: 3.2,
  cpWkg: 4,
  intensityFactor: 0.85,
  deepestDrawPct: 72,
  feasible: true,
  depletedAtKm: null,
  totalKj: 430,
  strategy: "Sparen, dan toeslaan.",
  risks: ["Te hard van start."],
  notes: [],
};

const PLAN: StoredPlan = {
  id: "plan-1",
  event_id: "event-1",
  profile_id: "profiel-1",
  source: "ai",
  segments: SEGMENTS,
  assumptions: null,
  summary: SUMMARY,
  route_snapshot: null,
  notes: "Niet vergeten: bidon pakken voor de klim. Knie doet weer zeer.",
  shared: true,
  ai_generation_id: "gen-1",
  updated_at: "2026-09-01T10:00:00.000Z",
};

describe("sharedPlanView", () => {
  it("laat de persoonlijke notities niet mee naar buiten gaan", () => {
    const view = sharedPlanView(PLAN, "Stijn");
    expect(JSON.stringify(view)).not.toContain("Knie");
    expect("notes" in view).toBe(false);
  });

  it("deelt wel de planstukken, samenvatting en maker", () => {
    const view = sharedPlanView(PLAN, "Stijn");
    expect(view.ownerName).toBe("Stijn");
    expect(view.segments).toHaveLength(2);
    expect(view.summary?.totalSeconds).toBe(1800);
    expect(view.source).toBe("ai");
  });

  it("labelt een verouderd plan als zodanig", () => {
    expect(sharedPlanView(PLAN, "Stijn", true).stale).toBe(true);
    expect(sharedPlanView(PLAN, "Stijn").stale).toBe(false);
  });
});

describe("adoptSharedPlan", () => {
  const view = sharedPlanView(PLAN, "Stijn");

  it("rekent de doelen om naar jouw CP in plaats van ze klakkeloos over te nemen", () => {
    // Maker rijdt op 4,0 w/kg CP, jij op 3,0: alles gaat met 0,75 mee.
    const mine = adoptSharedPlan(view, 3);
    expect(mine[0].targetWkg).toBe(2.25);
    expect(mine[1].targetWkg).toBe(3.15);
  });

  it("houdt de verhouding tot CP gelijk", () => {
    const mine = adoptSharedPlan(view, 3);
    expect(mine[1].targetWkg / 3).toBeCloseTo(SEGMENTS[1].targetWkg / 4, 5);
  });

  it("schaalt omhoog voor een sterker lid", () => {
    expect(adoptSharedPlan(view, 5)[1].targetWkg).toBeGreaterThan(4.2);
  });

  it("houdt labels en accenten vast", () => {
    const mine = adoptSharedPlan(view, 3);
    expect(mine[1].label).toBe("De Muur");
    expect(mine[1].accentId).toBe("de-muur");
  });

  it("zegt in de reden waar het plan vandaan komt", () => {
    expect(adoptSharedPlan(view, 3)[0].rationale).toContain("Stijn");
    expect(adoptSharedPlan(view, 3)[0].rationale).toContain("jouw CP");
  });

  it("neemt ongewijzigd over als het CP van de maker onbekend is", () => {
    const zonderCp = sharedPlanView({ ...PLAN, summary: null }, "Stijn");
    const mine = adoptSharedPlan(zonderCp, 3);
    expect(mine[1].targetWkg).toBe(4.2);
    expect(mine[0].rationale).not.toContain("omgerekend");
  });
});
