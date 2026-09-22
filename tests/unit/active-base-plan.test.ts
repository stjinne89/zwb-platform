import { describe, expect, it } from "vitest";
import { onePlanPerProfile, pickActiveBasePlan } from "@/lib/training/active-plan";
import { publishRange } from "@/lib/training/publish";

function plan(id: string, profile: string, status: string, updatedAt: string) {
  return { id, profile_id: profile, status, updated_at: updatedAt };
}

describe("pickActiveBasePlan", () => {
  it("kiest een gepubliceerd schema boven een recenter goedgekeurd concept", () => {
    const picked = pickActiveBasePlan([
      plan("concept", "lid", "approved", "2026-09-20T10:00:00Z"),
      plan("schema", "lid", "published", "2026-09-11T10:00:00Z"),
    ]);
    expect(picked?.id).toBe("schema");
  });

  it("kiest binnen dezelfde status het meest recent bijgewerkte", () => {
    const picked = pickActiveBasePlan([
      plan("oud", "lid", "published", "2026-07-21T10:00:00Z"),
      plan("nieuw", "lid", "published", "2026-09-11T10:00:00Z"),
    ]);
    expect(picked?.id).toBe("nieuw");
  });
});

describe("onePlanPerProfile", () => {
  it("laat per lid één schema over voor de dagelijkse cron", () => {
    // Zo stond het op 21 september 2026: een oud goedgekeurd plan naast het
    // lopende schema, en elk kreeg een eigen dagvoorstel.
    const result = onePlanPerProfile([
      plan("stijn-oud", "stijn", "approved", "2026-09-21T00:00:00Z"),
      plan("stijn-nieuw", "stijn", "published", "2026-09-21T07:02:00Z"),
      plan("jeroen-oud", "jeroen", "approved", "2026-09-22T03:00:00Z"),
      plan("jeroen-nieuw", "jeroen", "published", "2026-09-21T21:00:00Z"),
      plan("bart", "bart", "published", "2026-09-22T05:14:00Z"),
    ]);
    expect(result.map((row) => row.id).sort()).toEqual(["bart", "jeroen-nieuw", "stijn-nieuw"]);
  });
});

describe("publishRange", () => {
  it("geeft een herziening het bereik vanaf de bijwerkdatum", () => {
    expect(
      publishRange({ adapt_from_date: "2026-09-21", end_date: "2026-10-27", adaptation_kind: "plan_update" }),
    ).toEqual({ from: "2026-09-21", to: "2026-10-27" });
  });

  it("geeft een dagvoorstel geen bereik, ook met een latere einddatum", () => {
    // Het voorstel van 21 september liep tot 1 oktober en had één training; met
    // bereik wiste het de rest van die periode.
    expect(
      publishRange({ adapt_from_date: "2026-09-21", end_date: "2026-10-01", adaptation_kind: "daily" }),
    ).toBeNull();
  });

  it("geeft een basisplan geen bereik", () => {
    expect(publishRange({ adapt_from_date: null, end_date: "2026-10-27", adaptation_kind: null })).toBeNull();
  });
});
