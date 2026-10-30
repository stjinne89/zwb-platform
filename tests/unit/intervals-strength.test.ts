import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  INTERVALS_SESSION_SETS,
  intervalsWeekLoad,
  isIntervalsStrengthType,
  mergeLoad,
  normalizeMuscleSelection,
  type IntervalsStrengthSession,
} from "@/lib/training/intervals-strength";
import { MUSCLE_GROUPS } from "@/lib/training/muscles";

function session(overrides: Partial<IntervalsStrengthSession> = {}): IntervalsStrengthSession {
  return {
    intervalsId: "i1",
    day: "2026-08-10",
    name: "Krachttraining",
    minutes: 50,
    muscles: [],
    ...overrides,
  };
}

describe("isIntervalsStrengthType", () => {
  it("herkent alleen WeightTraining", () => {
    expect(isIntervalsStrengthType("WeightTraining")).toBe(true);
    expect(isIntervalsStrengthType("Workout")).toBe(false);
    expect(isIntervalsStrengthType("Ride")).toBe(false);
    expect(isIntervalsStrengthType(null)).toBe(false);
  });
});

describe("normalizeMuscleSelection", () => {
  it("houdt alleen bekende groepen over, elk één keer, in vaste volgorde", () => {
    expect(normalizeMuscleSelection(["kuiten", "borst", "onzin", "borst", ""])).toEqual([
      "borst",
      "kuiten",
    ]);
  });
});

describe("intervalsWeekLoad", () => {
  const today = "2026-08-10";

  it("telt aangetikte spieren in de afgelopen zeven dagen", () => {
    const load = intervalsWeekLoad(
      [
        session({ day: "2026-08-04", muscles: ["quadriceps", "bilspieren"] }),
        session({ intervalsId: "i2", day: "2026-08-09", muscles: ["quadriceps"] }),
        session({ intervalsId: "i3", day: "2026-08-03", muscles: ["borst"] }),
        session({ intervalsId: "i4", day: "2026-08-11", muscles: ["kuiten"] }),
      ],
      today,
    );
    expect(load).toEqual({
      quadriceps: 2 * INTERVALS_SESSION_SETS,
      bilspieren: INTERVALS_SESSION_SETS,
    });
  });

  it("geeft niets voor een sessie zonder aangetikte spieren", () => {
    expect(intervalsWeekLoad([session()], today)).toEqual({});
  });
});

describe("mergeLoad", () => {
  it("telt per groep op", () => {
    expect(mergeLoad({ buik: 2, kuiten: 1 }, { buik: 3, borst: 1 })).toEqual({
      borst: 1,
      buik: 5,
      kuiten: 1,
    });
  });
});

describe("migratie 0292", () => {
  it("staat dezelfde spiergroepen toe als MUSCLE_GROUPS", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/0292_intervals_strength_muscles.sql"),
      "utf8",
    );
    const list = sql.match(/muscles <@ array\[([\s\S]*?)\]::text\[\]/)?.[1] ?? "";
    const groups = [...list.matchAll(/'([a-z]+)'/g)].map((match) => match[1]);
    expect(groups).toEqual([...MUSCLE_GROUPS]);
  });
});
