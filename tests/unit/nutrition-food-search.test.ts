import { describe, expect, it } from "vitest";

import { collectPages, compoundSplits, foodSearchTokens, rankFoods } from "@/lib/nutrition/food-search";

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

describe("collectPages", () => {
  const source = Array.from({ length: 278 }, (_, index) => index);
  const pageOf = (rows: number[]) => async (from: number, to: number) => rows.slice(from, to + 1);

  it("haalt door tot een pagina niet vol is", async () => {
    const calls: Array<[number, number]> = [];
    const rows = await collectPages(async (from, to) => {
      calls.push([from, to]);
      return source.slice(from, to + 1);
    }, 100);
    expect(rows).toEqual(source);
    expect(calls).toEqual([
      [0, 99],
      [100, 199],
      [200, 299],
    ]);
  });

  it("doet één verzoek als alles op de eerste pagina past", async () => {
    let calls = 0;
    const rows = await collectPages(async (from, to) => {
      calls += 1;
      return source.slice(from, to + 1);
    }, 500);
    expect(rows).toHaveLength(278);
    expect(calls).toBe(1);
  });

  it("vraagt een lege pagina op als het aantal precies een veelvoud is", async () => {
    expect(await collectPages(pageOf(source.slice(0, 200)), 100)).toHaveLength(200);
  });

  it("stopt bij het plafond", async () => {
    expect(await collectPages(async () => Array(100).fill(0), 100, 300)).toHaveLength(300);
  });

  it("houdt de beste treffer over die buiten de eerste tweehonderd op alfabet valt", async () => {
    const names = [
      ...Array.from({ length: 250 }, (_, index) => ({ name_nl: `Aardappel soort ${String(index).padStart(3, "0")} rauw` })),
      { name_nl: "Ui rauw" },
    ];
    const all = await collectPages(async (from, to) => names.slice(from, to + 1), 100);
    expect(rankFoods(all, ["rauw"])[0].name_nl).toBe("Ui rauw");
    expect(rankFoods(names.slice(0, 200), ["rauw"]).map((row) => row.name_nl)).not.toContain("Ui rauw");
  });
});
