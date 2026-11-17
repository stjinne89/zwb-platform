import { describe, expect, it } from "vitest";
import { brokenPlanUpdateReason } from "@/lib/training/plan-update-guard";

function summary(remainingDates: string[], from = "2026-11-17", to = "2026-12-27") {
  return JSON.stringify({
    planUpdate: {
      fromDate: from,
      toDate: to,
      remainingWorkouts: remainingDates.map((date) => ({ date, title: "Training" })),
    },
  });
}

const days = (count: number) =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(2026, 10, 18 + i));
    return d.toISOString().slice(0, 10);
  });

describe("brokenPlanUpdateReason", () => {
  it("houdt het antwoord van 17 november tegen: één training plus een plaatshouder", () => {
    const reason = brokenPlanUpdateReason(
      [{ date: "2026-11-17" }, { date: "x" }],
      summary(days(26)),
    );
    expect(reason).toMatch(/geldige datum/);
  });

  it("houdt een antwoord tegen dat veel te weinig trainingen teruggeeft", () => {
    const reason = brokenPlanUpdateReason([{ date: "2026-11-17" }], summary(days(26)));
    expect(reason).toMatch(/1 van de 26/);
  });

  it("laat een gewone herziening door", () => {
    const returned = days(20).map((date) => ({ date }));
    expect(brokenPlanUpdateReason(returned, summary(days(26)))).toBeNull();
  });

  it("laat een kwart precies door", () => {
    const returned = days(5).map((date) => ({ date }));
    expect(brokenPlanUpdateReason(returned, summary(days(20)))).toBeNull();
  });

  it("laat een klein venster met weinig trainingen door", () => {
    expect(brokenPlanUpdateReason([{ date: "2026-11-18" }], summary(days(5)))).toBeNull();
  });

  it("telt trainingen buiten het venster niet mee", () => {
    const outside = Array.from({ length: 20 }, () => ({ date: "2027-01-05" }));
    const reason = brokenPlanUpdateReason([{ date: "2026-11-18" }, ...outside], summary(days(12)));
    expect(reason).toMatch(/1 van de 12/);
  });

  it("zonder leesbare invoer alleen de datumcontrole", () => {
    expect(brokenPlanUpdateReason([{ date: "2026-11-18" }], null)).toBeNull();
    expect(brokenPlanUpdateReason([{ date: "" }], null)).toMatch(/geldige datum/);
  });

  it("een datum met tijd erachter is geldig", () => {
    expect(brokenPlanUpdateReason([{ date: "2026-11-18T08:00" }], null)).toBeNull();
  });
});
