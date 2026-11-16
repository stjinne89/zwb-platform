import { describe, expect, it } from "vitest";
import { projectLoad } from "@/lib/training/load-projection";

describe("projectLoad", () => {
  it("laat de CTL op rustdagen zakken", () => {
    const points = projectLoad({
      today: "2026-11-16",
      ctl: 50,
      atl: 60,
      planned: [{ date: "2026-11-18", load: 100 }],
      until: "2026-11-19",
    })!;
    expect(points.map((point) => point.date)).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
    ]);
    // Vandaag: niets open, de stand blijft.
    expect(points[0]).toMatchObject({ ctl: 50, atl: 60, tsb: -10, load: 0 });
    // Rustdag: 50 - 50/42.
    expect(points[1].ctl).toBe(48.8);
    expect(points[1].atl).toBe(51.4);
    expect(points[2].load).toBe(100);
    expect(points[2].ctl).toBeGreaterThan(points[1].ctl);
    expect(points[3].ctl).toBeLessThan(points[2].ctl);
  });

  it("telt een open training van vandaag bovenop de stand, en negeert het verleden", () => {
    const points = projectLoad({
      today: "2026-11-16",
      ctl: 42,
      atl: 70,
      planned: [
        { date: "2026-11-10", load: 500 },
        { date: "2026-11-16", load: 84 },
      ],
      until: "2026-11-16",
    })!;
    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ ctl: 44, atl: 82, load: 84 });
  });

  it("geeft null zonder stand van vandaag", () => {
    expect(projectLoad({ today: "2026-11-16", ctl: null, atl: 40, planned: [], until: "2026-12-01" })).toBeNull();
    expect(projectLoad({ today: "2026-11-16", ctl: 40, atl: undefined, planned: [], until: "2026-12-01" })).toBeNull();
  });

  it("de oude berekening schatte te hoog: zonder rustdagen en met het verleden erbij", () => {
    // Drie trainingen van 60 TSS in een week, CTL 60: de CTL blijft niet staan
    // maar zakt, omdat er vier rustdagen tussen zitten.
    const points = projectLoad({
      today: "2026-11-16",
      ctl: 60,
      atl: 60,
      planned: [
        { date: "2026-11-17", load: 60 },
        { date: "2026-11-19", load: 60 },
        { date: "2026-11-21", load: 60 },
      ],
      until: "2026-11-23",
    })!;
    expect(points.at(-1)!.ctl).toBeLessThan(60);
  });
});
