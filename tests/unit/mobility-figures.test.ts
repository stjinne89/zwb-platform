import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MOBILITY_FIGURES, figurePoses } from "@/components/mobility/figures";

/** De slugs zoals ze in de seed-migratie staan. Uit het bestand lezen in plaats
 * van overtypen, zodat de test niet stilletjes verouderd raakt. */
function seededIllustrationSlugs(): string[] {
  const path = fileURLToPath(
    new URL("../../supabase/migrations/0110_mobility_library_seed.sql", import.meta.url),
  );
  const sql = readFileSync(path, "utf8");
  // De illustratieslug staat op een eigen regel, direct gevolgd door
  // default_hold_seconds — een getal of null. Dat patroon komt nergens anders
  // in het bestand voor.
  return [...sql.matchAll(/^\s+'([a-z0-9-]+)',\s*(?:\d+|null),/gm)].map((match) => match[1]);
}

describe("figuurregister", () => {
  it("heeft voor elke meegeleverde oefening poses", () => {
    const slugs = seededIllustrationSlugs();
    // Vangnet: raakt de seed uit de pas met deze regex, dan valt dit om in
    // plaats van dat de dekkingscontrole stilletjes over niets loopt.
    expect(slugs).toHaveLength(18);

    const missing = slugs.filter((slug) => !MOBILITY_FIGURES[slug]);
    expect(missing).toEqual([]);
  });

  it("geeft elke figuur minstens één pose", () => {
    for (const [slug, poses] of Object.entries(MOBILITY_FIGURES)) {
      expect(poses.length, slug).toBeGreaterThan(0);
    }
  });

  it("valt terug op niets bij een onbekende of ontbrekende slug", () => {
    expect(figurePoses("bestaat-niet")).toBeNull();
    expect(figurePoses(null)).toBeNull();
    expect(figurePoses(undefined)).toBeNull();
  });
});
