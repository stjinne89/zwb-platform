import { describe, expect, it } from "vitest";
import {
  inPopupWindow,
  parseItems,
  publishAtFor,
  upcomingWeekStart,
  weekStartOf,
} from "@/lib/app-updates/schedule";
import { roundsBetween } from "@/lib/app-updates/plan-rounds";
import { INPUT_MAX, parseDraft, roundsInput } from "@/lib/app-updates/auto";

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

describe("roundsBetween", () => {
  const plan = [
    "## Chronologisch werkplan",
    "",
    "### Gebouwd — Rit invoeren",
    "",
    "**2026-10-30.** Commit `abc`.",
    "Leden voeren een rit in.",
    "",
    "### Onderzocht — Iets uitzoeken",
    "",
    "**2026-10-29.** Alleen onderzoek.",
    "",
    "> **Eventpagina: knoppen op mobiel, 2026-10-24 — gebouwd; gepusht.**",
    ">",
    "> **Waarom.** Knoppen vielen weg.",
    "",
    "### Gebouwd — Zonder datum",
    "",
    "Geen datum hier.",
    "",
    "## Historische roadmap",
    "",
    "Losse tekst die niet bij een ronde hoort, 2026-10-25.",
  ].join("\n");

  it("vindt beide vormen, zonder onderzoek of rondes zonder datum", () => {
    expect(roundsBetween(plan, "2026-10-23", "2026-10-30").map((r) => [r.date, r.title])).toEqual([
      ["2026-10-24", "Eventpagina: knoppen op mobiel"],
      ["2026-10-30", "Gebouwd — Rit invoeren"],
    ]);
  });

  it("neemt de tekst van de ronde mee tot de volgende kop", () => {
    const [round] = roundsBetween(plan, "2026-10-30", "2026-10-30");
    expect(round.text).toContain("Leden voeren een rit in.");
    expect(round.text).not.toContain("Onderzocht");
  });

  it("houdt zich aan het venster", () => {
    expect(roundsBetween(plan, "2026-10-25", "2026-10-29")).toEqual([]);
  });
});

describe("parseDraft", () => {
  it("schoont het antwoord op", () => {
    expect(
      parseDraft(JSON.stringify({ summary: "  Deze week: rit invoeren.  ", changes: [" Rit invoeren ", ""], fixes: [3] })),
    ).toEqual({ summary: "Deze week: rit invoeren.", changes: ["Rit invoeren"], fixes: [] });
  });

  it("geeft null bij niets voor leden of kapotte JSON", () => {
    expect(parseDraft(JSON.stringify({ summary: "", changes: [], fixes: [] }))).toBeNull();
    expect(parseDraft("geen json")).toBeNull();
  });

  it("knipt te lange teksten en te veel punten af", () => {
    const draft = parseDraft(
      JSON.stringify({ summary: "x".repeat(500), changes: Array(40).fill("y".repeat(300)), fixes: ["z"] }),
    )!;
    expect(draft.summary).toHaveLength(400);
    expect(draft.changes).toHaveLength(30);
    expect(draft.changes[0]).toHaveLength(200);
    expect(draft.fixes).toEqual([]);
  });
});

describe("roundsInput", () => {
  it("kort elke ronde in als het geheel te groot is", () => {
    const rounds = Array.from({ length: 4 }, (_, i) => ({ date: "2026-10-30", title: `R${i}`, text: "a".repeat(INPUT_MAX) }));
    expect(roundsInput(rounds).length).toBeLessThan(INPUT_MAX + 100);
  });
});
