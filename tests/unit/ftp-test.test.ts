import { describe, expect, it } from "vitest";
import {
  asFtpTestType,
  ftpFromTest,
  ftpTestBlocks,
  ftpTestDurationMinutes,
  ftpTestTitle,
  profileFtpAfterChange,
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

describe("profileFtpAfterChange", () => {
  it("trekt het profiel mee als het aan de gecorrigeerde test hing", () => {
    // 554 W ramp gaf 416 W; na correctie naar 520 W is dat 390 W.
    expect(
      profileFtpAfterChange({ profileFtpWatts: 416, changedFtpWatts: 416, latestFtpWatts: 390 }),
    ).toEqual({ ftpWatts: 390, changed: true, withoutTest: false });
  });

  it("laat een profiel-FTP uit een andere bron met rust", () => {
    // Handmatig ingetypt of uit intervals.icu: een correctie in de historie mag
    // die niet stilzwijgend overschrijven.
    expect(
      profileFtpAfterChange({ profileFtpWatts: 300, changedFtpWatts: 416, latestFtpWatts: 390 }),
    ).toEqual({ ftpWatts: 300, changed: false, withoutTest: false });
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

  it("doet niets bij een profiel zonder FTP", () => {
    expect(
      profileFtpAfterChange({ profileFtpWatts: null, changedFtpWatts: 416, latestFtpWatts: 390 }),
    ).toEqual({ ftpWatts: null, changed: false, withoutTest: false });
  });
});
