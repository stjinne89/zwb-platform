import { describe, expect, it } from "vitest";
import { hiddenFromMember, type MemberPlanRow } from "@/lib/training/member-hidden-plans";
import { planActionKind, unsentByPlan } from "@/app/(app)/zwbeter-worden/_components/format";

const LID = "lid";
const TRAINER = "trainer";

function plan(overrides: Partial<MemberPlanRow>): MemberPlanRow {
  return {
    id: "p1",
    profile_id: LID,
    status: "draft",
    adaptation_kind: null,
    parent_plan_id: null,
    trainer_id: TRAINER,
    ...overrides,
  };
}

describe("hiddenFromMember", () => {
  it("verbergt een concept van de trainer, ook in review", () => {
    expect(hiddenFromMember(plan({}))).toBe(true);
    expect(hiddenFromMember(plan({ status: "review" }))).toBe(true);
  });

  it("toont een concept dat het lid zelf maakte", () => {
    expect(hiddenFromMember(plan({ trainer_id: LID }))).toBe(false);
  });

  it("toont een lopend of afgelopen schema", () => {
    for (const status of ["approved", "published", "archived"]) {
      expect(hiddenFromMember(plan({ status }))).toBe(false);
    }
  });

  it("verbergt een niet-toegepast dagvoorstel, maar geen andere aanpassing in concept", () => {
    expect(
      hiddenFromMember(plan({ parent_plan_id: "root", adaptation_kind: "daily", trainer_id: LID })),
    ).toBe(true);
    expect(hiddenFromMember(plan({ parent_plan_id: "root", adaptation_kind: "day" }))).toBe(false);
  });
});

describe("unsentByPlan", () => {
  it("telt alleen komende, geplande trainingen die niet in intervals.icu staan", () => {
    const counts = unsentByPlan(
      [
        { plan_id: "a", status: "planned", scheduled_at: "2026-10-27T09:00:00", publish_status: "pending" },
        { plan_id: "a", status: "planned", scheduled_at: "2026-10-28T09:00:00", publish_status: "failed" },
        { plan_id: "a", status: "planned", scheduled_at: "2026-10-29T09:00:00", publish_status: "published" },
        { plan_id: "a", status: "skipped", scheduled_at: "2026-10-29T09:00:00", publish_status: "pending" },
        { plan_id: "a", status: "planned", scheduled_at: "2026-10-20T09:00:00", publish_status: "pending" },
      ],
      "2026-10-26",
    );
    expect(counts.get("a")).toBe(2);
  });
});

describe("planActionKind", () => {
  const base = { mayApprove: true, mayPublish: true, unsent: 0 };

  it("een concept krijgt Publiceren", () => {
    expect(planActionKind({ ...base, status: "draft" })).toBe("publish");
    expect(planActionKind({ ...base, status: "review" })).toBe("publish");
  });

  it("een lopend schema krijgt alleen een knop als er trainingen niet aankwamen", () => {
    expect(planActionKind({ ...base, status: "published" })).toBeNull();
    expect(planActionKind({ ...base, status: "published", unsent: 2 })).toBe("resend");
    expect(planActionKind({ ...base, status: "approved", unsent: 1 })).toBe("resend");
  });

  it("een afgelopen schema krijgt geen knop", () => {
    expect(planActionKind({ ...base, status: "archived", unsent: 3 })).toBeNull();
  });

  it("wie niet mag publiceren, kan een concept goedkeuren", () => {
    expect(planActionKind({ ...base, mayPublish: false, status: "draft" })).toBe("approve");
    expect(planActionKind({ ...base, mayPublish: false, status: "published" })).toBeNull();
    expect(planActionKind({ mayApprove: false, mayPublish: false, unsent: 0, status: "draft" })).toBeNull();
  });
});
