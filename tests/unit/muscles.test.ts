import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ANTERIOR, POSTERIOR } from "@/components/mobility/muscle-map-data";
import {
  EXERCISE_EQUIPMENT,
  equipmentLabel,
  seriesEquipment,
} from "@/lib/training/equipment";
import type { MobilitySeriesItem, MobilitySession } from "@/lib/training/mobility";
import {
  EXERCISE_MUSCLES,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  exerciseLoad,
  exerciseMuscles,
  normalizeLoad,
  rankedGroups,
  seriesLoad,
  weekLoad,
} from "@/lib/training/muscles";

/** Oefening-slugs zoals ze in een seed-migratie staan: de eerste waarde van elke
 * rij, direct gevolgd door de titel en een categorie. */
function seededExerciseSlugs(file: string): string[] {
  const path = fileURLToPath(new URL(`../../supabase/migrations/${file}`, import.meta.url));
  const sql = readFileSync(path, "utf8");
  return [
    ...sql.matchAll(/^\s+\('([a-z0-9-]+)', '[^']+', '(?:core|mobiliteit|activatie|kracht)',/gm),
  ].map((match) => match[1]);
}

function item(
  slug: string,
  sets: number,
  category: MobilitySeriesItem["exercise"]["category"] = "kracht",
): MobilitySeriesItem {
  return {
    id: `${slug}-${sets}`,
    series_id: "s",
    sort_order: 0,
    sets,
    reps: 10,
    hold_seconds: null,
    rest_seconds: 20,
    exercise: {
      id: slug,
      slug,
      title: slug,
      category,
      region: "been",
      cue_md: "",
      illustration_slug: slug,
      media_json: [],
      default_hold_seconds: null,
      default_reps: 10,
      is_unilateral: false,
      level: 1,
    },
  };
}

const session = (series_id: string, completed_on: string): MobilitySession => ({
  id: `${series_id}-${completed_on}`,
  series_id,
  completed_on,
  minutes: null,
  feel: null,
});

describe("spiergroepen per oefening", () => {
  it("kent elke meegeleverde oefening", () => {
    const core = seededExerciseSlugs("0110_mobility_library_seed.sql");
    const strength = seededExerciseSlugs("0160_mobility_strength_seed.sql");
    // Vangnet: raakt een seed uit de pas met deze regex, dan valt dit om in
    // plaats van dat de dekkingscontrole stilletjes over niets loopt.
    expect(core).toHaveLength(18);
    const weighted = seededExerciseSlugs("0232_mobility_strength_seed_v2.sql");
    expect(strength).toHaveLength(7);
    expect(weighted).toHaveLength(8);
    const jump = seededExerciseSlugs("0245_mobility_jump_series.sql");
    expect(jump).toHaveLength(1);

    const missing = [...core, ...strength, ...weighted, ...jump].filter((slug) => !EXERCISE_MUSCLES[slug]);
    expect(missing).toEqual([]);
  });

  it("geeft elke oefening minstens één hoofdspier en geen dubbele groepen", () => {
    for (const [slug, muscles] of Object.entries(EXERCISE_MUSCLES)) {
      expect(muscles.primary.length, slug).toBeGreaterThan(0);
      const all = [...muscles.primary, ...muscles.secondary];
      expect(new Set(all).size, slug).toBe(all.length);
    }
  });

  it("valt terug op niets bij een onbekende slug", () => {
    expect(exerciseMuscles("bestaat-niet")).toBeNull();
    expect(exerciseMuscles(null)).toBeNull();
    expect(exerciseLoad(null)).toEqual({});
  });
});

describe("materiaal", () => {
  it("kent alleen oefeningen die bestaan", () => {
    for (const slug of Object.keys(EXERCISE_EQUIPMENT)) {
      expect(EXERCISE_MUSCLES[slug], slug).toBeDefined();
    }
  });

  it("somt op wat een serie vraagt, zonder dubbelen", () => {
    const items = [item("goblet-squat", 3), item("bulgarian-split-squat", 3), item("squat", 2)];
    expect(seriesEquipment(items)).toEqual(["dumbbell"]);
    expect(equipmentLabel(seriesEquipment(items))).toBe("Dumbbell");
    expect(equipmentLabel(seriesEquipment([item("squat", 2)]))).toBeNull();
    expect(
      seriesEquipment([item("banded-hip-flexion", 1), item("barbell-half-squat", 1)]),
    ).toEqual(["halter", "band"]);
  });
});

describe("spierkaart", () => {
  it("heeft voor elke spiergroep een vlak en een naam", () => {
    const drawn = new Set([...ANTERIOR, ...POSTERIOR].map(([group]) => group));
    for (const group of MUSCLE_GROUPS) {
      expect(drawn.has(group), group).toBe(true);
      expect(MUSCLE_LABELS[group]).toBeTruthy();
    }
  });
});

describe("belasting optellen", () => {
  it("weegt een hoofdspier zwaarder dan een hulpspier", () => {
    const load = exerciseLoad(exerciseMuscles("squat"));
    expect(load.quadriceps).toBe(1);
    expect(load.hamstrings).toBeLessThan(1);
    expect(load.kuiten).toBeUndefined();
  });

  it("telt sets mee in een serie", () => {
    const load = seriesLoad([item("squat", 3), item("calf-raise", 1)]);
    expect(load.quadriceps).toBe(3);
    expect(load.kuiten).toBe(1);
    expect(rankedGroups(load).slice(0, 2).sort()).toEqual(["bilspieren", "quadriceps"]);
    expect(rankedGroups(load).at(-1)).toBe("kuiten");
  });

  it("schaalt naar de zwaarste groep", () => {
    const scaled = normalizeLoad(seriesLoad([item("squat", 3), item("calf-raise", 1)]));
    expect(scaled.quadriceps).toBe(1);
    expect(scaled.kuiten).toBeCloseTo(1 / 3);
    expect(normalizeLoad({})).toEqual({});
  });

  it("laat rekken buiten wat als training telt", () => {
    const items = [item("squat", 2), item("hamstring-stretch", 1, "mobiliteit")];
    const everything = seriesLoad(items).hamstrings ?? 0;
    const training = seriesLoad(items, { trainingOnly: true }).hamstrings ?? 0;
    expect(everything).toBeGreaterThan(training);
    expect(
      seriesLoad([item("hamstring-stretch", 1, "mobiliteit")], { trainingOnly: true }),
    ).toEqual({});
  });
});

describe("weekoverzicht", () => {
  const series = [
    { id: "benen", items: [item("squat", 2)] },
    { id: "kuiten", items: [item("calf-raise", 2)] },
  ];

  it("telt zeven dagen, vandaag meegerekend", () => {
    const load = weekLoad(
      [
        session("benen", "2026-10-14"),
        session("benen", "2026-10-08"),
        session("kuiten", "2026-10-07"),
      ],
      series,
      "2026-10-14",
    );
    expect(load.quadriceps).toBe(4);
    expect(load.kuiten).toBeUndefined();
  });

  it("slaat een sessie van een verdwenen serie over", () => {
    expect(weekLoad([session("weg", "2026-10-14")], series, "2026-10-14")).toEqual({});
  });

  it("is leeg zonder sessies", () => {
    expect(weekLoad([], series, "2026-10-14")).toEqual({});
  });
});
