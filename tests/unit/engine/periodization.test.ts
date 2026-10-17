import { describe, expect, it } from "vitest";
import { planWeeks } from "@/lib/training/engine/periodization";
import type { TrainingAiInput, WeekPlan } from "@/lib/training/engine/types";
import { baseInput } from "./fixtures";

const WINDOW = { from: "2026-10-19", to: "2027-01-10" };

function plan(overrides: Partial<TrainingAiInput> = {}, window = WINDOW): WeekPlan[] {
  return planWeeks(baseInput(overrides), window);
}

function kinds(weeks: WeekPlan[]): string[] {
  return weeks.map((week) => week.kind);
}

function rules(week: WeekPlan): string[] {
  return week.reasons.map((reason) => reason.rule);
}

const BUILD = new Set(["opbouw", "piek"]);

describe("planWeeks: cyclus en volume", () => {
  it("maakt twaalf weken in een 3+1-cyclus", () => {
    const weeks = plan();
    expect(weeks).toHaveLength(12);
    expect(weeks[0].weekStart).toBe("2026-10-19");
    expect(weeks[11].to).toBe("2027-01-10");
    expect(kinds(weeks)).toEqual([
      "opbouw", "opbouw", "piek", "herstel",
      "opbouw", "opbouw", "piek", "herstel",
      "opbouw", "opbouw", "piek", "herstel",
    ]);
  });

  it("gebruikt 2+1 bij een beginner, met één sleutelsessie per opbouwweek", () => {
    const input = baseInput();
    input.goal.experienceLevel = "beginner";
    const weeks = planWeeks(input, WINDOW);
    expect(kinds(weeks).slice(0, 6)).toEqual(["opbouw", "piek", "herstel", "opbouw", "piek", "herstel"]);
    expect(weeks[0].keySessions).toBe(1);
  });

  it("begint op het huidige volume en haalt in de piekweek 85 % van het plafond", () => {
    const weeks = plan();
    expect(weeks[0].targetMinutes).toBe(300); // recentLoad 5 uur
    for (const week of weeks.filter((row) => row.kind === "piek")) {
      expect(week.targetMinutes).toBeGreaterThanOrEqual(0.85 * 360); // plafond 6 uur
      expect(week.targetMinutes).toBeLessThanOrEqual(360);
    }
  });

  it("houdt opbouwweken nooit onder het huidige volume", () => {
    for (const week of plan().filter((row) => BUILD.has(row.kind))) {
      expect(week.targetMinutes).toBeGreaterThanOrEqual(300);
    }
  });

  it("groeit nooit meer dan een kwart per opbouwweek, ook als de piek dat vraagt", () => {
    const input = baseInput();
    input.goal.maxHoursPerWeek = 8;
    input.availability = null; // vier aangevinkte dagen, onbeperkt
    const weeks = planWeeks(input, WINDOW);
    expect(weeks[2].kind).toBe("piek");
    expect(weeks[2].targetMinutes).toBeGreaterThanOrEqual(0.85 * 480);
    for (let index = 1; index < weeks.length; index += 1) {
      if (BUILD.has(weeks[index].kind) && BUILD.has(weeks[index - 1].kind)) {
        expect(weeks[index].targetMinutes).toBeLessThanOrEqual(weeks[index - 1].targetMinutes * 1.25);
      }
    }
    expect(weeks[0].targetMinutes).toBeLessThanOrEqual(300 * 1.25);
  });

  it("zakt in een herstelweek naar 60-70 % van de week ervoor", () => {
    const weeks = plan();
    weeks.forEach((week, index) => {
      if (week.kind !== "herstel") return;
      const ratio = week.targetMinutes / weeks[index - 1].targetMinutes;
      expect(ratio).toBeGreaterThanOrEqual(0.6);
      expect(ratio).toBeLessThanOrEqual(0.7);
      expect(week.keySessions).toBe(1);
      expect(rules(week)).toContain("volume.herstelweek");
    });
  });

  it("laat het niveau per cyclus oplopen tot 1 in de piekweek", () => {
    const weeks = plan();
    expect(weeks[0].level).toBe(0);
    expect(weeks[2].level).toBe(1);
    expect(weeks[3].level).toBe(1); // herstel houdt het niveau van de week ervoor
    expect(weeks[4].level).toBeGreaterThan(0);
  });

  it("is deterministisch", () => {
    expect(plan()).toEqual(plan());
  });
});

