import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ARTICLE_EVIDENCE, ARTICLE_EVIDENCE_LABELS } from "@/lib/knowledge/evidence";
import { NUTRITION_ARTICLES } from "@/lib/nutrition/library";
import { protocolBySlug } from "@/lib/protocols";
import { STRENGTH_ARTICLES } from "@/lib/training/strength-library";
import { TRAINING_ARTICLES } from "@/lib/training/training-library";

// Elk kennisartikel heeft een bewijsniveau, en dat niveau is het niveau dat de
// eigenaar heeft goedgekeurd in docs/bewijsniveau-kennisbank.md. Wijzigt een
// niveau, dan eerst daar.

const ARTICLES = [...TRAINING_ARTICLES, ...NUTRITION_ARTICLES, ...STRENGTH_ARTICLES];
const doc = readFileSync("docs/bewijsniveau-kennisbank.md", "utf8");

describe("bewijsniveau per kennisartikel", () => {
  it("heeft een geldig niveau bij elk artikel", () => {
    for (const article of ARTICLES) {
      expect(ARTICLE_EVIDENCE, article.slug).toContain(article.evidence);
    }
  });

  it("is gelijk aan de goedgekeurde tabel", () => {
    for (const article of ARTICLES) {
      const row = doc.split("\n").find((line) => line.startsWith(`| ${article.title} |`) || line.startsWith(`| ${article.title} *(`));
      expect(row, `${article.title} staat niet in de tabel`).toBeDefined();
      const level = ARTICLE_EVIDENCE_LABELS[article.evidence].replace(" bewijs", "");
      expect(row, article.title).toContain(`| **${level}**`);
    }
  });

  it("geeft Afgeraden alleen aan artikelen die iets afraden", () => {
    const afgeraden = ARTICLES.filter((article) => article.evidence === "afgeraden").map((article) => article.slug);
    expect(afgeraden.sort()).toEqual(["geen-bewijs", "ketonen", "low-carb-keto"]);
  });

  it("zet het protocol lage cadans gelijk aan zijn artikel", () => {
    const article = TRAINING_ARTICLES.find((item) => item.slug === "lage-cadans");
    expect(protocolBySlug("lage-cadans-vo2max")?.evidence).toBe(article?.evidence);
  });
});
