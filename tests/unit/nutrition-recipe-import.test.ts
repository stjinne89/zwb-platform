import { describe, expect, it } from "vitest";
import {
  cleanSourceUrl,
  guessRole,
  instructionBlocks,
  parseDuration,
  parseIngredientLine,
  parseServings,
  pickFood,
  recipeFromHtml,
  searchCandidates,
  singular,
  stepsMarkdown,
} from "@/lib/nutrition/recipe-import";

function page(jsonLd: unknown, head = "") {
  return `<html><head>${head}<script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head><body></body></html>`;
}

describe("recipeFromHtml", () => {
  it("leest een Recipe uit @graph, met sitenaam, foto en stappen", () => {
    const html = page(
      {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebSite", name: "Kookblog" },
          {
            "@type": "Recipe",
            name: "Pasta pesto | Kookblog",
            recipeYield: ["4", "4 personen"],
            prepTime: "PT10M",
            cookTime: "PT15M",
            image: [{ "@type": "ImageObject", url: "https://kookblog.nl/pasta.jpg" }],
            publisher: { "@type": "Organization", name: "Kookblog" },
            recipeIngredient: ["300 g volkoren pasta", "2 el pesto &amp; meer", "  "],
            recipeInstructions: [
              { "@type": "HowToStep", text: "Kook de pasta." },
              { "@type": "HowToStep", text: "Roer de pesto erdoor." },
            ],
          },
        ],
      },
      '<meta property="og:site_name" content="Iets anders">',
    );
    const recipe = recipeFromHtml(html, "https://www.kookblog.nl/pasta-pesto?utm_source=app#top");
    expect(recipe).toEqual({
      title: "Pasta pesto",
      servings: 4,
      minutes: 25,
      ingredients: ["300 g volkoren pasta", "2 el pesto & meer"],
      steps_md: "1. Kook de pasta.\n2. Roer de pesto erdoor.",
      image_url: "https://kookblog.nl/pasta.jpg",
      source_name: "Kookblog",
      source_url: "https://www.kookblog.nl/pasta-pesto",
    });
  });

  it("vindt een Recipe als mainEntity en valt terug op og-tags en de hostnaam", () => {
    const html = page(
      { "@type": "WebPage", mainEntity: { "@type": ["Recipe"], name: "Havermout", recipeIngredient: ["50 g havervlokken"] } },
      '<meta property="og:image" content="/havermout.jpg">',
    );
    const recipe = recipeFromHtml(html, "https://www.voorbeeld.nl/havermout");
    expect(recipe?.title).toBe("Havermout");
    expect(recipe?.image_url).toBe("https://www.voorbeeld.nl/havermout.jpg");
    expect(recipe?.source_name).toBe("voorbeeld.nl");
    expect(recipe?.servings).toBeNull();
    expect(recipe?.minutes).toBeNull();
  });

  it("geeft null zonder Recipe-data en slaat kapotte JSON-LD over", () => {
    const html = `<script type="application/ld+json">{kapot</script>${page({ "@type": "Article", name: "Nieuws" })}`;
    expect(recipeFromHtml(html, "https://voorbeeld.nl/")).toBeNull();
  });

  it("bewaart geen bron- of fotolink zonder https", () => {
    const html = page({ "@type": "Recipe", name: "Soep", image: "http://oud.nl/soep.jpg", recipeIngredient: ["1 ui"] });
    const recipe = recipeFromHtml(html, "http://oud.nl/soep");
    expect(recipe?.source_url).toBeNull();
    expect(recipe?.image_url).toBeNull();
    expect(recipe?.source_name).toBe("oud.nl");
  });
});

describe("tijd, porties en stappen", () => {
  it("rekent een ISO-duur om naar minuten", () => {
    expect(parseDuration("PT1H30M")).toBe(90);
    expect(parseDuration("P0DT0H45M")).toBe(45);
    expect(parseDuration("PT")).toBeNull();
    expect(parseDuration("30 minuten")).toBeNull();
  });

  it("haalt het aantal porties uit tekst, met een plafond van 20", () => {
    expect(parseServings("4 personen")).toBe(4);
    expect(parseServings(2)).toBe(2);
    expect(parseServings(["", "Voor 6"])).toBe(6);
    expect(parseServings("48 koekjes")).toBe(20);
    expect(parseServings(undefined)).toBeNull();
  });

  it("houdt onderdelen apart en nummert per onderdeel", () => {
    const blocks = instructionBlocks([
      { "@type": "HowToSection", name: "Saus", itemListElement: [{ "@type": "HowToStep", text: "Fruit de ui." }] },
      { "@type": "HowToSection", name: "Pasta", itemListElement: [{ text: "Kook." }, { text: "Giet af." }] },
    ]);
    expect(stepsMarkdown(blocks)).toBe("**Saus**\n\n1. Fruit de ui.\n\n**Pasta**\n\n1. Kook.\n2. Giet af.");
  });

  it("splitst één HTML-tekst in stappen zonder de oude nummering", () => {
    const blocks = instructionBlocks("<ol><li>1. Snijd de ui.</li><li>2. Bak hem.</li></ol>");
    expect(blocks).toEqual([{ title: null, steps: ["Snijd de ui.", "Bak hem."] }]);
  });

  it("laat het kopje weg als er maar één onderdeel is", () => {
    const blocks = instructionBlocks([{ "@type": "HowToSection", name: "Bereiding", itemListElement: ["Kook."] }]);
    expect(stepsMarkdown(blocks)).toBe("1. Kook.");
  });

  it("kapt lange bereidingen af op een hele stap", () => {
    const steps = Array.from({ length: 50 }, (_, index) => `Stap ${index} ${"x".repeat(40)}`);
    const text = stepsMarkdown([{ title: null, steps }], 500);
    expect(text.length).toBeLessThanOrEqual(500);
    expect(text.split("\n").every((line) => /^\d+\. Stap \d+ x+$/.test(line))).toBe(true);
  });
});

