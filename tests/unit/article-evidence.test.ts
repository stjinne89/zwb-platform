import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ARTICLE_CONCLUSIONS, ARTICLE_EVIDENCE, evidenceText } from "@/lib/knowledge/evidence";
import { MATERIAAL_ARTICLES } from "@/lib/materiaal/library";
import { NUTRITION_ARTICLES } from "@/lib/nutrition/library";
import { protocolBySlug } from "@/lib/protocols";
import { RACEN_ARTICLES } from "@/lib/racen/library";
import { STRENGTH_ARTICLES } from "@/lib/training/strength-library";
import { TRAINING_ARTICLES } from "@/lib/training/training-library";

// Elk kennisartikel heeft een bewijsniveau, en dat niveau is het niveau dat de
// eigenaar heeft goedgekeurd in docs/beoordelingsbeleid-bewijsniveau.md. Wijzigt
// een niveau, dan eerst daar. De kennisbank materiaal staat in dezelfde tabel en
// wordt ook in materiaal.test.ts gecontroleerd. De kennisbank racen (2026-10-19)
// staat er ook in.

const ARTICLES = [...TRAINING_ARTICLES, ...NUTRITION_ARTICLES, ...STRENGTH_ARTICLES, ...RACEN_ARTICLES];
const doc = readFileSync("docs/beoordelingsbeleid-bewijsniveau.md", "utf8");

describe("bewijsniveau per kennisartikel", () => {
  it("heeft een geldig niveau en hooguit een geldige conclusie bij elk artikel", () => {
    for (const article of [...ARTICLES, ...MATERIAAL_ARTICLES]) {
      expect(ARTICLE_EVIDENCE, article.slug).toContain(article.evidence);
      if (article.conclusion) expect(ARTICLE_CONCLUSIONS, article.slug).toContain(article.conclusion);
    }
  });

  it("is gelijk aan de goedgekeurde tabel", () => {
    for (const article of ARTICLES) {
      const row = doc.split("\n").find((line) => line.startsWith(`| ${article.title} |`));
      expect(row, `${article.title} staat niet in de tabel`).toBeDefined();
      expect(row, article.title).toContain(`| **${evidenceText(article.evidence, article.conclusion)}** |`);
    }
  });

  it("geeft alleen een conclusie aan artikelen die zeggen dat iets niet helpt", () => {
    const withConclusion = [...ARTICLES, ...MATERIAAL_ARTICLES]
      .filter((article) => article.conclusion)
      .map((article) => `${article.slug}:${article.conclusion}`);
    expect(withConclusion.sort()).toEqual([
      "compressiekleding:geen-effect",
      "geen-bewijs:geen-effect",
      "inlegzolen:geen-effect",
      "ketonen:geen-effect",
      "low-carb-keto:nadelig",
      "neusstrips:geen-effect",
    ]);
  });

  it("zet een protocol niet hoger dan zijn artikel", () => {
    const article = (slug: string) => ARTICLES.find((item) => item.slug === slug)?.evidence;
    expect(protocolBySlug("lage-cadans-vo2max")?.evidence).toBe(article("lage-cadans"));
    expect(protocolBySlug("kracht-op-de-fiets")?.evidence).toBe(article("kracht-op-de-fiets"));
  });
});