describe("planWeeks: taper", () => {
  it("tapert bij zrl naar een A-mikpunt binnen het venster", () => {
    const weeks = plan({
      seasonPlan: { targets: [{ title: "Finale", date: "2026-12-13", priority: "a" }], periods: [], nextTargetAfterPlan: null },
    });
    expect(kinds(weeks).slice(5, 8)).toEqual(["piek", "taper", "taper"]);
    const peak = weeks[5];
    for (const week of weeks.slice(6, 8)) {
      expect(week.targetMinutes).toBeGreaterThanOrEqual(0.4 * peak.targetMinutes);
      expect(week.targetMinutes).toBeLessThanOrEqual(0.6 * peak.targetMinutes);
      expect(week.keySessions).toBe(weeks[4].kind === "piek" ? weeks[4].keySessions : peak.keySessions);
      expect(rules(week)).toContain("volume.taper");
    }
  });

  it("richt zich op het eerste A-mikpunt en waarschuwt voor het tweede", () => {
    const weeks = plan({
      seasonPlan: {
        targets: [
          { title: "Tweede", date: "2027-01-03", priority: "a" },
          { title: "Eerste", date: "2026-11-29", priority: "a" },
        ],
        periods: [],
        nextTargetAfterPlan: null,
      },
    });
    expect(weeks[5].kind).toBe("taper"); // week van 23 november: 29 november valt erin
    const warning = weeks.flatMap((week) => week.reasons).find((row) => row.rule === "volume.tweede_a");
    expect(warning?.caution).toBe(true);
    expect(weeks[10].kind).not.toBe("taper");
  });

  it("tapert bij een gran fondo naar de doeldatum", () => {
    const input = baseInput({
      upcomingEvents: [
        { title: "Gran fondo", type: "outdoor", date: "2027-01-10", durationMinutes: 360, distanceKm: 160, elevationM: 2500 },
      ],
    });
    input.goal.type = "gran_fondo";
    input.goal.targetDate = "2027-01-10";
    const weeks = planWeeks(input, WINDOW);
    expect(kinds(weeks).slice(9)).toEqual(["piek", "taper", "taper"]);
    expect(weeks[11].longRideMinutes).toBeNull(); // de rit zelf
  });

  it("tapert niet bij ftp zonder A-mikpunt", () => {
    const input = baseInput();
    input.goal.type = "ftp";
    input.goal.targetDate = "2027-01-10";
    expect(kinds(planWeeks(input, WINDOW))).not.toContain("taper");
  });

  it("tapert niet als de doeldatum na het blok ligt, en sluit af met herstel", () => {
    const input = baseInput({ planWindow: { from: WINDOW.from, to: WINDOW.to, goalBeyond: true } });
    input.goal.type = "gran_fondo";
    input.goal.targetDate = "2027-03-07";
    const weeks = planWeeks(input, { from: WINDOW.from, to: "2027-01-03" }); // elf weken
    expect(kinds(weeks)).not.toContain("taper");
    expect(weeks.at(-1)?.kind).toBe("herstel");
    expect(weeks.at(-2)?.kind).toBe("piek");
  });
});

describe("planWeeks: lange rit", () => {
  it("groeit bij een gran fondo in stappen naar hooguit 85 % van de rit", () => {
    const input = baseInput({
      upcomingEvents: [
        { title: "Gran fondo", type: "outdoor", date: "2027-03-07", durationMinutes: 300, distanceKm: 140, elevationM: 2000 },
      ],
      availability: null,
    });
    input.goal.type = "gran_fondo";
    input.goal.targetDate = "2027-03-07";
    input.goal.maxHoursPerWeek = 10;
    const builds = planWeeks(input, WINDOW).filter((week) => BUILD.has(week.kind));
    const longs = builds.map((week) => week.longRideMinutes ?? 0);
    expect(longs[0]).toBe(150);
    expect(longs[1]).toBeGreaterThan(longs[0]);
    expect(longs[1]).toBeLessThanOrEqual(Math.round(longs[0] * 1.15) + 1);
    expect(Math.max(...longs)).toBeLessThanOrEqual(0.85 * 300);
  });

  it("blijft bij andere doelen op de langste rit van nu", () => {
    for (const week of plan().filter((row) => BUILD.has(row.kind))) {
      expect(week.longRideMinutes ?? 0).toBeLessThanOrEqual(150);
    }
  });
});

