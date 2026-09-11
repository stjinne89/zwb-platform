import { describe, expect, it } from "vitest";
import {
  asFtpTestType,
  ftpFromTest,
  ftpTestBlocks,
  ftpTestDurationMinutes,
  ftpTestTitle,
  dropWorkoutsOnTestDays,
  pickFtpTestState,
  type FtpTestWorkout,
} from "@/lib/training/ftp-test";

function test(
  workoutId: string,
  date: string,
  status = "planned",
  origin = "member",
): FtpTestWorkout {
  return { workoutId, date, testType: "ramp", status, origin };
}

describe("dropWorkoutsOnTestDays", () => {
  it("laat op een testdag geen tweede training staan", () => {
    const kept = dropWorkoutsOnTestDays(
      [
        { date: "2026-09-09", title: "Duur" },
        { date: "2026-09-10", title: "Sweet spot" },
        { date: "2026-09-11", title: "Herstel" },
      ],
      new Set(["2026-09-10"]),
    );
    expect(kept.map((workout) => workout.title)).toEqual(["Duur", "Herstel"]);
  });
});

describe("pickFtpTestState", () => {
  const today = "2026-09-11";

  it("laat een door de ritsync afgeronde test toch op een uitslag wachten", () => {
    const state = pickFtpTestState([test("a", "2026-09-10", "completed")], [], today);
    expect(state.awaitingResult?.workoutId).toBe("a");
  });

  it("volgt Barts situatie: oude uitslag, twee tests zonder uitslag", () => {
    const state = pickFtpTestState(
      [
        test("aug", "2026-08-21", "completed"),
        test("sep3", "2026-09-03", "completed"),
        test("sep10", "2026-09-10", "completed"),
        test("sep10-bieb", "2026-09-10", "completed", "ai"),
      ],
      // De uitslag hangt aan de augustustest; de testdatum telt dan niet.
      [{ workoutId: "aug", testedOn: "2026-09-10" }],
      today,
    );
    expect(state.awaitingResult?.workoutId).toBe("sep10");
  });

  it("vraagt na een uitslag niet meer om de kopie op dezelfde dag of een oudere test", () => {
    const state = pickFtpTestState(
      [
        test("sep3", "2026-09-03", "completed"),
        test("sep10", "2026-09-10", "completed"),
        test("sep10-bieb", "2026-09-10", "completed", "ai"),
      ],
      [{ workoutId: "sep10", testedOn: "2026-09-10" }],
      today,
    );
    expect(state.awaitingResult).toBeNull();
  });

  it("laat een losse uitslag de test van die dag dekken", () => {
    const state = pickFtpTestState(
      [test("sep10", "2026-09-10", "completed")],
      [{ workoutId: null, testedOn: "2026-09-10" }],
      today,
    );
    expect(state.awaitingResult).toBeNull();
  });

  it("slaat een test over die als rustdag is geschrapt", () => {
    const state = pickFtpTestState([test("a", "2026-09-10", "skipped")], [], today);
    expect(state.awaitingResult).toBeNull();
  });

  it("toont een geplande test in de toekomst als volgende", () => {
    const state = pickFtpTestState([test("next", "2026-09-20")], [], today);
    expect(state.upcoming?.workoutId).toBe("next");
    expect(state.awaitingResult).toBeNull();
  });
});

describe("ftpFromTest", () => {
  it("rekent een ramptest op 75% van het hoogste minuutvermogen", () => {
    expect(ftpFromTest("ramp", 320)).toBe(240);
  });

  it("rekent een 20-minutentest op 95% van het gemiddelde", () => {
    expect(ftpFromTest("twenty_min", 260)).toBe(247);
  });

  it("rondt af op hele watts", () => {
    expect(Number.isInteger(ftpFromTest("ramp", 333))).toBe(true);
  });
});

describe("asFtpTestType", () => {
  it("laat de twee protocollen door", () => {
    expect(asFtpTestType("ramp")).toBe("ramp");
    expect(asFtpTestType("twenty_min")).toBe("twenty_min");
  });

  it("weigert al het andere", () => {
    expect(asFtpTestType("kuurtest")).toBeNull();
    expect(asFtpTestType(null)).toBeNull();
    expect(asFtpTestType("")).toBeNull();
  });
});

describe("ftpTestBlocks", () => {
  it("begint met inrijden en eindigt met uitrijden", () => {
    for (const type of ["ramp", "twenty_min"] as const) {
      const blocks = ftpTestBlocks(type);
      expect(blocks[0].label).toBe("Inrijden");
      expect(blocks[blocks.length - 1].label).toBe("Uitrijden");
    }
  });

  it("heeft een duur die optelt tot wat het schema reserveert", () => {
    for (const type of ["ramp", "twenty_min"] as const) {
      const total = ftpTestBlocks(type).reduce((sum, block) => sum + block.durationMinutes, 0);
      expect(ftpTestDurationMinutes(type)).toBe(total);
    }
  });

  it("houdt de 20-minutentest ook echt twintig minuten lang", () => {
    const test = ftpTestBlocks("twenty_min").find((block) => block.label === "Test");
    expect(test?.durationMinutes).toBe(20);
  });
});

describe("ftpTestTitle", () => {
  it("benoemt het protocol in de titel", () => {
    expect(ftpTestTitle("ramp")).toContain("ramp");
    expect(ftpTestTitle("twenty_min")).toContain("20 min");
  });
});
