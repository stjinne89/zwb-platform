import { describe, expect, it } from "vitest";
import { isTttShareToken, tttPlanExport } from "@/lib/ttt/plan-export";

const riders = [
  { name: "Piet", zwift_id: "222", pull_watts: 310, pull_duration_seconds: 45, display_order: 1 },
  { name: "Stijn", zwift_id: " 111 ", pull_watts: 320, pull_duration_seconds: 60, display_order: 0 },
  { name: "Gast 1", zwift_id: null, pull_watts: null, pull_duration_seconds: 0, display_order: 2 },
];

describe("tttPlanExport", () => {
  it("geeft de renners in planvolgorde met kopbeurt-watts en -duur", () => {
    const result = tttPlanExport({ name: "ZRL ronde 2", api_response: null }, riders, null);
    expect(result.riders).toEqual([
      { order: 1, name: "Stijn", zwiftId: "111", pullWatts: 320, pullSeconds: 60 },
      { order: 2, name: "Piet", zwiftId: "222", pullWatts: 310, pullSeconds: 45 },
      { order: 3, name: "Gast 1", zwiftId: null, pullWatts: null, pullSeconds: 0 },
    ]);
  });

  it("neemt event en de schatting van ZwiftGopher over", () => {
    const result = tttPlanExport(
      {
        name: "ZRL ronde 2",
        api_response: { data: { estimated_time_seconds: 2520, estimated_avg_speed: 44.1 } },
      },
      riders,
      { title: "ZRL TTT", start_at: "2026-10-20T18:15:00Z" },
    );
    expect(result).toMatchObject({
      version: 1,
      name: "ZRL ronde 2",
      eventTitle: "ZRL TTT",
      startAt: "2026-10-20T18:15:00Z",
      estimatedSeconds: 2520,
      estimatedSpeedKmh: 44.1,
    });
  });

  it("geeft geen schatting zonder optimalisatie", () => {
    const result = tttPlanExport({ name: "Concept", api_response: null }, [], null);
    expect(result.estimatedSeconds).toBeNull();
    expect(result.estimatedSpeedKmh).toBeNull();
    expect(result.eventTitle).toBeNull();
  });

  it("laat FTP, gewicht en lengte weg, ook als de rij ze bevat", () => {
    const row = { ...riders[0], ftp_watts: 300, weight_kg: 78, height_cm: 185 };
    const text = JSON.stringify(tttPlanExport({ name: "Plan", api_response: null }, [row], null));
    expect(text).not.toMatch(/ftp|weight|height|300|78|185/i);
  });
});

describe("isTttShareToken", () => {
  it("herkent een token van 32 tekens base64url", () => {
    expect(isTttShareToken("aB3_-".repeat(6) + "xY")).toBe(true);
  });

  it("weigert te korte tokens en andere tekens", () => {
    expect(isTttShareToken("abc")).toBe(false);
    expect(isTttShareToken("a".repeat(31) + "/")).toBe(false);
  });
});
