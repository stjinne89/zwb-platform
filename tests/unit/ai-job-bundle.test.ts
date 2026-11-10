import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// De Netlify-achtergrondfunctie draait buiten Next. Op 9 november 2026 kreeg
// lib/ai/claude.ts een import van lib/club (server-only, next/cache); daarna
// crashte de functie bij het laden en bleef elke Claude-opdracht in de rij staan.
// Vitest zag dat niet: die vangt server-only zelf af. Deze test bundelt de functie
// zoals Netlify, zonder de "@/"-aliassen, en kijkt welke imports overblijven.

const ENTRY = fileURLToPath(new URL("../../netlify/functions/ai-job-background.mts", import.meta.url));

/** Wat buiten Next niet laadt of niet bestaat. */
const NEXT_ONLY = [/^@\//, /^server-only$/, /^client-only$/, /^next(\/|$)/, /^react(\/|$)/, /^react-dom(\/|$)/];

describe("ai-job-background", () => {
  it("importeert niets dat alleen binnen Next laadt", async () => {
    const result = await build({
      entryPoints: [ENTRY],
      bundle: true,
      platform: "node",
      format: "esm",
      packages: "external",
      // Geen paden uit tsconfig.json: Netlify kent de "@/"-aliassen niet.
      tsconfigRaw: {},
      write: false,
      metafile: true,
      logLevel: "silent",
    });
    const imports = Object.values(result.metafile.outputs).flatMap((output) =>
      output.imports.filter((entry) => entry.external).map((entry) => entry.path),
    );
    expect(imports).toContain("@anthropic-ai/sdk");
    expect(imports.filter((path) => NEXT_ONLY.some((pattern) => pattern.test(path)))).toEqual([]);
  });
});
