import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COACH_KNOWLEDGE_BASES,
  coachKnowledgePaths,
  coachKnowledgeText,
  shortSourceLabel,
} from "@/lib/knowledge/coach";
import { dropUnknownKnowledgeLinks, splitKnowledgeLinks } from "@/lib/knowledge/links";
import { COACH_SYSTEM_PROMPT, coachInstructions } from "@/lib/training/coach-chat";

// De coach krijgt de kennisbanken mee (16 oktober 2026). Wat hier bewaakt wordt:
// dat elk artikel er met zijn pad en beperkingen in staat, dat elk pad naar een
// bestaande pagina wijst, en dat alleen die paden in de chat een link worden.

describe("kennisbank voor de coach", () => {
  const text = coachKnowledgeText();

  it("bevat elk artikel met zijn pad, punten en beperkingen", () => {
    for (const base of COACH_KNOWLEDGE_BASES) {
      expect(base.articles.length).toBeGreaterThan(0);
      for (const article of base.articles) {
        expect(text).toContain(`### ${article.title}\nPad: ${base.basePath}/${article.slug}\n`);
        for (const point of article.points) expect(text).toContain(point);
        for (const limit of article.limits) expect(text).toContain(limit);
      }
    }
  });

  it("wijst alleen naar paden waar een artikelpagina staat", () => {
    for (const base of COACH_KNOWLEDGE_BASES) {
      const page = path.join("src", "app", "(app)", ...base.basePath.split("/").filter(Boolean), "[slug]", "page.tsx");
      expect(existsSync(page), page).toBe(true);
    }
  });

  it("heeft geen dubbele paden", () => {
    const total = COACH_KNOWLEDGE_BASES.reduce((sum, base) => sum + base.articles.length, 0);
    expect(coachKnowledgePaths().size).toBe(total);
  });

  it("staat onder de vaste regels en verandert niet per aanroep", () => {
    // Vast en vooraan: dan haalt OpenAI dit deel uit de prompt-cache.
    const instructions = coachInstructions();
    expect(instructions.startsWith(COACH_SYSTEM_PROMPT)).toBe(true);
    expect(instructions.endsWith(text)).toBe(true);
    expect(coachInstructions()).toBe(instructions);
  });

  it("noemt een bron kort, met e.a. bij meer auteurs", () => {
    expect(
      shortSourceLabel({
        citation: "Rønnestad BR, Hansen J, Vegge G. Short intervals induce superior training adaptations. Scand J Med Sci Sports.",
        year: 2015,
        url: "https://doi.org/x",
        kind: "studie",
      }),
    ).toBe("Rønnestad e.a. 2015 (studie)");
    expect(
      shortSourceLabel({
        citation: "Gabbett TJ. Debunking the myths about training load. Br J Sports Med.",
        year: 2020,
        url: "https://doi.org/x",
        kind: "review",
      }),
    ).toBe("Gabbett 2020 (review)");
    expect(
      shortSourceLabel({
        citation: "Gezondheidsraad. Richtlijnen goede voeding 2015. Den Haag.",
        year: 2015,
        url: "https://example.org",
        kind: "richtlijn",
      }),
    ).toBe("Gezondheidsraad 2015 (richtlijn)");
  });
});

describe("links in een coach-antwoord", () => {
  it("maakt van een kennisbankpad een link", () => {
    expect(splitKnowledgeLinks("Lees [Opbouwen](/zwbeter-worden/kennis/opbouwen) maar eens.")).toEqual([
      { text: "Lees " },
      { text: "Opbouwen", href: "/zwbeter-worden/kennis/opbouwen" },
      { text: " maar eens." },
    ]);
    expect(splitKnowledgeLinks("[Eiwit](/zwbeter-worden/voeding/kennis/eiwit)")).toEqual([
      { text: "Eiwit", href: "/zwbeter-worden/voeding/kennis/eiwit" },
    ]);
  });

  it("laat links naar buiten of naar andere pagina's als tekst staan", () => {
    for (const body of [
      "Kijk op [deze site](https://example.com/kennis/opbouwen).",
      "Ga naar [je profiel](/profiel).",
      "Ga naar [kennis](/zwbeter-worden/kennis/../profiel).",
    ]) {
      expect(splitKnowledgeLinks(body)).toEqual([{ text: body }]);
    }
  });

  it("haalt links naar onbekende artikelen weg en houdt de titel", () => {
    const known = new Set(["/zwbeter-worden/kennis/opbouwen"]);
    expect(
      dropUnknownKnowledgeLinks(
        "Zie [Opbouwen](/zwbeter-worden/kennis/opbouwen) en [Taperen](/zwbeter-worden/kennis/bestaat-niet).",
        known,
      ),
    ).toBe("Zie [Opbouwen](/zwbeter-worden/kennis/opbouwen) en Taperen.");
  });

  it("kent elk pad uit de kennisbank als geldige link", () => {
    for (const p of coachKnowledgePaths()) {
      expect(splitKnowledgeLinks(`[x](${p})`)).toEqual([{ text: "x", href: p }]);
    }
  });
});