describe("planWeeks: periodes", () => {
  it("plant niets in een rustperiode en bouwt daarna twee weken op", () => {
    const weeks = plan({
      seasonPlan: {
        targets: [],
        periods: [{ title: "Vakantie", from: "2026-11-09", to: "2026-11-22", kind: "rust" }],
        nextTargetAfterPlan: null,
      },
    });
    expect(kinds(weeks).slice(0, 7)).toEqual(["opbouw", "opbouw", "piek", "rust", "rust", "heropbouw", "heropbouw"]);
    expect(weeks[3].targetMinutes).toBe(0);
    expect(weeks[3].keySessions).toBe(0);
    expect(weeks[5].targetMinutes).toBeLessThan(weeks[2].targetMinutes);
    expect(weeks[6].targetMinutes).toBeGreaterThan(weeks[5].targetMinutes);
    expect(weeks[6].targetMinutes).toBeLessThan(weeks[2].targetMinutes);
    expect(weeks[7].kind).toBe("opbouw");
  });

  it("geeft na een korte rust geen heropbouw", () => {
    const weeks = plan({
      seasonPlan: {
        targets: [],
        periods: [{ title: "Weekje weg", from: "2026-11-09", to: "2026-11-15", kind: "rust" }],
        nextTargetAfterPlan: null,
      },
    });
    expect(weeks[3].kind).toBe("rust");
    expect(kinds(weeks)).not.toContain("heropbouw");
  });

  it("plant in een drukke periode de helft zonder sleutelsessies", () => {
    const weeks = plan({
      seasonPlan: {
        targets: [],
        periods: [{ title: "Druk", from: "2026-11-09", to: "2026-11-15", kind: "rustig" }],
        nextTargetAfterPlan: null,
      },
    });
    expect(weeks[3].kind).toBe("rustig");
    expect(weeks[3].keySessions).toBe(0);
    expect(weeks[3].targetMinutes / weeks[2].targetMinutes).toBeCloseTo(0.5, 1);
  });

  it("geeft een kamp 1,5-2x het normale volume, boven het plafond", () => {
    const weeks = plan({
      seasonPlan: {
        targets: [],
        periods: [{ title: "Kamp", from: "2026-11-09", to: "2026-11-15", kind: "kamp" }],
        nextTargetAfterPlan: null,
      },
    });
    expect(kinds(weeks).slice(0, 5)).toEqual(["opbouw", "opbouw", "opbouw", "kamp", "herstel"]);
    const ratio = weeks[3].targetMinutes / weeks[2].targetMinutes;
    expect(ratio).toBeGreaterThanOrEqual(1.5);
    expect(ratio).toBeLessThanOrEqual(2);
    expect(weeks[3].targetMinutes).toBeGreaterThan(360);
    expect(weeks[3].keySessions).toBeGreaterThan(weeks[2].keySessions);
  });

  it("laat een apart ingevulde week ook in het kamp leidend zijn", () => {
    const weeks = plan({
      availability: {
        default: { ma: 0, di: 90, wo: 0, do: 90, vr: 0, za: 180, zo: 120 },
        weeks: [{ weekStart: "2026-11-09", minutesByDay: { ma: 60, di: 60, wo: 60, do: 60, vr: 60, za: 60, zo: 60 } }],
      },
      seasonPlan: {
        targets: [],
        periods: [{ title: "Kamp", from: "2026-11-09", to: "2026-11-15", kind: "kamp" }],
        nextTargetAfterPlan: null,
      },
    });
    expect(weeks[3].kind).toBe("kamp");
    expect(weeks[3].targetMinutes).toBe(420);
  });
});

