import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  STRENGTH_ARTICLES,
  STRENGTH_CATEGORIES,
  articlesForSeries,
  strengthArticleBySlug,
  strengthArticlesByCategory,
} from "@/lib/training/strength-library";

/** Slugs van de standaardseries zoals ze in de seeds staan. */
function seededSeriesSlugs(): Set<string> {
  const slugs = new Set<string>();
  for (const file of [
    "0110_mobility_library_seed.sql",
    "0160_mobility_strength_seed.sql",
    "0232_mobility_strength_seed_v2.sql",
    "0242_mobility_jump_series.sql",
  ]) {
    const path = fileURLToPath(new URL(`../../supabase/migrations/${file}`, import.meta.url));
    const sql = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
    const block = sql.slice(sql.search(/insert into public\.mobility_series\s*\n/));
    for (const match of block.matchAll(/^\s+\('([a-z0-9-]+)', '[^']+',\s*$/gm)) slugs.add(match[1]);
  }
  return slugs;
}

describe("kennisbank kracht", () => {
  it("geeft elk artikel een bron, punten en beperkingen", () => {
    for (const article of STRENGTH_ARTICLES) {
      expect(article.sources.length, article.slug).toBeGreaterThan(0);
      expect(article.points.length, article.slug).toBeGreaterThan(0);
      expect(article.limits.length, article.slug).toBeGreaterThan(0);
      expect(article.summary.length, article.slug).toBeGreaterThan(20);
    }
  });

  it("verwijst elke bron naar een DOI, met jaartal en zonder dubbelen per artikel", () => {
    for (const article of STRENGTH_ARTICLES) {
      const urls = article.sources.map((source) => source.url);
      expect(new Set(urls).size, article.slug).toBe(urls.length);
      for (const source of article.sources) {
        expect(source.url, article.slug).toMatch(/^https:\/\/doi\.org\/10\.\d{4,}\/\S+$/);
        expect(source.citation, article.slug).toContain(".");
        expect(source.year).toBeGreaterThan(2000);
        expect(source.year).toBeLessThanOrEqual(2026);
      }
    }
  });

  it("heeft unieke slugs en vindt een artikel terug", () => {
    const slugs = STRENGTH_ARTICLES.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(strengthArticleBySlug(slugs[0])?.slug).toBe(slugs[0]);
    expect(strengthArticleBySlug("bestaat-niet")).toBeNull();
  });

  it("vult elke categorie", () => {
    expect(strengthArticlesByCategory().map((group) => group.category)).toEqual([
      ...STRENGTH_CATEGORIES,
    ]);
  });

  it("verwijst alleen naar series die in een seed staan", () => {
    const seeded = seededSeriesSlugs();
    // Vangnet voor de regex: zeven series uit 0110 en 0160, vijf uit 0232, één uit 0242.
    expect(seeded.size).toBe(13);
    for (const article of STRENGTH_ARTICLES) {
      for (const slug of article.series ?? []) expect(seeded.has(slug), `${article.slug}: ${slug}`).toBe(true);
    }
  });

  it("geeft elke gym- en krachtserie een onderbouwing", () => {
    for (const slug of seededSeriesSlugs()) {
      expect(articlesForSeries(slug).length, slug).toBeGreaterThan(0);
    }
  });
});
