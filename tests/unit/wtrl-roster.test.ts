import { describe, expect, it } from "vitest";
import {
  fitsDivision,
  parseDivision,
  parseWtrlTeams,
  prettyName,
  recommendedDivision,
  wtrlCategory,
} from "@/lib/teams/wtrl-roster";

// Het formaat van WTRL "My Teams" (2026-09-22), met verzonnen renners. De
// waarden komen uit de echte plak, zodat de randgevallen erin zitten: A via
// alleen zMAP, B Dev, een uitnodiging, "4W/kg" zonder decimalen, en Womens.
function rider(cat: string, name: string, id: string, status: string, ftpWkg: string, ftpW: string, mapWkg: string) {
  return [
    cat,
    name,
    `#${id} • ${status}`,
    "",
    "zFTPW/kg",
    `${ftpWkg}W/kg`,
    "Teams",
    "0",
    "zFTPW",
    `${ftpW}W`,
    "Points",
    "0",
    "zMAPW/kg",
    `${mapWkg}W/kg`,
    "Races",
    "0/0",
  ].join("\n");
}

function team(name: string, trc: string, division: string, captain: string, riders: string[]) {
  return [
    name,
    "TRC Ref",
    trc,
    "Season",
    "2026/27",
    "Rounds",
    "1, 2, 3, 4",
    "Division",
    division,
    "Team Jersey",
    "ZWB Cycling",
    "Next Race",
    "ROT Tue 22 Sept, 20:04",
    `Captain ${captain}`,
    "Managers Test Manager , ZWB Manager",
    "Registered By ZWB Manager",
    ...riders,
  ].join("\n");
}

const PASTE = [
  team("ZWB Cycling A", "1/1", "Open Aqua League Division A1", "Anna de Vries", [
    rider("A", "ANNA DE VRIES", "101", "MEMBER", "3.51", "284", "5.14"),
    rider("B", "BERT VAN DER BERG", "102", "MEMBER", "3.65", "252", "4.88"),
  ]),
  "",
  team("ZWB Cycling B Dev", "2/2", "Open Aqua Dev League Division B3", "Cor Jansen", [
    rider("B", "COR JANSEN", "201", "MEMBER", "3.17", "260", "4.21"),
    rider("C", "DIRK SMIT", "202", "INVITED", "3.06", "251", "3.68"),
  ]),
  "",
  team("ZWB Zwiftladies", "3/3", "Womens Mint League Division B1", "Eva Bakker", [
    rider("C", "EVA BAKKER", "301", "MEMBER", "3.26", "264", "4"),
    rider("B", "FLOOR DE WIT", "302", "MEMBER", "3.73", "194", "4.67"),
  ]),
].join("\n");

describe("parseWtrlTeams", () => {
  const teams = parseWtrlTeams(PASTE);

  it("leest elk team met zijn gegevens", () => {
    expect(teams.map((t) => [t.name, t.trcRef, t.season, t.division, t.captain])).toEqual([
      ["ZWB Cycling A", "1/1", "2026/27", "Open Aqua League Division A1", "Anna de Vries"],
      ["ZWB Cycling B Dev", "2/2", "2026/27", "Open Aqua Dev League Division B3", "Cor Jansen"],
      ["ZWB Zwiftladies", "3/3", "2026/27", "Womens Mint League Division B1", "Eva Bakker"],
    ]);
  });

  it("leest de renners met status en vermogen", () => {
    expect(teams[1].riders).toEqual([
      { zwiftId: "201", name: "Cor Jansen", category: "B", status: "member", zftpWkg: 3.17, zftpW: 260, zmapWkg: 4.21 },
      { zwiftId: "202", name: "Dirk Smit", category: "C", status: "invited", zftpWkg: 3.06, zftpW: 251, zmapWkg: 3.68 },
    ]);
    expect(teams[2].riders[0].zmapWkg).toBe(4);
  });

  it("rekent dezelfde categorie uit als WTRL toont", () => {
    for (const t of teams) {
      const division = parseDivision(t.division)!;
      for (const r of t.riders) expect(wtrlCategory(r, division.women)).toBe(r.category);
    }
  });

  it("geeft niets terug voor tekst zonder team", () => {
    expect(parseWtrlTeams("zomaar wat tekst")).toEqual([]);
  });
});

describe("divisies", () => {
  it("leest de divisie uit het label", () => {
    expect(parseDivision("Open Aqua Dev League Division B3")).toEqual({
      category: "B",
      development: true,
      women: false,
    });
    expect(parseDivision("Womens Mint League Division B1")).toEqual({
      category: "B",
      development: false,
      women: true,
    });
    expect(parseDivision("iets anders")).toBeNull();
  });

  it("A via alleen zMAP, met Dev-advies onder de grens", () => {
    const power = { zftpW: 284, zftpWkg: 3.51, zmapWkg: 5.14 };
    expect(wtrlCategory(power, false)).toBe("A");
    expect(recommendedDivision(power, false)).toBe("A Dev");
  });

  it("de wattvloer houdt een lichte renner in een lagere categorie (Open)", () => {
    // 3,5 w/kg maar 190 W: onder de B-vloer van 200 W.
    expect(wtrlCategory({ zftpW: 190, zftpWkg: 3.5, zmapWkg: 4.0 }, false)).toBe("C");
    // Bij de vrouwen geen vloer.
    expect(wtrlCategory({ zftpW: 190, zftpWkg: 3.5, zmapWkg: 4.0 }, true)).toBe("B");
  });

  it("hoger rijden mag, lager niet, en Dev heeft een plafond", () => {
    const bDev = parseDivision("Open Aqua Dev League Division B3")!;
    const b = parseDivision("Open Aqua League Division B2")!;
    const strongB = { zftpW: 292, zftpWkg: 4.06, zmapWkg: 4.81 };
    const c = { zftpW: 251, zftpWkg: 3.06, zmapWkg: 3.68 };
    const a = { zftpW: 346, zftpWkg: 5.02, zmapWkg: 6.06 };
    expect(fitsDivision(strongB, b)).toBe(true);
    expect(fitsDivision(strongB, bDev)).toBe(false);
    expect(fitsDivision(c, bDev)).toBe(true);
    expect(fitsDivision(a, b)).toBe(false);
  });
});

describe("prettyName", () => {
  it("zet hoofdletters goed en laat tussenvoegsels klein", () => {
    expect(prettyName("PIM DE MEULEMEESTER")).toBe("Pim de Meulemeester");
    expect(prettyName("JAN VAN DER WOUDE")).toBe("Jan van der Woude");
    expect(prettyName("ANNE-MARIE O'BRIEN")).toBe("Anne-Marie O'Brien");
  });
});