describe("parseIngredientLine", () => {
  it.each([
    ["200 g volkoren pasta", "volkoren pasta", 200],
    ["200g bloem", "bloem", 200],
    ["1,5 dl halfvolle melk", "halfvolle melk", 150],
    ["2 el olijfolie", "olijfolie", 30],
    ["1 tl zout", "zout", 5],
    ["½ kg aardappelen", "aardappelen", 500],
    ["1 1/2 kopje rijst", "rijst", 225],
    ["2-3 tomaten", "tomaten", 250],
    ["2 uien, gesnipperd", "uien", 200],
    ["3 eieren", "eieren", 165],
    ["2 teentjes knoflook", "knoflook", 10],
    ["1 blik tomatenblokjes (400 g)", "tomatenblokjes", 400],
    ["1 pak (500 g) penne", "penne", 500],
    ["snufje zout", "zout", 1],
  ])("%s", (line, name, grams) => {
    expect(parseIngredientLine(line)).toEqual({ line, name, grams });
  });

  it("laat de hoeveelheid leeg als die niet uit de regel volgt", () => {
    expect(parseIngredientLine("peper en zout naar smaak")).toEqual({
      line: "peper en zout naar smaak",
      name: "peper en zout",
      grams: null,
    });
    expect(parseIngredientLine("1 bos peterselie").grams).toBeNull();
    expect(parseIngredientLine("2 kipfilets").grams).toBeNull();
  });
});

describe("zoektermen voor NEVO", () => {
  it("maakt van een meervoud een enkelvoud", () => {
    expect(singular("tomaten")).toBe("tomaat");
    expect(singular("uien")).toBe("ui");
    expect(singular("eieren")).toBe("ei");
    expect(singular("aardappelen")).toBe("aardappel");
    expect(singular("champignons")).toBe("champignon");
    expect(singular("paprika's")).toBe("paprika");
  });

  it("zoekt eerst de hele naam, dan het hoofdwoord, zonder bijvoeglijke naamwoorden", () => {
    expect(searchCandidates("verse volkoren pasta")).toEqual(["volkoren pasta", "pasta", "volkoren"]);
    expect(searchCandidates("rode uien")).toEqual(["rode uien", "rode ui", "uien", "ui"]);
    expect(searchCandidates("spaghetti")).toEqual(["spaghetti", "pasta"]);
    expect(searchCandidates("verse")).toEqual([]);
  });

  it("kiest het rauwe basisproduct en laat een bereid gerecht liggen", () => {
    const names = (list: string[]) => list.map((name_nl) => ({ name_nl }));
    expect(pickFood(names(["Pasta speculoos-", "Pasta witte rauw", "Pasta volkoren rauw"]))?.name_nl).toBe(
      "Pasta witte rauw",
    );
    expect(pickFood(names(["Melk rauwe", "Melk volle", "Melk halfvolle"]))?.name_nl).toBe("Melk volle");
    expect(pickFood(names(["Pesto rode", "Pesto groene"]))?.name_nl).toBe("Pesto rode");
    expect(pickFood(names(["Kipfilet bereid", "Kipfilet rauw"]))?.name_nl).toBe("Kipfilet rauw");
    expect(pickFood(names(["Spaghetti bolognese m kaas huishoudelijk bereid"]))).toBeNull();
    expect(pickFood([])).toBeNull();
  });

  it("kiest de rol zoals het formulier", () => {
    expect(guessRole({ carbs_g: 70, protein_g: 12 })).toBe("kh_bron");
    expect(guessRole({ carbs_g: 0, protein_g: 23 })).toBe("eiwit_bron");
    expect(guessRole({ carbs_g: 4, protein_g: 1 })).toBe("vast");
  });

  it("haalt volgparameters uit de bronlink", () => {
    expect(cleanSourceUrl("https://site.nl/r?id=3&utm_medium=x&fbclid=y")).toBe("https://site.nl/r?id=3");
    expect(cleanSourceUrl("http://site.nl/r")).toBeNull();
  });
});
