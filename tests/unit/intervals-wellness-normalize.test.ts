import { describe, expect, it } from "vitest";
import { normalizeIntervalsWellness } from "@/lib/intervals/client";

// Vorm zoals intervals.icu hem in september 2026 teruggeeft: camelCase en de
// eFTP per sport. Voorheen las de code `eftp` en `ramp_rate` op de rij en kreeg
// daardoor altijd null.
describe("normalizeIntervalsWellness", () => {
  it("haalt de eFTP uit sportInfo van Ride en zet rampRate om", () => {
    const row = normalizeIntervalsWellness({
      id: "2026-09-20",
      ctl: 60,
      atl: 70,
      rampRate: 4.2,
      ctlLoad: 55,
      sportInfo: [{ type: "Ride", eftp: 287.4 }],
    });
    expect(row.eftp).toBe(287.4);
    expect(row.ramp_rate).toBe(4.2);
    expect(row.ctl_load).toBe(55);
  });

  it("valt terug op de hoogste andere fietssport en laat bestaande velden staan", () => {
    expect(
      normalizeIntervalsWellness({
        id: "2026-09-20",
        sportInfo: [
          { type: "Run", eftp: 400 },
          { type: "VirtualRide", eftp: 270 },
          { type: "GravelRide", eftp: 262 },
        ],
      }).eftp,
    ).toBe(270);
    expect(normalizeIntervalsWellness({ id: "2026-09-20", eftp: 300, ramp_rate: 1 })).toMatchObject({
      eftp: 300,
      ramp_rate: 1,
    });
    expect(normalizeIntervalsWellness({ id: "2026-09-20", sportInfo: null }).eftp).toBeUndefined();
  });
});
