import { describe, expect, it } from "vitest";
import {
  DEFAULT_KOPMAN,
  KOPMAN_HAIR_COLORS,
  KOPMAN_HELMET_COUNT,
  KOPMAN_SKINS,
  kopmanColors,
  kopmanFace,
  kopmanHelmets,
  kopmanMood,
  parseKopman,
  shade,
} from "@/lib/youtube-live/kopman";
import { tenueInks } from "@/lib/youtube-live/overlay-styles";

describe("parseKopman", () => {
  it("neemt een geldige figuur over", () => {
    const look = { body: "vrouw", skin: 4, hair: 2, hairColor: 6, facial: 0, glasses: 2, helmet: 5 };
    expect(parseKopman(look)).toEqual(look);
  });

  it("weigert wat geen figuur is", () => {
    expect(parseKopman(null)).toBeNull();
    expect(parseKopman("man")).toBeNull();
    expect(parseKopman([])).toBeNull();
    expect(parseKopman({ body: "kind" })).toBeNull();
  });

  it("zet onbekende keuzes terug op een vaste waarde", () => {
    expect(parseKopman({ body: "man", skin: 99, hair: -1, hairColor: 1.5, facial: "baard", glasses: 7, helmet: 8 })).toEqual({
      body: "man",
      skin: DEFAULT_KOPMAN.skin,
      hair: 0,
      hairColor: DEFAULT_KOPMAN.hairColor,
      facial: 0,
      glasses: 0,
      helmet: 0,
    });
  });

  it("geeft een vrouw geen gezichtshaar en neemt geen losse velden mee", () => {
    expect(parseKopman({ body: "vrouw", skin: 0, hair: 1, hairColor: 0, facial: 3, glasses: 0, naam: "x" })).toEqual({
      body: "vrouw",
      skin: 0,
      hair: 1,
      hairColor: 0,
      facial: 0,
      glasses: 0,
      helmet: 0,
    });
  });

  it("een opgeslagen kopman van vóór de helmkleur krijgt de standaardhelm", () => {
    expect(parseKopman({ body: "man", skin: 1, hair: 0, hairColor: 1, facial: 0, glasses: 0 })?.helmet).toBe(0);
  });
});

describe("kopmanMood", () => {
  it("volgt de kleine regel van de overlay", () => {
    expect(kopmanMood("Begint zo · ZRL")).toBe("rust");
    expect(kopmanMood("Begint zo")).toBe("rust");
    expect(kopmanMood("Live · ZRL A1")).toBe("aanval");
    expect(kopmanMood("Live")).toBe("aanval");
    expect(kopmanMood("Uitslag · ZRL")).toBe("zege");
    expect(kopmanMood("Afgelopen")).toBe("zege");
  });
});

describe("kopmanFace", () => {
  it("haalt huid en haar uit de keuzes", () => {
    const face = kopmanFace({ ...DEFAULT_KOPMAN, skin: 5, hairColor: 6 });
    expect(face.skin).toBe(KOPMAN_SKINS[5]);
    expect(face.hair).toBe(KOPMAN_HAIR_COLORS[6].hex);
    expect(face.woman).toBe(false);
  });

  it("tekent een vrouw smaller", () => {
    const man = kopmanFace(DEFAULT_KOPMAN);
    const vrouw = kopmanFace({ ...DEFAULT_KOPMAN, body: "vrouw" });
    expect(vrouw.woman).toBe(true);
    expect(vrouw.shoulders).toBeLessThan(man.shoulders);
    expect(vrouw.jaw).toBeLessThan(man.jaw);
  });

  it("geeft donker haar inktzwarte wenkbrauwen, licht haar een donkere tint", () => {
    expect(kopmanFace({ ...DEFAULT_KOPMAN, hairColor: 0 }).brow).toBe("#1b1712");
    const blond = kopmanFace({ ...DEFAULT_KOPMAN, hairColor: 5 });
    expect(blond.brow).not.toBe(blond.hair);
    expect(blond.brow).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("kopmanColors", () => {
  it("neemt het tenue van strip", () => {
    const t = tenueInks(null);
    const c = kopmanColors(t);
    expect(c.jersey).toBe(t.petrol);
    expect(c.gold).toBe(t.gold);
    expect(c.sky).toBe(t.page);
  });

  it("kiest de helm, met een bies die op goud niet wegvalt", () => {
    const t = tenueInks(null);
    expect(kopmanColors(t).helmet).toBe(t.ink);
    expect(kopmanColors(t, { helmet: 5 }).helmet).toBe(kopmanHelmets(t)[5].hex);
    expect(kopmanColors(t, { helmet: 0 }).helmetBand).toBe(t.gold);
    expect(kopmanColors(t, { helmet: 4 }).helmetBand).toBe(t.petrol);
    expect(kopmanHelmets(t)).toHaveLength(KOPMAN_HELMET_COUNT);
  });

  it("shade schuift richting de inkt", () => {
    expect(shade("#ffffff", 0)).toBe("#ffffff");
    expect(shade("#ffffff", 1)).toBe("#1b1712");
  });
});
