import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  assignSides,
  comparedWorkouts,
  comparisonPair,
  comparisonWeeks,
  mondayOf,
  engineSide,
  parseChoice,
  tallyVerdicts,
  winnerOf,
} from "@/lib/training/engine-comparison";
import type { GeneratedWorkout } from "@/lib/training/ai";
import { baseInput } from "./engine/fixtures";

describe("engineSide", () => {
  it("is vast per generatie-id", () => {
    const id = "6f1c2b9e-3d4a-4f6b-9a1e-2c3d4e5f6a7b";
    expect(engineSide(id)).toBe(engineSide(id));
  });

  it("verdeelt de motor ongeveer gelijk over A en B", () => {
    const ids = Array.from({ length: 2000 }, () => randomUUID());
    const onA = ids.filter((id) => engineSide(id) === "a").length;
    expect(onA).toBeGreaterThan(900);
    expect(onA).toBeLessThan(1100);
  });
});

describe("assignSides", () => {
  it("zet de motor op de kant die engineSide kiest", () => {
    for (const id of ["g-1", "g-2", "g-3", "g-4", "g-5", "g-6"]) {
      const sides = assignSides(id, "ai", "engine");
      expect(sides.engineSide).toBe(engineSide(id));
      expect(sides[sides.engineSide]).toBe("engine");
      expect(sides[sides.engineSide === "a" ? "b" : "a"]).toBe("ai");
    }
  });
});

describe("winnerOf", () => {
  it("vertaalt A/B terug naar wie won", () => {
    expect(winnerOf("a", "a")).toBe("engine");
    expect(winnerOf("b", "a")).toBe("ai");
    expect(winnerOf("a", "b")).toBe("ai");
    expect(winnerOf("b", "b")).toBe("engine");
    expect(winnerOf("gelijk", "a")).toBe("gelijk");
  });

  it("past bij assignSides: de gekozen kant is wat er won", () => {
    const sides = assignSides("g-7", "ai", "engine");
    expect(winnerOf("a", sides.engineSide)).toBe(sides.a);
    expect(winnerOf("b", sides.engineSide)).toBe(sides.b);
  });
});

describe("parseChoice", () => {
  it("laat alleen a, b en gelijk door", () => {
    expect(parseChoice("a")).toBe("a");
    expect(parseChoice("gelijk")).toBe("gelijk");
    expect(parseChoice("ai")).toBeNull();
    expect(parseChoice(null)).toBeNull();
  });
});

describe("tallyVerdicts", () => {
  it("telt per winnaar en slaat onbekende waarden over", () => {
    expect(
      tallyVerdicts([
        { winner: "engine" },
        { winner: "ai" },
        { winner: "engine" },
        { winner: "gelijk" },
        { winner: "iets anders" },
      ]),
    ).toEqual({ total: 4, engine: 2, ai: 1, gelijk: 1 });
  });

  it("is leeg zonder oordelen", () => {
    expect(tallyVerdicts([])).toEqual({ total: 0, engine: 0, ai: 0, gelijk: 0 });
  });
});

describe("comparedWorkouts", () => {
  it("sorteert op datum en neemt alleen de workoutvelden mee", () => {
    const workout = (date: string): GeneratedWorkout => ({
      date,
      title: `Rit ${date}`,
      description: "",
      durationMinutes: 60,
      intensity: "endurance",
      targetType: "power",
      structure: [],
    });
    const result = comparedWorkouts({ workouts: [workout("2026-10-21"), workout("2026-10-19")] });
    expect(result.map((row) => row.date)).toEqual(["2026-10-19", "2026-10-21"]);
    expect(result[0]).not.toHaveProperty("targetType");
  });
});

describe("comparisonPair", () => {
  it("rekent de motor uit op de opgeslagen invoer", () => {
    const input = baseInput();
    const pair = comparisonPair(JSON.stringify(input), { workouts: [], startDate: "2026-10-19", endDate: "2026-11-15" });
    expect(pair?.mode).toBe("plan");
    expect(pair?.engine.length).toBeGreaterThan(0);
    expect(pair?.ai).toEqual([]);
  });

  it("geeft null bij een korte samenvatting of zonder AI-schema", () => {
    expect(comparisonPair("Schema voor Jan", { workouts: [] })).toBeNull();
    expect(comparisonPair(JSON.stringify(baseInput()), null)).toBeNull();
  });
});

describe("comparisonWeeks", () => {
  const w = (date: string, durationMinutes: number) => ({
    date,
    title: "Rit",
    description: "",
    durationMinutes,
    intensity: "endurance" as const,
    structure: [],
  });

  it("zet dagen van beide kanten naast elkaar en telt minuten per week", () => {
    const weeks = comparisonWeeks(
      [w("2026-10-20", 60), w("2026-10-27", 90)],
      [w("2026-10-21", 45), w("2026-10-20", 30)],
    );
    expect(weeks.map((week) => week.weekStart)).toEqual(["2026-10-19", "2026-10-26"]);
    expect(weeks[0]).toMatchObject({ aMinutes: 60, bMinutes: 75 });
    expect(weeks[0].days.map((day) => day.date)).toEqual(["2026-10-20", "2026-10-21"]);
    expect(weeks[1]).toMatchObject({ aMinutes: 90, bMinutes: 0 });
  });

  it("hangt het oude plan alleen aan dagen die een kant wijzigt", () => {
    const weeks = comparisonWeeks([w("2026-10-20", 60)], [], [
      { date: "2026-10-20", title: "Drempel", durationMinutes: 75, intensity: "threshold" },
      { date: "2026-10-22", title: "Duur", durationMinutes: 60, intensity: "endurance" },
    ]);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].days).toHaveLength(1);
    expect(weeks[0].days[0].was.map((row) => row.title)).toEqual(["Drempel"]);
  });

  it("vindt de maandag ook op zondag", () => {
    expect(mondayOf("2026-10-25")).toBe("2026-10-19");
    expect(mondayOf("2026-10-19")).toBe("2026-10-19");
  });
});
