import { describe, expect, it } from "vitest";
import { supersedableWorkouts } from "@/lib/training/publish";

function workout(planId: string, date: string, status = "planned") {
  return { plan_id: planId, scheduled_at: `${date}T09:00:00+01:00`, status };
}

const geenNieuwere = new Set<string>();
const alleDagen = new Set<string>();

describe("supersedableWorkouts", () => {
  it("vervangt geplande workouts van een ouder plan binnen het bereik", () => {
    const rows = [workout("oud", "2026-08-11"), workout("oud", "2026-08-13")];
    const result = supersedableWorkouts(rows, {
      newerPlanIds: geenNieuwere,
      dayKeys: alleDagen,
      wholeRange: true,
    });
    expect(result).toHaveLength(2);
  });

  it("laat een workout uit een nieuwer plan met rust", () => {
    // Twee herzieningen streepten elkaar anders volledig weg: de eerste verving
    // de tweede en de tweede daarna de eerste.
    const rows = [workout("oud", "2026-08-11"), workout("nieuwer", "2026-08-11")];
    const result = supersedableWorkouts(rows, {
      newerPlanIds: new Set(["nieuwer"]),
      dayKeys: alleDagen,
      wholeRange: true,
    });
    expect(result.map((row) => row.plan_id)).toEqual(["oud"]);
  });

  it("laat gereden en overgeslagen sessies staan", () => {
    const rows = [
      workout("oud", "2026-08-11", "completed"),
      workout("oud", "2026-08-12", "skipped"),
      workout("oud", "2026-08-13", "planned"),
    ];
    const result = supersedableWorkouts(rows, {
      newerPlanIds: geenNieuwere,
      dayKeys: alleDagen,
      wholeRange: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].scheduled_at).toContain("2026-08-13");
  });

  it("raakt zonder bereik alleen de dagen waar dit plan zelf iets neerzet", () => {
    const rows = [workout("oud", "2026-08-11"), workout("oud", "2026-08-13")];
    const result = supersedableWorkouts(rows, {
      newerPlanIds: geenNieuwere,
      dayKeys: new Set(["2026-08-13"]),
      wholeRange: false,
    });
    expect(result).toHaveLength(1);
    expect(result[0].scheduled_at).toContain("2026-08-13");
  });

  it("laat met bereik ook dagen vervallen waar dit plan niets plant", () => {
    // Zo verdwijnt een geschrapte trainingsdag echt uit de kalender.
    const rows = [workout("oud", "2026-08-11")];
    const result = supersedableWorkouts(rows, {
      newerPlanIds: geenNieuwere,
      dayKeys: new Set(["2026-08-13"]),
      wholeRange: true,
    });
    expect(result).toHaveLength(1);
  });
});
