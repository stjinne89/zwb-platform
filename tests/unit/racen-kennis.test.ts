import { describe, expect, it } from "vitest";
import { activeHrefIn, RACEN_SECTIONS } from "@/app/(app)/_components/nav-config";
import { ARTICLE_EVIDENCE } from "@/lib/knowledge/evidence";
import { EVIDENCE_KINDS } from "@/lib/nutrition/library";
import { RACEN_ARTICLES, RACEN_CATEGORIES, racenArticleBySlug } from "@/lib/racen/library";
import { shelfForArticle } from "@/lib/zwbieb/shelves";

// De kennisbank racen (2026-10-19). Het niveau per artikel staat in
// docs/beoordelingsbeleid-bewijsniveau.md en wordt in article-evidence.test.ts
// tegen de tabel gehouden.

describe("kennisbank racen", () => {
  it("heeft unieke artikelen met gepubliceerde bronnen, beperkingen en een geldig niveau", () => {
    const slugs = RACEN_ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const article of RACEN_ARTICLES) {
      expect(RACEN_CATEGORIES).toContain(article.category);
      expect(ARTICLE_EVIDENCE).toContain(article.evidence);
      expect(article.points.length, article.slug).toBeGreaterThan(2);
      expect(article.limits.length, article.slug).toBeGreaterThan(0);
      expect(article.sources.length, article.slug).toBeGreaterThan(0);
      for (const source of article.sources) {
        expect(EVIDENCE_KINDS).toContain(source.kind);
        // Alleen gepubliceerd onderzoek is een bron; Zwift Insider staat in de tekst.
        expect(source.url).toMatch(/^https:\/\/doi\.org\/10\./);
      }
    }
  });

  it("noemt bij elk artikel met Zwift-spelregels dat dat geen onderzoek is", () => {
    for (const article of RACEN_ARTICLES.filter((a) => a.points.some((p) => /Zwift Insider|Pack Dynamics|powerup|supertuck/i.test(p)))) {
      expect(article.limits.join(" "), article.slug).toMatch(/Zwift Insider|geen onderzoek|geen gepubliceerd onderzoek/);
    }
  });

  it("staat in de ZWBieb op de plank Racetactiek", () => {
    for (const article of RACEN_ARTICLES) {
      expect(shelfForArticle(`/zwbeter-worden/racen/kennis/${article.slug}`)?.slug, article.slug).toBe("racetactiek");
    }
    expect(racenArticleBySlug("bestaat-niet")).toBeNull();
  });

  it("zet een race onder Jouw races en een artikel onder Kennisbank", () => {
    const hrefs = RACEN_SECTIONS.map((s) => s.href);
    expect(activeHrefIn("/zwbeter-worden/racen", hrefs)).toBe("/zwbeter-worden/racen");
    expect(activeHrefIn("/zwbeter-worden/racen/0f4c6a90", hrefs)).toBe("/zwbeter-worden/racen");
    expect(activeHrefIn("/zwbeter-worden/racen/zwift/123", hrefs)).toBe("/zwbeter-worden/racen");
    expect(activeHrefIn("/zwbeter-worden/racen/kennis", hrefs)).toBe("/zwbeter-worden/racen/kennis");
    expect(activeHrefIn("/zwbeter-worden/racen/kennis/in-het-wiel", hrefs)).toBe("/zwbeter-worden/racen/kennis");
  });
});
