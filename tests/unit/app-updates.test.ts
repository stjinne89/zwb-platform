import { describe, expect, it } from "vitest";
import {
  inPopupWindow,
  parseItems,
  publishAtFor,
  upcomingWeekStart,
  weekStartOf,
} from "@/lib/app-updates/schedule";

describe("weekStartOf", () => {
  it("geeft de maandag, ook op zondag", () => {
    expect(weekStartOf("2026-10-29")).toBe("2026-10-26");
    expect(weekStartOf("2026-10-26")).toBe("2026-10-26");
    expect(weekStartOf("2026-11-01")).toBe("2026-10-26");
  });
});

describe("publishAtFor", () => {
  it("is donderdag 17:00 Nederlandse tijd, in zomer- en wintertijd", () => {
    expect(publishAtFor("2026-10-19")).toBe("2026-10-22T15:00:00.000Z");
    expect(publishAtFor("2026-10-26")).toBe("2026-10-29T16:00:00.000Z");
  });
});

describe("upcomingWeekStart", () => {
  it("is deze week tot donderdag 17:00, daarna de volgende", () => {
    expect(upcomingWeekStart(new Date("2026-10-29T15:59:00Z"))).toBe("2026-10-26");
    expect(upcomingWeekStart(new Date("2026-10-29T16:00:00Z"))).toBe("2026-11-02");
    expect(upcomingWeekStart(new Date("2026-11-01T22:30:00Z"))).toBe("2026-11-02");
  });
});

describe("inPopupWindow", () => {
  const publishAt = "2026-10-29T16:00:00.000Z";

  it("opent vanaf het verschijnen, een week lang", () => {
    expect(inPopupWindow(publishAt, new Date("2026-10-29T15:59:59Z"))).toBe(false);
    expect(inPopupWindow(publishAt, new Date("2026-10-29T16:00:00Z"))).toBe(true);
    expect(inPopupWindow(publishAt, new Date("2026-11-05T15:59:00Z"))).toBe(true);
    expect(inPopupWindow(publishAt, new Date("2026-11-05T16:00:00Z"))).toBe(false);
  });
});

describe("parseItems", () => {
  it("maakt van elke regel een punt, zonder lege regels of opsommingstekens", () => {
    expect(parseItems("- Eerste\n\n* Tweede\r\n• Derde\n1. Vierde\n  Vijfde  ")).toEqual([
      "Eerste",
      "Tweede",
      "Derde",
      "Vierde",
      "Vijfde",
    ]);
  });

  it("laat een streepje midden in de tekst staan", () => {
    expect(parseItems("ZRL-uitslag sneller")).toEqual(["ZRL-uitslag sneller"]);
  });
});
