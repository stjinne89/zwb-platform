import { describe, expect, it } from "vitest";
import { parseClubLadderSummary } from "@/lib/club-ladder/summary";
import { dayRow, fixtureRow, ladderRow, ladderSection, summaryPage } from "../fixtures/club-ladder";

const HTML = summaryPage(
  [
    dayRow("Today"),
    fixtureRow("23:30", "Rocksteady Rhinos", "ZWBeasts", "Glasgow Crit Circuit", ["FEATHER", "AERO"]),
    dayRow("2026-10-27"),
    fixtureRow("0:30", "SISU Kiivetä", "DIRTy Dealerz", "Loop de loop de loop", [], false),
  ],
  [
    ladderSection("EMEA", [
      ladderRow(1, "Cryo-Gen Handlebar Heroes", ["DEFEND", "WIN", "DEFEND", "WIN", "DEFEND"], { cls: "upMove" }),
      ladderRow(2, "Foudre Reblochon", ["WIN", "LOSS", "WIN"], { cls: "upMove", steps: 2 }),
      ladderRow(3, "ZWBeasts", ["LOSS", "", ""], { cls: "downMove", steps: 4, zombie: true }),
      ladderRow(4, "Vegan Vanguard", [], { cls: "staticMove" }),
    ]),
    ladderSection("WOMENS", [ladderRow(1, "ZWB Zwiftladies", ["WIN"], { cls: "staticMove" })]),
    ladderSection("World", [ladderRow(1, "Cryo-Gen Handlebar Heroes", ["WIN"], { cls: "upMove" })], true),
  ],
);

describe("parseClubLadderSummary", () => {
  const summary = parseClubLadderSummary(HTML, new Date("2026-10-26T20:00:00Z"));

  it("leest per regio positie en naam, zonder de World-ladder", () => {
    expect(summary.standings.map((row) => [row.region, row.position, row.name])).toEqual([
      ["EMEA", 1, "Cryo-Gen Handlebar Heroes"],
      ["EMEA", 2, "Foudre Reblochon"],
      ["EMEA", 3, "ZWBeasts"],
      ["EMEA", 4, "Vegan Vanguard"],
      ["WOMENS", 1, "ZWB Zwiftladies"],
    ]);
  });

  it("leest de vorm uit de blokjes: verdedigd is W, lege blokjes tellen niet", () => {
    const [heroes, foudre, beasts, vegan] = summary.standings;
    expect(heroes.form).toEqual(["W", "W", "W", "W", "W"]);
    expect(foudre.form).toEqual(["W", "L", "W"]);
    expect(beasts.form).toEqual(["L"]);
    expect(vegan.form).toEqual([]);
  });

  it("leest stijging en daling, zonder de zombie", () => {
    expect(summary.standings.map((row) => row.move)).toEqual(["▲", "▲ 2", "▼ 4", "=", "="]);
  });

  it("leest wedstrijden met datum, ploegen, route en powerups", () => {
    expect(summary.fixtures).toEqual([
      {
        date: "2026-10-26",
        time: "23:30",
        startsAt: "2026-10-26T23:30:00Z",
        home: "Rocksteady Rhinos",
        away: "ZWBeasts",
        route: "Glasgow Crit Circuit",
        powerups: ["FEATHER", "AERO"],
      },
      {
        date: "2026-10-27",
        time: "0:30",
        startsAt: "2026-10-27T00:30:00Z",
        home: "SISU Kiivetä",
        away: "DIRTy Dealerz",
        route: "Loop de loop de loop",
        powerups: [],
      },
    ]);
  });

  it("geeft een lege stand als de opmaak onbekend is", () => {
    const empty = parseClubLadderSummary("<html><body><table><tr><td>1</td><td>Team</td></tr></table></body></html>");
    expect(empty.standings).toEqual([]);
    expect(empty.fixtures).toEqual([]);
  });
});
