import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HELP_CATEGORIES, helpHrefForAnchor } from "@/lib/help-categories";

const HELP_DIR = "src/app/(app)/hulp";

/** De id's die een categoriepagina toont: letterlijke id's, de gidsen die ze
 * via GuideCards toont, en de beheergidsen uit de data. */
async function renderedIds(categoryId: string) {
  const source = await readFile(join(HELP_DIR, "_sections", `${categoryId}.tsx`), "utf8");
  const ids = [...source.matchAll(/\bid="([a-z0-9-]+)"/g)].map((match) => match[1]);
  for (const list of source.matchAll(/<GuideCards ids=\{\[([^\]]*)\]\}/g)) {
    ids.push(...[...list[1].matchAll(/"([a-z0-9-]+)"/g)].map((match) => match[1]));
  }
  if (/\bADMIN_GUIDES\b/.test(source)) {
    const data = await readFile(join(HELP_DIR, "_data.ts"), "utf8");
    const admin = data.slice(data.indexOf("export const ADMIN_GUIDES"), data.indexOf("export const TROUBLESHOOTING"));
    ids.push(...[...admin.matchAll(/\bid: "([a-z0-9-]+)"/g)].map((match) => match[1]));
  }
  return ids;
}

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
    }),
  );
  return nested.flat();
}

describe("hulpcategorieën", () => {
  it("noemt precies de ankers die op de categoriepagina staan", async () => {
    for (const category of HELP_CATEGORIES) {
      const ids = await renderedIds(category.id);
      expect([...ids].sort(), category.id).toEqual([...category.anchors].sort());
    }
  });

  it("heeft elk anker in één categorie", () => {
    const anchors = HELP_CATEGORIES.flatMap((category) => [
      ...category.anchors,
      ...("legacy" in category ? category.legacy : []),
    ]);
    expect(anchors.filter((anchor, index) => anchors.indexOf(anchor) !== index)).toEqual([]);
  });

  it("stuurt een oude link naar de categorie", () => {
    expect(helpHrefForAnchor("jaarplan")).toBe("/hulp/schema#jaarplan");
    expect(helpHrefForAnchor("zwbgame")).toBe("/hulp/wedstrijden#zwbgame");
    expect(helpHrefForAnchor("trainen")).toBe("/hulp/training");
    expect(helpHrefForAnchor("bestaat-niet")).toBeNull();
  });

  it("laat elke hulplink in de app op een bestaand anker uitkomen", async () => {
    const files = await sourceFiles("src");
    const sources = await Promise.all(files.map((file) => readFile(file, "utf8")));
    const broken: string[] = [];
    sources.forEach((source, index) => {
      if (source.includes('"/hulp#')) broken.push(`${files[index]}: /hulp#`);
      for (const [link, categoryId, anchor] of source.matchAll(/\/hulp\/([a-z-]+)#([a-z0-9-]+)/g)) {
        if (helpHrefForAnchor(anchor) !== `/hulp/${categoryId}#${anchor}`) broken.push(`${files[index]}: ${link}`);
      }
    });
    expect(broken).toEqual([]);
  }, 30_000);
});
