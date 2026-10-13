import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Figure,
  MOBILITY_FIGURES,
  blendPose,
  figurePoses,
  type Pose,
} from "@/components/mobility/figures";
import { exerciseMuscles } from "@/lib/training/muscles";

/** De slugs zoals ze in de seed-migratie staan. Uit het bestand lezen in plaats
 * van overtypen, zodat de test niet stilletjes verouderd raakt. */
function seededIllustrationSlugs(file: string): string[] {
  const path = fileURLToPath(new URL(`../../supabase/migrations/${file}`, import.meta.url));
  const sql = readFileSync(path, "utf8");
  // De illustratieslug staat op een eigen regel, direct gevolgd door
  // default_hold_seconds — een getal of null. Dat patroon komt nergens anders
  // in het bestand voor.
  return [...sql.matchAll(/^\s+'([a-z0-9-]+)',\s*(?:\d+|null),/gm)].map((match) => match[1]);
}

describe("figuurregister", () => {
  it("heeft voor elke meegeleverde oefening poses", () => {
    const core = seededIllustrationSlugs("0110_mobility_library_seed.sql");
    const strength = seededIllustrationSlugs("0160_mobility_strength_seed.sql");
    // Vangnet: raakt een seed uit de pas met deze regex, dan valt dit om in
    // plaats van dat de dekkingscontrole stilletjes over niets loopt.
    expect(core).toHaveLength(18);
    const weighted = seededIllustrationSlugs("0230_mobility_strength_seed_v2.sql");
    expect(strength).toHaveLength(7);
    expect(weighted).toHaveLength(8);
    const slugs = [...core, ...strength, ...weighted];

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

describe("figuur tekenen", () => {
  const draw = (slug: string, pose: Pose) =>
    renderToStaticMarkup(
      createElement(Figure, { pose, muscles: exerciseMuscles(slug) ?? undefined }),
    );

  it("tekent elke pose en elke tussenstand zonder kapotte coördinaten", () => {
    for (const [slug, poses] of Object.entries(MOBILITY_FIGURES)) {
      const frames = [...poses];
      for (let index = 0; index + 1 < poses.length; index++) {
        frames.push(blendPose(poses[index], poses[index + 1], 0.5));
      }
      for (const pose of frames) {
        expect(draw(slug, pose), slug).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it("mengt de opgegeven punten, niet de uitgerekende gewrichten", () => {
    const [down, up] = MOBILITY_FIGURES.squat;
    const halfway = blendPose(down, up, 0.5);
    expect(halfway.hip[1]).toBeCloseTo((down.hip[1] + up.hip[1]) / 2);
    expect(halfway.foot).toEqual(down.foot);
    expect(blendPose(down, up, 0)).toBe(down);
    expect(blendPose(down, up, 1)).toBe(up);
  });

  it("kleurt de werkende spieren alleen als ze zijn opgegeven", () => {
    const pose = MOBILITY_FIGURES.squat[0];
    const plain = renderToStaticMarkup(createElement(Figure, { pose }));
    const count = (svg: string) => svg.split("--figure-hot").length;
    expect(count(draw("squat", pose))).toBeGreaterThan(count(plain));
  });
});
