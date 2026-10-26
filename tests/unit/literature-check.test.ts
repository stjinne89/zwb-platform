import { describe, expect, it } from "vitest";
import type { GeneratedWorkout } from "@/lib/training/ai";
import {
  checkLiterature,
  checkTaper,
  longestGap,
  trailingDays,
  polarizationIndex,
  tidKind,
  zoneMinutes,
} from "@/lib/training/literature-check";
import { baseInput } from "./engine/fixtures";

function workout(date: string, minutes: number, intensity: GeneratedWorkout["intensity"] = "endurance"): GeneratedWorkout {
  return { date, title: "Rit", description: "", durationMinutes: minutes, intensity, targetType: "power", structure: [] };
}

describe("zoneMinutes", () => {
  it("telt blokken per Seiler-zone en slaat race en rust over", () => {
    const intervals: GeneratedWorkout = {
      ...workout("2026-10-20", 60, "vo2max"),
      structure: [
        { label: "Warming-up", durationMinutes: 15, target: "", notes: "", intensity: "endurance" },
        { label: "VO2max", durationMinutes: 20, target: "", notes: "", intensity: "vo2max" },
        { label: "Tempo", durationMinutes: 10, target: "", notes: "", intensity: "tempo" },
        { label: "Cooling-down", durationMinutes: 15, target: "", notes: "", intensity: "recovery" },
      ],
    };
    expect(zoneMinutes([intervals, workout("2026-10-21", 90, "race"), workout("2026-10-22", 0, "rest")])).toEqual({
      z1: 30,
      z2: 10,
      z3: 20,
    });
  });

  it("valt zonder blokken terug op de workout zelf", () => {
    expect(zoneMinutes([workout("2026-10-20", 45, "threshold")])).toEqual({ z1: 0, z2: 45, z3: 0 });
  });
});

describe("polarizationIndex en tidKind", () => {
  it("rekent de index van Treff: 80/5/15 is gepolariseerd", () => {
    expect(polarizationIndex({ z1: 80, z2: 5, z3: 15 })).toBeCloseTo(Math.log10(16 * 0.15 * 100), 5);
    expect(tidKind({ z1: 80, z2: 5, z3: 15 })).toBe("gepolariseerd");
  });

  it("herkent piramidaal, drempel, hoog en basis", () => {
    expect(tidKind({ z1: 75, z2: 18, z3: 7 })).toBe("piramidaal");
    expect(tidKind({ z1: 45, z2: 50, z3: 5 })).toBe("drempel");
    expect(tidKind({ z1: 30, z2: 10, z3: 40 })).toBe("hoog");
    expect(tidKind({ z1: 97, z2: 3, z3: 0 })).toBe("basis");
    expect(tidKind({ z1: 0, z2: 0, z3: 0 })).toBe("leeg");
  });

  it("geen zone 2 maar wel zone 3 telt als gepolariseerd", () => {
    expect(polarizationIndex({ z1: 90, z2: 0, z3: 10 })).toBe(Number.POSITIVE_INFINITY);
    expect(tidKind({ z1: 90, z2: 0, z3: 10 })).toBe("gepolariseerd");
  });
});

describe("checkTaper", () => {
  const input = baseInput({
    goal: { ...baseInput().goal, type: "gran_fondo", targetDate: "2026-12-20" },
    planWindow: { from: "2026-11-01", to: "2026-12-20", goalBeyond: false },
    seasonPlan: null,
  });
  const window = { from: "2026-11-01", to: "2026-12-20" };
  // Drie weken vóór de taper (15 nov - 5 dec): 4 x 90 min per week, één drempel per week.
  const pre = ["2026-11-16", "2026-11-23", "2026-11-30"].flatMap((monday) => {
    const day = (offset: number) => {
      const d = new Date(`${monday}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    return [workout(day(1), 90, "threshold"), workout(day(2), 90), workout(day(4), 90), workout(day(5), 90)];
  });

  it("keurt een taper van ongeveer de helft met behoud van intensiteit en frequentie goed", () => {
    const taper = [
      "2026-12-08",
      "2026-12-09",
      "2026-12-11",
      "2026-12-12",
      "2026-12-15",
      "2026-12-16",
      "2026-12-18",
    ].map((date, index) => workout(date, 45, index === 0 ? "threshold" : "endurance"));
    const result = checkTaper(input, [...pre, ...taper], window);
    expect(result?.anchor).toBe("2026-12-20");
    expect(result?.volumeOk).toBe(true);
    expect(result?.intensityKept).toBe(true);
    expect(result?.frequencyKept).toBe(true);
  });

  it("ziet een te kleine daling, en een taper zonder hard werk en met minder trainingen", () => {
    const taper = ["2026-12-08", "2026-12-15"].map((date) => workout(date, 300));
    const result = checkTaper(input, [...pre, ...taper], window);
    expect(result?.volumeOk).toBe(false);
    expect(result?.intensityKept).toBe(false);
    expect(result?.frequencyKept).toBe(false);
  });

  it("geeft null zonder piekmoment of als de weken ervoor buiten de periode vallen", () => {
    expect(checkTaper(baseInput({ seasonPlan: null }), pre, window)).toBeNull();
    expect(checkTaper(input, pre, { from: "2026-12-01", to: "2026-12-20" })).toBeNull();
  });
});

describe("longestGap", () => {
  it("telt de langste reeks dagen zonder training, rustperiodes niet", () => {
    const input = baseInput({
      fixedWorkouts: [],
      seasonPlan: {
        targets: [],
        periods: [{ title: "Vakantie", from: "2026-11-05", to: "2026-11-12", kind: "rust" }],
        nextTargetAfterPlan: null,
      },
    });
    const workouts = [workout("2026-11-01", 60), workout("2026-11-03", 60), workout("2026-11-20", 60)];
    // 4 nov telt, 5-12 nov is vakantie, daarna 13-19 nov: zeven dagen.
    expect(longestGap(input, workouts, { from: "2026-11-01", to: "2026-11-20" })).toBe(7);
  });

  it("telt wat na de laatste training komt niet als gat, maar als eerder stoppen", () => {
    const input = baseInput({ fixedWorkouts: [], seasonPlan: null });
    const workouts = [workout("2026-11-01", 60), workout("2026-11-03", 60)];
    const window = { from: "2026-11-01", to: "2026-11-30" };
    expect(longestGap(input, workouts, window)).toBe(1);
    expect(trailingDays(input, workouts, window)).toBe(27);
    expect(trailingDays(input, [], window)).toBe(30);
  });
});

describe("checkLiterature", () => {
  it("vat verdeling, taper en onderbreking samen binnen de periode", () => {
    const input = baseInput({ seasonPlan: null, fixedWorkouts: [] });
    const result = checkLiterature(
      input,
      [workout("2026-10-19", 60), workout("2026-11-05", 60, "vo2max"), workout("2027-01-01", 60)],
      { from: "2026-10-19", to: "2026-11-05" },
    );
    expect(result.zones).toEqual({ z1: 60, z2: 0, z3: 60 });
    expect(result.tid).toBe("hoog");
    expect(result.taper).toBeNull();
    expect(result.longestGap).toBe(16);
    expect(result.gapTooLong).toBe(true);
    expect(result.endsEarly).toBe(false);
  });
});
