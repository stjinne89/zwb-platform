import { describe, expect, it } from "vitest";
import {
  ageOnBirthday,
  amsterdamWallTimeToIso,
  birthdayOccurrence,
  isLeapYear,
  nextBirthdayOccurrence,
  parseDateKey,
} from "@/lib/birthdays";

describe("parseDateKey", () => {
  it("accepteert een geldige datum", () => {
    expect(parseDateKey("1989-02-28")).toMatchObject({ year: 1989, month: 2, day: 28 });
  });

  it("weigert een onbestaande datum", () => {
    expect(parseDateKey("2021-02-30")).toBeNull();
    expect(parseDateKey("kapot")).toBeNull();
  });
});

describe("isLeapYear", () => {
  it("herkent schrikkeljaren", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2026)).toBe(false);
  });
});

describe("birthdayOccurrence", () => {
  it("schuift 29 feb naar 28 feb in een niet-schrikkeljaar", () => {
    expect(birthdayOccurrence("2000-02-29", 2026)?.dateKey).toBe("2026-02-28");
    expect(birthdayOccurrence("2000-02-29", 2028)?.dateKey).toBe("2028-02-29");
  });
});

describe("nextBirthdayOccurrence", () => {
  it("geeft de verjaardag van dit jaar als die nog komt of vandaag is", () => {
    expect(nextBirthdayOccurrence("1990-08-15", "2026-06-21")?.dateKey).toBe(
      "2026-08-15",
    );
    expect(nextBirthdayOccurrence("1990-06-21", "2026-06-21")?.dateKey).toBe(
      "2026-06-21",
    );
  });

  it("rolt door naar volgend jaar als de verjaardag al voorbij is", () => {
    expect(nextBirthdayOccurrence("1990-01-10", "2026-06-21")?.dateKey).toBe(
      "2027-01-10",
    );
  });
});

describe("ageOnBirthday", () => {
  it("rekent de leeftijd uit op het vieringsjaar", () => {
    expect(ageOnBirthday("1989-05-01", 2026)).toBe(37);
  });

  it("geeft null bij een toekomstig geboortejaar", () => {
    expect(ageOnBirthday("2030-05-01", 2026)).toBeNull();
  });
});

describe("amsterdamWallTimeToIso", () => {
  it("gebruikt de zomertijd-offset (CEST, +02:00)", () => {
    expect(amsterdamWallTimeToIso("2026-07-01", "12:00")).toBe(
      "2026-07-01T10:00:00.000Z",
    );
  });

  it("gebruikt de wintertijd-offset (CET, +01:00)", () => {
    expect(amsterdamWallTimeToIso("2026-01-01", "12:00")).toBe(
      "2026-01-01T11:00:00.000Z",
    );
  });

  it("geeft null bij een ongeldige tijd", () => {
    expect(amsterdamWallTimeToIso("2026-01-01", "kwart over")).toBeNull();
  });
});
