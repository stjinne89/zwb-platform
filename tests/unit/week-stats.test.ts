import { describe, expect, it } from "vitest";
import { weekStatLabel, weekStats } from "@/lib/training/week-stats";

describe("weekStats", () => {
  it("telt gereden en gepland per week, op maandag", () => {
    const stats = weekStats({
      rides: [
        { start_date_local: "2026-11-10", moving_time_seconds: 3600, training_load: 60 },
        { start_date_local: "2026-11-15", moving_time_seconds: 5400, training_load: 90.4 },
        { start_date_local: "2026-11-17", moving_time_seconds: 1800, training_load: null },
      ],
      planned: [
        { dateKey: "2026-11-11", minutes: 60, load: 55 },
        { dateKey: "2026-11-14", minutes: 120, load: null },
        { dateKey: "2026-11-25", minutes: 90, load: 80 },
      ],
      ctlPoints: [
        { date: "2026-11-09", ctl: 50 },
        { date: "2026-11-15", ctl: 52.3 },
      ],
    });
    expect(stats["2026-11-09"]).toEqual({
      weekStart: "2026-11-09",
      doneMinutes: 150,
      doneLoad: 150,
      plannedMinutes: 180,
      plannedLoad: 55,
      ctlChange: null,
    });
    expect(stats["2026-11-16"]).toMatchObject({ doneMinutes: 30, doneLoad: 0, plannedMinutes: 0, plannedLoad: null });
    expect(stats["2026-11-23"]).toMatchObject({ plannedMinutes: 90, plannedLoad: 80, doneMinutes: 0 });
  });

  it("rekent de CTL-wijziging vanaf de dag voor de week", () => {
    const stats = weekStats({
      rides: [{ start_date_local: "2026-11-10", moving_time_seconds: 3600, training_load: 60 }],
      planned: [],
      ctlPoints: [
        { date: "2026-11-08", ctl: 50 },
        { date: "2026-11-12", ctl: 51 },
        { date: "2026-11-15", ctl: 52.3 },
      ],
    });
    expect(stats["2026-11-09"].ctlChange).toBe(2.3);
  });

  it("laat weken weg waarvoor de ritten niet compleet zijn", () => {
    const stats = weekStats({
      rides: [],
      planned: [
        { dateKey: "2026-07-01", minutes: 60, load: 50 },
        { dateKey: "2026-11-11", minutes: 60, load: 50 },
      ],
      from: "2026-07-20",
    });
    expect(Object.keys(stats)).toEqual(["2026-11-09"]);
  });
});

describe("weekStatLabel", () => {
  const base = {
    weekStart: "2026-11-09",
    doneMinutes: 250,
    doneLoad: 260,
    plannedMinutes: 330,
    plannedLoad: 340,
    ctlChange: 2.1,
  };

  it("toont gereden tegenover gepland, met de CTL-wijziging", () => {
    expect(weekStatLabel(base, "2026-11-16")).toEqual({
      long: "4:10 / 5:30 u · TSS 260 / 340 · CTL +2,1",
      short: "4:10/5:30 u · 260/340",
    });
  });

  it("toont een negatieve CTL-wijziging met een minteken", () => {
    expect(weekStatLabel({ ...base, ctlChange: -1.5 }, "2026-11-16")?.long).toContain("CTL −1,5");
  });

  it("toont alleen het gereden deel als er niets gepland stond", () => {
    expect(
      weekStatLabel({ ...base, plannedMinutes: 0, plannedLoad: null, ctlChange: null }, "2026-11-16"),
    ).toEqual({ long: "4:10 u · TSS 260", short: "4:10 u · 260" });
  });

  it("toont voor een komende week alleen de planning", () => {
    expect(weekStatLabel({ ...base, weekStart: "2026-11-23" }, "2026-11-16")).toEqual({
      long: "Gepland 5:30 u · TSS 340",
      short: "Gepland 5:30 u · 340",
    });
    expect(
      weekStatLabel({ ...base, weekStart: "2026-11-23", plannedMinutes: 0, plannedLoad: null }, "2026-11-16"),
    ).toBeNull();
  });

  it("toont niets voor een lege week", () => {
    expect(weekStatLabel(undefined, "2026-11-16")).toBeNull();
    expect(
      weekStatLabel(
        { ...base, doneMinutes: 0, doneLoad: 0, plannedMinutes: 0, plannedLoad: null },
        "2026-11-16",
      ),
    ).toBeNull();
  });
});
