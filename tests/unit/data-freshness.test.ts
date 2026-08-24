import { describe, expect, it } from "vitest";
import {
  formatFreshnessMoment,
  freshnessDaysAgo,
} from "@/app/(app)/zwbeter-worden/_components/data-freshness";

describe("data freshness", () => {
  it("toont bij een datum zonder tijd geen verzonnen 00:00", () => {
    const day = new Date("2026-08-24T12:00:00Z");
    const now = new Date("2026-08-24T18:00:00+02:00");
    expect(formatFreshnessMoment(day, true, now)).toBe("vandaag");
  });

  it("rekent in kalenderdagen van Amsterdam", () => {
    const justBeforeMidnightUtc = new Date("2026-08-23T22:30:00Z");
    const now = new Date("2026-08-24T08:00:00Z");
    expect(freshnessDaysAgo(justBeforeMidnightUtc, now)).toBe(0);
  });
});
