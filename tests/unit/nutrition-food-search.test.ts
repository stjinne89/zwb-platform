import { describe, expect, it } from "vitest";

import { compoundSplits, foodSearchTokens, rankFoods } from "@/lib/nutrition/food-search";

describe("foodSearchTokens", () => {
  it("knipt op spaties en leestekens en laat losse letters weg", () => {
    expect(foodSearchTokens("  Halfvolle melk, 1 l ")).toEqual(["halfvolle", "melk"]);
  });

  it("houdt hooguit vier woorden over", () => {
    expect(foodSearchTokens("gedeeltelijk afgeroomde melk suiker cacao carrageen")).toHaveLength(4);
  });
});

describe("compoundSplits", () => {
  it("geeft de knip waarmee chocolademelk in NEVO te vinden is", () => {
    expect(compoundSplits("chocolademelk")).toContainEqual(["chocolade", "melk"]);
  });

  it("knipt geen stukken korter dan drie letters af", () => {
    expect(compoundSplits("melk")).toEqual([]);
    expect(compoundSplits("pindakaas").every(([a, b]) => a.length >= 3 && b.length >= 3)).toBe(true);
  });

  it("slaat een woord met andere tekens dan letters over", () => {
    expect(compoundSplits("m&m's")).toEqual([]);
  });
});

describe("rankFoods", () => {
  const rows = [
    { name_nl: "Biscuit m melkchocolade" },
    { name_nl: "Chocolade melk-" },
    { name_nl: "Melk halfvolle" },
    { name_nl: "Melk chocolade- halfvolle" },
  ];

  it("zet namen die met het zoekwoord beginnen voorop, kortste eerst", () => {
    expect(rankFoods(rows, ["melk"]).map((row) => row.name_nl)).toEqual([
      "Melk halfvolle",
      "Melk chocolade- halfvolle",
      "Chocolade melk-",
      "Biscuit m melkchocolade",
    ]);
  });

  it("kapt af op de limiet", () => {
    expect(rankFoods(rows, ["melk"], 2)).toHaveLength(2);
  });
});
