import { describe, expect, it } from "vitest";
import {
  asFtpTestType,
  ftpFromTest,
  ftpTestBlocks,
  ftpTestDurationMinutes,
  ftpTestTitle,
} from "@/lib/training/ftp-test";

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
