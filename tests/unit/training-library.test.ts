import { describe, expect, it } from "vitest";
import { PROTOCOLS } from "@/lib/protocols";
import {
  TRAINING_ARTICLES,
  trainingArticleBySlug,
  trainingArticlesByCategory,
} from "@/lib/training/training-library";
import { articleBySlug } from "@/lib/nutrition/library";
import { strengthArticleBySlug } from "@/lib/training/strength-library";

describe("kennisbank trainen", () => {
  it("geeft elk artikel een bron, punten en beperkingen", () => {
    for (const article of TRAINING_ARTICLES) {
      expect(article.sources.length, article.slug).toBeGreaterThan(0);
      expect(article.points.length, article.slug).toBeGreaterThan(0);
      expect(article.limits.length, article.slug).toBeGreaterThan(0);
      expect(article.summary.length, article.slug).toBeGreaterThan(20);
    }
  });

  it("verwijst elke bron naar een https-adres, zonder dubbelen per artikel", () => {
    for (const article of TRAINING_ARTICLES) {
      const urls = article.sources.map((source) => source.url);
      expect(new Set(urls).size, article.slug).toBe(urls.length);
      for (const source of article.sources) {
        expect(source.url, article.slug).toMatch(/^https:\/\//);
        expect(source.year).toBeGreaterThan(2000);
        expect(source.year).toBeLessThanOrEqual(2026);
      }
    }
  });

  it("heeft unieke slugs en vindt een artikel terug", () => {
    const slugs = TRAINING_ARTICLES.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(trainingArticleBySlug("taper")?.title).toBe("Taper naar een wedstrijd");
    expect(trainingArticleBySlug("bestaat-niet")).toBeNull();
    expect(trainingArticlesByCategory().every((group) => group.articles.length > 0)).toBe(true);
  });

  it("laat elk protocol naar een bestaand artikel verwijzen", () => {
    for (const protocol of PROTOCOLS) {
      if (!protocol.article) continue;
      const training = protocol.article.href.match(/^\/zwbeter-worden\/kennis\/([a-z0-9-]+)$/);
      const nutrition = protocol.article.href.match(/^\/zwbeter-worden\/voeding\/kennis\/([a-z0-9-]+)$/);
      const strength = protocol.article.href.match(/^\/zwbeter-worden\/core\/kennis\/([a-z0-9-]+)$/);
      if (training) expect(trainingArticleBySlug(training[1]), protocol.slug).not.toBeNull();
      else if (nutrition) expect(articleBySlug(nutrition[1]), protocol.slug).not.toBeNull();
      else if (strength) expect(strengthArticleBySlug(strength[1]), protocol.slug).not.toBeNull();
      else throw new Error(`${protocol.slug}: onbekende kennisbank ${protocol.article.href}`);
    }
  });
});
