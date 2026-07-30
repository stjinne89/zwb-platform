import { describe, expect, it } from "vitest";
import { intervalsWeekStart, intervalsWeekUrl } from "@/lib/intervals/links";

describe("intervalsWeekStart", () => {
  it("geeft de maandag van de week", () => {
    // 30 juli 2026 is een donderdag; die week begint op maandag 27 juli.
    expect(intervalsWeekStart("2026-07-30")).toBe("2026-07-27");
  });

  it("laat een maandag staan", () => {
    expect(intervalsWeekStart("2026-07-27")).toBe("2026-07-27");
  });

  it("rekent zondag terug naar de maandag ervóór", () => {
    expect(intervalsWeekStart("2026-08-02")).toBe("2026-07-27");
  });

  it("werkt over een maand- en jaargrens", () => {
    expect(intervalsWeekStart("2026-03-01")).toBe("2026-02-23");
    expect(intervalsWeekStart("2027-01-01")).toBe("2026-12-28");
  });

  it("negeert een tijdcomponent", () => {
    expect(intervalsWeekStart("2026-07-30T09:00:00+02:00")).toBe("2026-07-27");
  });

  it("geeft een onbruikbare datum ongewijzigd terug", () => {
    expect(intervalsWeekStart("geen-datum")).toBe("geen-datum");
  });
});

describe("intervalsWeekUrl", () => {
  it("bouwt de weekweergave van een athlete", () => {
    expect(intervalsWeekUrl("i77109", "2026-07-30")).toBe(
      "https://intervals.icu/athlete/i77109/activities?w=2026-07-27",
    );
  });

  it("gebruikt /athlete (enkelvoud) en /activities, niet /athletes of /calendar", () => {
    const url = intervalsWeekUrl("i77109", "2026-07-30");
    expect(url).not.toContain("/athletes/");
    expect(url).not.toContain("/calendar");
  });

  it("valt terug op de generieke URL zonder athlete-id", () => {
    expect(intervalsWeekUrl(null, "2026-07-30")).toBe(
      "https://intervals.icu/activities?w=2026-07-27",
    );
  });

  it("laat de week weg zonder datum", () => {
    expect(intervalsWeekUrl("i77109")).toBe(
      "https://intervals.icu/athlete/i77109/activities",
    );
  });
});
