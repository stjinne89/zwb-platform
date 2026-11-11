import { describe, expect, it } from "vitest";
import {
  describeFetchError,
  loginBody,
  segmentResultsUrl,
  subgroupResultsUrl,
  summarizePassages,
  tallyBurst,
  zwiftDate,
} from "@/lib/zwift/browser-probe";
import type { SegmentResult } from "@/lib/zwift/segment-results-pb";

function passage(athleteId: number, ts: number): SegmentResult {
  return {
    id: `${athleteId}-${ts}`,
    athleteId,
    segmentId: "1",
    eventSubgroupId: null,
    firstName: "",
    lastName: "",
    worldTime: 0,
    ts,
    elapsed: 30,
    avgPower: null,
    weightKg: null,
  };
}

describe("zwift browser probe", () => {
  it("stuurt datums zonder milliseconden", () => {
    expect(zwiftDate(Date.UTC(2026, 8, 22, 12, 0, 0, 123))).toBe("2026-09-22T12:00:00Z");
  });

  it("logt in met de password-grant van de mobiele client", () => {
    const body = loginBody("a@b.c", "geheim");
    expect(body.get("client_id")).toBe("Zwift_Mobile_Link");
    expect(body.get("grant_type")).toBe("password");
    expect(body.get("username")).toBe("a@b.c");
  });

  it("bouwt de segment-URL met wereld 1 en een venster", () => {
    const url = new URL(segmentResultsUrl("1059797545", Date.UTC(2026, 10, 11, 18), Date.UTC(2026, 10, 11, 19)));
    expect(url.pathname).toBe("/api/segment-results");
    expect(url.searchParams.get("world_id")).toBe("1");
    expect(url.searchParams.get("from")).toBe("2026-11-11T18:00:00Z");
    expect(url.searchParams.get("to")).toBe("2026-11-11T19:00:00Z");
  });

  it("weigert ID's die geen getal zijn", () => {
    expect(() => segmentResultsUrl("1&x=2", 0)).toThrow();
    expect(() => subgroupResultsUrl("-5")).toThrow();
  });

  it("vat passages samen zonder namen", () => {
    const now = Date.UTC(2026, 10, 11, 19);
    const summary = summarizePassages([passage(1, now - 40_000), passage(1, now - 10_000), passage(2, now - 20_000)], now);
    expect(summary).toEqual({ passages: 3, riders: 2, newestAgeS: 10 });
    expect(summarizePassages([], now).newestAgeS).toBeNull();
  });

  it("telt een burst en het eerste antwoord dat geen 200 is", () => {
    expect(tallyBurst([200, 200, "fout", 429, 200])).toEqual({
      sent: 5,
      byStatus: { "200": 3, "429": 1, fout: 1 },
      firstFailAt: 3,
    });
    expect(tallyBurst([200]).firstFailAt).toBeNull();
  });

  it("herkent een antwoord dat de browser niet mag lezen", () => {
    expect(describeFetchError(new TypeError("Failed to fetch"))).toBe(
      "geen leesbaar antwoord (CORS, netwerk of foutstatus)",
    );
    expect(describeFetchError(new Error("x"))).toBe("x");
  });
});
