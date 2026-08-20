import { describe, expect, it } from "vitest";
import { supersedableWorkouts } from "@/lib/training/publish";

function workout(planId: string, date: string, status = "planned", origin = "ai") {
  return { plan_id: planId, scheduled_at: `${date}T09:00:00+01:00`, status, origin };
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

  it("laat afspraken van het lid zelf staan", () => {
    // Een eigen rit en een toegezegd clubevent zijn afspraken, geen voorstellen;
    // een herziening plant eromheen in plaats van eroverheen.
    const rows = [
      workout("oud", "2026-08-11", "planned", "member"),
      workout("oud", "2026-08-12", "planned", "event"),
      workout("oud", "2026-08-13", "planned", "ai"),
    ];
    const result = supersedableWorkouts(rows, {
      newerPlanIds: geenNieuwere,
      dayKeys: alleDagen,
      wholeRange: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].origin).toBe("ai");
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

describe("supersedableWorkouts en tests", () => {
  it("laat een FTP-test staan, ook als die uit de bibliotheek komt", () => {
    // Een test uit de bibliotheek draagt origin 'ai', maar is een meetmoment:
    // de wattages van de weken erna hangen aan de uitslag. Wegstrepen zou het
    // lid met een uitslagvraag zonder training achterlaten.
    const rows = [
      { ...workout("oud", "2026-08-11"), test_type: "ramp" },
      { ...workout("oud", "2026-08-12"), test_type: null },
    ];
    const result = supersedableWorkouts(rows, {
      newerPlanIds: geenNieuwere,
      dayKeys: alleDagen,
      wholeRange: true,
    });
    expect(result.map((row) => row.scheduled_at.slice(0, 10))).toEqual(["2026-08-12"]);
  });
});
