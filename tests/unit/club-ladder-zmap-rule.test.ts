import { describe, expect, it } from "vitest";
import {
  cappedZmap,
  checkLadderTeamZmap,
  formatWkg,
  median,
  sortByZmap,
  type ZmapRider,
} from "@/lib/club-ladder/zmap-rule";

function rider(name: string, zmap: number | null, source: "estimate" | "wtrl" = "estimate"): ZmapRider {
  return { key: `p:${name}`, name, zmap: zmap == null ? null : { value: zmap, source } };
}

describe("checkLadderTeamZmap", () => {
  it("laat precies 1,2 passen (voorbeeld uit de aankondiging)", () => {
    const check = checkLadderTeamZmap([rider("laag", 3.5), rider("hoog", 4.7)]);
    expect(check.spread).toBe(1.2);
    expect(check.issues.some((issue) => issue.level === "bad")).toBe(false);
  });

  it("zet een team boven 1,2 van de ladder en wijst de uitersten aan", () => {
    const check = checkLadderTeamZmap([rider("laag", 2.5), rider("mid", 4), rider("hoog", 4.7)]);
    expect(check.level).toBe("bad");
    expect(check.spread).toBe(2.2);
    expect(check.outKeys).toEqual(["p:laag", "p:hoog"]);
    expect(check.room).toBeNull();
    expect(check.issues[0].text).toContain("2,20");
  });

  it("telt 5,8 en hoger als 5,8 en 2,5 en lager als 2,5", () => {
    expect(cappedZmap(6.5)).toBe(5.8);
    expect(cappedZmap(2.1)).toBe(2.5);
    const top = checkLadderTeamZmap([rider("a", 6.98), rider("b", 5.95), rider("c", 4.66)]);
    expect(top.spread).toBe(1.14);
    const bottom = checkLadderTeamZmap([rider("a", 1.9), rider("b", 3.6)]);
    expect(bottom.spread).toBe(1.1);
  });

  it("rekent de mediaan op de echte waarden, zonder grenzen", () => {
    expect(checkLadderTeamZmap([rider("a", 7), rider("b", 6), rider("c", 5.5)]).median).toBe(6);
    expect(median([4.25, 4.3, 4, 4.5])).toBe(4.28);
    expect(median([])).toBeNull();
  });

  it("toont tussen welke zMAP er nog iemand bij past", () => {
    expect(checkLadderTeamZmap([rider("a", 4), rider("b", 4.5)]).room).toEqual([3.3, 5.2]);
    expect(checkLadderTeamZmap([rider("a", 5.5)]).room).toEqual([4.3, 5.8]);
    // Boven 5,8 telt als 5,8: de ruimte rekent vanaf 5,8.
    expect(checkLadderTeamZmap([rider("a", 7)]).room).toEqual([4.6, 5.8]);
    expect(checkLadderTeamZmap([rider("a", 3)]).room).toEqual([2.5, 4.2]);
  });

  it("is krap binnen de foutmarge van de schatting", () => {
    const check = checkLadderTeamZmap([rider("a", 3.7), rider("b", 4.84)]);
    expect(check.level).toBe("warn");
    expect(check.issues[0].text).toContain("krap");
    expect(checkLadderTeamZmap([rider("a", 3.7), rider("b", 4.68)]).level).toBe("ok");
  });

  it("waarschuwt bij renners zonder zMAP en rekent met de rest", () => {
    const check = checkLadderTeamZmap([rider("a", 4), rider("leeg", null)]);
    expect(check.level).toBe("warn");
    expect(check.unknownKeys).toEqual(["p:leeg"]);
    expect(check.spread).toBe(0);
    expect(checkLadderTeamZmap([rider("leeg", null)]).spread).toBeNull();
  });

  it("waarschuwt bij een leeg team", () => {
    expect(checkLadderTeamZmap([]).level).toBe("warn");
  });
});

describe("hulpjes", () => {
  it("sorteert op zMAP, zonder zMAP onderaan", () => {
    expect(sortByZmap([rider("z", null), rider("b", 4), rider("a", 4), rider("c", 5)]).map((r) => r.name)).toEqual([
      "c",
      "a",
      "b",
      "z",
    ]);
  });

  it("schrijft w/kg met een komma", () => {
    expect(formatWkg(1.2)).toBe("1,20");
  });
});
