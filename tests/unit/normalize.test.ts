import { describe, expect, it } from "vitest";
import { normalize, looksLikeMe, nameTokens } from "@/lib/text/normalize";

describe("normalize", () => {
  it("strikt bracket-/haakjes-annotaties en diacritieken weg, lowercased", () => {
    expect(normalize("Stéphane [ZWB]")).toBe("stephane");
    expect(normalize("Jan (A) Janssen")).toBe("jan janssen");
  });

  it("collapst witruimte en trimt", () => {
    expect(normalize("  Piet   Peters  ")).toBe("piet peters");
  });
});

describe("looksLikeMe", () => {
  it("matcht exact en bij contains aan beide kanten", () => {
    expect(looksLikeMe("Jan Janssen", "jan janssen")).toBe(true);
    expect(looksLikeMe("Jan Janssen", "Janssen")).toBe(true);
    expect(looksLikeMe("Janssen", "Jan Janssen")).toBe(true);
  });

  it("matcht niet bij losse, niet-overlappende namen", () => {
    expect(looksLikeMe("Jan Janssen", "Piet Peters")).toBe(false);
    expect(looksLikeMe("", "Jan")).toBe(false);
  });
});

describe("nameTokens", () => {
  it("levert alleen tokens van >=2 tekens", () => {
    expect(nameTokens("Casper C Carbaat")).toEqual(["casper", "carbaat"]);
  });

  it("is leeg bij alleen losse initialen", () => {
    expect(nameTokens("A B")).toEqual([]);
  });
});
