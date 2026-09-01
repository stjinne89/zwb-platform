import { describe, expect, it } from "vitest";
import {
  buildAssumptions,
  checkStaleness,
  type PlanAssumptions,
} from "@/lib/pacing/staleness";

const BASE = {
  cpWatts: 280,
  wPrimeJoules: 20_000,
  ftpWatts: 290,
  weightKg: 70,
  cpSource: "intervals",
  routeSyncedAt: "2026-08-31T10:00:00.000Z",
};

const ASSUMPTIONS: PlanAssumptions = buildAssumptions(BASE);

describe("buildAssumptions", () => {
  it("zet een tijdstempel op de aannames", () => {
    expect(Date.parse(ASSUMPTIONS.computedAt)).not.toBeNaN();
    expect(ASSUMPTIONS.cpWatts).toBe(280);
  });
});

describe("checkStaleness", () => {
  it("noemt een ongewijzigd plan niet verouderd", () => {
    expect(checkStaleness(ASSUMPTIONS, BASE).stale).toBe(false);
  });

  it("negeert ruis onder de drempel", () => {
    const result = checkStaleness(ASSUMPTIONS, {
      ...BASE,
      cpWatts: 283,
      weightKg: 70.4,
      wPrimeJoules: 20_500,
    });
    expect(result.stale).toBe(false);
  });

  it("slaat aan op een echte CP-verandering", () => {
    const result = checkStaleness(ASSUMPTIONS, { ...BASE, cpWatts: 300 });
    expect(result.reasons).toContain("cp");
    expect(result.messages[0]).toContain("300 W");
    expect(result.messages[0]).toContain("280 W");
  });

  it("slaat aan op een gewichtsverandering", () => {
    expect(checkStaleness(ASSUMPTIONS, { ...BASE, weightKg: 74 }).reasons).toContain(
      "gewicht",
    );
  });

  it("slaat aan op een gewijzigde anaerobe reserve", () => {
    expect(
      checkStaleness(ASSUMPTIONS, { ...BASE, wPrimeJoules: 24_000 }).reasons,
    ).toContain("wprime");
  });

  it("slaat aan op een opnieuw opgehaald routeprofiel", () => {
    const result = checkStaleness(ASSUMPTIONS, {
      ...BASE,
      routeSyncedAt: "2026-09-05T08:00:00.000Z",
    });
    expect(result.reasons).toContain("route");
  });

  it("kijkt alleen naar FTP als CP daaruit is afgeleid", () => {
    const fromIntervals = checkStaleness(ASSUMPTIONS, { ...BASE, ftpWatts: 320 });
    expect(fromIntervals.reasons).not.toContain("ftp");

    const fromFtp = checkStaleness(
      buildAssumptions({ ...BASE, cpSource: "ftp" }),
      { ...BASE, ftpWatts: 320 },
    );
    expect(fromFtp.reasons).toContain("ftp");
  });

  it("verzamelt meerdere redenen tegelijk", () => {
    const result = checkStaleness(ASSUMPTIONS, {
      ...BASE,
      cpWatts: 305,
      weightKg: 66,
    });
    expect(result.reasons).toEqual(expect.arrayContaining(["cp", "gewicht"]));
    expect(result.messages).toHaveLength(2);
  });

  it("noemt een plan zonder aannames niet verouderd", () => {
    expect(checkStaleness(null, BASE).stale).toBe(false);
  });
});
