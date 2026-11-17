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

  it("zet een team boven 1,2 van de ladder; rood is wie buiten de grootste groep valt", () => {
    const check = checkLadderTeamZmap([rider("laag", 2.5), rider("mid", 4), rider("hoog", 4.7)]);
    expect(check.level).toBe("bad");
    expect(check.spread).toBe(2.2);
    expect(check.status["p:laag"]).toBe("out");
    expect(check.status["p:hoog"]).not.toBe("out");
    expect(check.room).toBeNull();
    expect(check.issues[0].text).toContain("2,20");
  });

  it("kiest bij gelijkspel de groep rond de mediaan", () => {
    const check = checkLadderTeamZmap([rider("a", 3), rider("b", 4), rider("c", 4.1), rider("d", 5.2)]);
    // [3,0–4,2] en [4,0–5,2] houden er allebei drie; de mediaan 4,05 ligt dichter bij 3,6 dan bij 4,6.
    expect(check.status["p:d"]).toBe("out");
    expect(check.status["p:a"]).not.toBe("out");
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

  it("is een risico binnen 0,11 van de rand, ook in het midden van de lijst", () => {
    // ZWBandits op 2026-11-17: ruimte 3,64–4,90.
    const check = checkLadderTeamZmap([
      rider("george", 3.7),
      rider("jeroen", 3.79),
      rider("stijn", 4.21),
      rider("harmen", 4.81),
      rider("gonda", 4.84),
    ]);
    expect(check.level).toBe("ok");
    expect(check.issues).toEqual([]);
    expect(check.room).toEqual([3.64, 4.9]);
    expect(check.status).toEqual({
      "p:george": "risk",
      "p:jeroen": "ok",
      "p:stijn": "ok",
      "p:harmen": "risk",
      "p:gonda": "risk",
    });
    const roomy = checkLadderTeamZmap([rider("a", 4.2), rider("b", 5.24)]);
    expect(Object.values(roomy.status)).toEqual(["ok", "ok"]);
  });

  it("geeft geen risico tegen de grens van 5,8 of 2,5", () => {
    const top = checkLadderTeamZmap([rider("pim", 6.98), rider("casper", 5.95), rider("mathijs", 4.66)]);
    expect(top.status).toEqual({ "p:pim": "ok", "p:casper": "ok", "p:mathijs": "risk" });
    const bottom = checkLadderTeamZmap([rider("a", 2.3), rider("b", 3.65)]);
    expect(bottom.status).toEqual({ "p:a": "ok", "p:b": "risk" });
  });

  it("waarschuwt bij renners zonder zMAP en rekent met de rest", () => {
    const check = checkLadderTeamZmap([rider("a", 4), rider("leeg", null)]);
    expect(check.level).toBe("ok");
    expect(check.issues[0].text).toContain("leeg");
    expect(check.status["p:leeg"]).toBe("unknown");
    expect(check.spread).toBe(0);
    expect(checkLadderTeamZmap([rider("leeg", null)]).spread).toBeNull();
  });

  it("meldt een leeg team", () => {
    expect(checkLadderTeamZmap([]).issues[0].text).toBe("Nog geen renners.");
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
