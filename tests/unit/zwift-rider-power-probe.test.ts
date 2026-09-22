import { describe, expect, it } from "vitest";
import { describePowerFields } from "@/lib/events/zwift-club";

describe("describePowerFields", () => {
  it("toont vermogen en categorie met waarde, persoonsgegevens alleen als naam", () => {
    const lines = describePowerFields({
      id: 123,
      firstName: "Stijn",
      weight: 72000,
      age: 36,
      ftp: 280,
      competitionMetrics: { racingScore: 512.3, category: "B", categoryWomen: null },
      privacy: { displayWeight: false },
    });
    const text = lines.join("\n");
    expect(text).toContain("ftp = 280");
    expect(text).toContain("competitionMetrics.racingScore = 512.3");
    expect(text).toContain('competitionMetrics.category = "B"');
    expect(text).toContain("weight");
    expect(text).not.toContain("72000");
    expect(text).not.toContain("Stijn");
    expect(text).not.toContain("36");
  });
});
