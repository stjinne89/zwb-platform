import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// De SWC-compiler van Next laat soms de spatie vallen tussen een clubwoord en
// de tekst erna op dezelfde regel ("<ClubShortName /> Rankings" werd
// "ZWBRankings"), terwijl esbuild in de andere tests hem houdt. Deze test
// compileert elk bestand met een clubwoord met de compiler van de build.
// Oplossing bij een melding: zet {" "} tussen het clubwoord en de tekst.

const COMPONENTS = "ClubShortName|ClubName|ModuleName|MemberNoun|ClubContactLink";
const GLUED = new RegExp(`\\b(${COMPONENTS}),\\s*\\{[^}]*\\}\\)\\s*,\\s*"([A-Za-z(][^"]{0,30})`, "g");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith(".tsx") ? [full] : [];
  });
}

const files = sourceFiles(path.resolve("src")).filter((file) =>
  fs.readFileSync(file, "utf8").includes("@/components/club-texts-provider"),
);

describe("spaties rond clubwoorden na de build", () => {
  it("vindt bestanden met clubwoorden", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("plakt geen tekst aan een clubwoord", async () => {
    const swc = await import("next/dist/build/swc");
    await swc.loadBindings();
    const glued: string[] = [];
    for (const file of files) {
      const out = await swc.transform(fs.readFileSync(file, "utf8"), {
        filename: path.basename(file),
        jsc: {
          parser: { syntax: "typescript", tsx: true },
          transform: { react: { runtime: "automatic" } },
        },
      });
      for (const match of out.code.matchAll(GLUED)) {
        glued.push(`${path.relative(process.cwd(), file)}: <${match[1]} />${match[2]}`);
      }
    }
    expect(glued).toEqual([]);
  }, 60_000);
});
