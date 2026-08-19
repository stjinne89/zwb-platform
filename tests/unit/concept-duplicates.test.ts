import { describe, expect, it } from "vitest";
import { withoutConceptDuplicates } from "@/lib/training/active-plan";

const workout = (id: string, planId: string, day: string) => ({
  id,
  plan_id: planId,
  scheduled_at: `${day}T09:00:00+01:00`,
});

describe("withoutConceptDuplicates", () => {
  it("verbergt de conceptworkout op een dag waar het lopende schema al staat", () => {
    const result = withoutConceptDuplicates(
      [workout("live", "a", "2026-08-19"), workout("concept", "b", "2026-08-19")],
      [
        { id: "a", status: "published" },
        { id: "b", status: "draft" },
      ],
    );
    expect(result.map((row) => row.id)).toEqual(["live"]);
  });

  it("laat een concept staan als er die dag geen lopende training is", () => {
    const result = withoutConceptDuplicates(
      [workout("live", "a", "2026-08-19"), workout("concept", "b", "2026-08-20")],
      [
        { id: "a", status: "published" },
        { id: "b", status: "draft" },
      ],
    );
    expect(result.map((row) => row.id)).toEqual(["live", "concept"]);
  });

  it("laat alles staan bij een lid dat alleen een concept heeft", () => {
    const result = withoutConceptDuplicates(
      [workout("een", "b", "2026-08-19"), workout("twee", "b", "2026-08-20")],
      [{ id: "b", status: "draft" }],
    );
    expect(result).toHaveLength(2);
  });

  it("telt een goedgekeurd schema als lopend en een review-concept niet", () => {
    const result = withoutConceptDuplicates(
      [workout("goedgekeurd", "a", "2026-08-19"), workout("review", "b", "2026-08-19")],
      [
        { id: "a", status: "approved" },
        { id: "b", status: "review" },
      ],
    );
    expect(result.map((row) => row.id)).toEqual(["goedgekeurd"]);
  });

  it("houdt een workout van een onbekend plan: liever dubbel dan weg", () => {
    const result = withoutConceptDuplicates(
      [workout("live", "a", "2026-08-19"), workout("wees", "weg", "2026-08-19")],
      [{ id: "a", status: "published" }],
    );
    expect(result.map((row) => row.id)).toEqual(["live", "wees"]);
  });
})