describe("planWeeks: herstelsignalen", () => {
  it("begint bij vermoeidheid onder het huidige volume, met een waarschuwing", () => {
    const weeks = plan({ intervalsLoad: { ctl: 55, atl: 90, tsb: -35, eftp: 250, rampRate: 3 } });
    expect(weeks[0].targetMinutes).toBeLessThan(300);
    const reason = weeks[0].reasons.find((row) => row.rule === "volume.vermoeid");
    expect(reason?.caution).toBe(true);
    const peak = weeks[2];
    expect(peak.kind).toBe("piek");
    expect(peak.reasons.find((row) => row.rule === "volume.piek")?.caution).toBe(true);
  });

  it("matigt de groei bij een hoge ramp rate", () => {
    const input = baseInput({ intervalsLoad: { ctl: 55, atl: 60, tsb: -5, eftp: 250, rampRate: 9 } });
    input.goal.maxHoursPerWeek = 8;
    input.availability = null;
    const weeks = planWeeks(input, WINDOW);
    expect(weeks[1].targetMinutes).toBeLessThan(330);
    expect(rules(weeks[0])).toContain("volume.ramp");
    expect(weeks[2].reasons.find((row) => row.rule === "volume.piek")?.caution).toBe(true);
  });

  it("haalt bij lagere belastbaarheid één sleutelsessie weg", () => {
    const weeks = plan({ symptoms: { score: 0.8, label: "veel", daysLogged: 7 } });
    expect(weeks[0].keySessions).toBe(1);
    expect(weeks[0].reasons.find((row) => row.rule === "sleutel.belastbaarheid")?.caution).toBe(true);
    expect(weeks[1].keySessions).toBe(2);
  });
});

describe("planWeeks: kalender", () => {
  it("geeft een deelweek aan het begin een evenredig deel", () => {
    const weeks = plan({}, { from: "2026-10-22", to: WINDOW.to });
    expect(weeks[0].weekStart).toBe("2026-10-19");
    expect(weeks[0].from).toBe("2026-10-22");
    expect(weeks[0].targetMinutes).toBe(Math.round((300 * 4) / 7));
    expect(rules(weeks[0])).toContain("volume.deelweek");
  });

  it("houdt een week met minder tijd binnen die tijd, zonder de opbouw af te remmen", () => {
    const weeks = plan({
      availability: {
        default: { ma: 0, di: 90, wo: 0, do: 90, vr: 0, za: 180, zo: 120 },
        weeks: [{ weekStart: "2026-10-26", minutesByDay: { ma: 0, di: 60, wo: 0, do: 0, vr: 0, za: 60, zo: 0 } }],
      },
    });
    expect(weeks[1].targetMinutes).toBe(120);
    expect(weeks[1].capacityMinutes).toBe(120);
    expect(rules(weeks[1])).toContain("volume.plafond");
    expect(weeks[2].targetMinutes).toBe(360);
  });

  it("telt vaste afspraken mee en een race als sleutelsessie", () => {
    const weeks = plan({
      fixedWorkouts: [
        { date: "2026-11-14", title: "Lange clubrit", durationMinutes: 400, intensity: "endurance", kind: "eigen_rit" },
        { date: "2026-11-12", title: "ZRL", durationMinutes: 60, intensity: "race", kind: "clubevent" },
      ],
      seasonPlan: {
        targets: [],
        periods: [{ title: "Druk", from: "2026-11-09", to: "2026-11-15", kind: "rustig" }],
        nextTargetAfterPlan: null,
      },
    });
    expect(weeks[3].targetMinutes).toBe(460);
    expect(weeks[3].keySessions).toBe(1);
    expect(rules(weeks[3])).toEqual(expect.arrayContaining(["volume.vast", "sleutel.race"]));
  });

  it("slaat bij een volgend blok de herstelweek tussen de blokken niet over", () => {
    const weeks = plan({
      planUpdate: {
        reason: "Volgend blok",
        fromDate: WINDOW.from,
        toDate: WINDOW.to,
        nextBlock: true,
        previousTitle: "Blok 1",
        previousSummary: null,
        changed: {},
        remainingWorkouts: [{ date: "2026-10-24", title: "Rustige duur", durationMinutes: 60, intensity: "endurance" }],
      },
    });
    expect(weeks[0].kind).toBe("herstel");
    expect(weeks[0].targetMinutes).toBe(Math.round(0.65 * 300));
    expect(kinds(weeks).slice(1, 5)).toEqual(["opbouw", "opbouw", "piek", "herstel"]);
  });
});
