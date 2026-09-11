import { describe, expect, it } from "vitest";
import {
  asFtpTestType,
  ftpFromTest,
  ftpTestBlocks,
  ftpTestDurationMinutes,
  ftpTestTitle,
  pickFtpTestState,
  profileFtpAfterChange,
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

describe("profileFtpAfterChange", () => {
  it("trekt het profiel mee als het aan de gecorrigeerde test hing", () => {
    // 554 W ramp gaf 416 W; na correctie naar 520 W is dat 390 W.
    expect(
      profileFtpAfterChange({ profileFtpWatts: 416, changedFtpWatts: 416, latestFtpWatts: 390 }),
    ).toEqual({ ftpWatts: 390, changed: true, withoutTest: false });
  });

  it("zet ook een handmatige of intervals-waarde op de nieuwste test", () => {
    // Afgesproken voorrang (11 september 2026): test, dan intervals.icu, dan
    // het profiel. Een getal uit een andere bron wijkt dus voor de test.
    expect(
      profileFtpAfterChange({ profileFtpWatts: 300, changedFtpWatts: 416, latestFtpWatts: 390 }),
    ).toEqual({ ftpWatts: 390, changed: true, withoutTest: false });
  });

  it("valt bij verwijderen terug op de test die overblijft", () => {
    expect(
      profileFtpAfterChange({ profileFtpWatts: 416, changedFtpWatts: 416, latestFtpWatts: 380 }),
    ).toEqual({ ftpWatts: 380, changed: true, withoutTest: false });
  });

  it("laat de FTP staan als er geen test meer over is", () => {
    // Leeghalen is schadelijker dan een verouderd getal: elk wattage in het
    // schema hangt eraan. Het lid krijgt het wel te zien.
    expect(
      profileFtpAfterChange({ profileFtpWatts: 416, changedFtpWatts: 416, latestFtpWatts: null }),
    ).toEqual({ ftpWatts: 416, changed: false, withoutTest: true });
  });

  it("schrijft niets als de nieuwste test dezelfde FTP oplevert", () => {
    expect(
      profileFtpAfterChange({ profileFtpWatts: 416, changedFtpWatts: 416, latestFtpWatts: 416 }),
    ).toEqual({ ftpWatts: 416, changed: false, withoutTest: false });
  });

  it("vult een profiel zonder FTP met de nieuwste test", () => {
    expect(
      profileFtpAfterChange({ profileFtpWatts: null, changedFtpWatts: 416, latestFtpWatts: 390 }),
    ).toEqual({ ftpWatts: 390, changed: true, withoutTest: false });
  });

  it("meldt alleen een profiel zonder test als het aan de verwijderde test hing", () => {
    expect(
      profileFtpAfterChange({ profileFtpWatts: 300, changedFtpWatts: 416, latestFtpWatts: null }),
    ).toEqual({ ftpWatts: 300, changed: false, withoutTest: false });
  });
});
