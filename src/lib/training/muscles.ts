// Welke spiergroepen een oefening aanspreekt, en wat dat optelt per serie en per
// week.
//
// Bewust in code en niet in de database, net als het figuurregister: een nieuwe
// oefening vraagt toch al een figuur in de code, en zo is er geen migratie nodig
// die hier niet te testen is. tests/unit/muscles.test.ts bewaakt dat elke
// meegeleverde oefening erin staat.
//
// Bij rek- en mobiliteitsoefeningen staat hier wat er gerekt of losgemaakt
// wordt. Dat is nuttig op de oefening en de serie, maar het is geen training:
// het weekoverzicht telt daarom alleen core en kracht.

import {
  shiftDayKey,
  type MobilityCategory,
  type MobilitySeriesItem,
  type MobilitySession,
} from "./mobility";

export const MUSCLE_GROUPS = [
  "schouders",
  "borst",
  "biceps",
  "triceps",
  "onderarmen",
  "nek",
  "bovenrug",
  "onderrug",
  "buik",
  "schuin",
  "heupbuigers",
  "bilspieren",
  "adductoren",
  "quadriceps",
  "hamstrings",
  "kuiten",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  schouders: "Schouders",
  borst: "Borst",
  biceps: "Biceps",
  triceps: "Triceps",
  onderarmen: "Onderarmen",
  nek: "Nek en monnikskap",
  bovenrug: "Bovenrug",
  onderrug: "Onderrug",
  buik: "Buik",
  schuin: "Schuine buikspieren",
  heupbuigers: "Heupbuigers",
  bilspieren: "Bilspieren",
  adductoren: "Binnenkant bovenbeen",
  quadriceps: "Bovenbeen voor",
  hamstrings: "Bovenbeen achter",
  kuiten: "Kuiten",
};

export type ExerciseMuscles = {
  /** Waar de oefening om draait. */
  primary: MuscleGroup[];
  /** Wat meehelpt of stabiliseert. */
  secondary: MuscleGroup[];
};

const m = (primary: MuscleGroup[], secondary: MuscleGroup[] = []): ExerciseMuscles => ({
  primary,
  secondary,
});

/** Per oefening-slug uit mobility_exercises. */
export const EXERCISE_MUSCLES: Record<string, ExerciseMuscles> = {
  // Core (0110)
  plank: m(["buik"], ["schuin", "schouders", "bilspieren", "quadriceps"]),
  "side-plank": m(["schuin"], ["bilspieren", "schouders", "buik"]),
  "bird-dog": m(["onderrug", "bilspieren"], ["buik", "schouders", "hamstrings"]),
  "dead-bug": m(["buik"], ["schuin", "heupbuigers"]),
  "hollow-hold": m(["buik"], ["heupbuigers", "quadriceps"]),
  "glute-bridge": m(["bilspieren"], ["hamstrings", "onderrug"]),

  // Mobiliteit (0110): wat er gerekt of losgemaakt wordt.
  "cat-camel": m(["onderrug", "bovenrug"], ["buik"]),
  "thoracic-rotation": m(["bovenrug"], ["schuin", "schouders"]),
  "thoracic-extension": m(["bovenrug"], ["schouders", "borst"]),
  "child-pose": m(["onderrug"], ["bovenrug", "bilspieren"]),
  "shoulder-opener": m(["schouders"], ["borst", "bovenrug"]),
  "hip-flexor-stretch": m(["heupbuigers"], ["quadriceps"]),
  "hamstring-stretch": m(["hamstrings"], ["kuiten"]),
  "figure-four": m(["bilspieren"]),
  "ankle-rock": m(["kuiten"]),

  // Activatie (0110)
  "leg-swing": m(["heupbuigers", "hamstrings"], ["bilspieren"]),
  "hip-circle": m(["bilspieren"], ["heupbuigers", "adductoren"]),
  "hip-hinge": m(["hamstrings", "bilspieren"], ["onderrug"]),

  // Kracht (0160)
  squat: m(["quadriceps", "bilspieren"], ["hamstrings", "adductoren", "onderrug"]),
  "split-squat": m(["quadriceps", "bilspieren"], ["hamstrings", "adductoren"]),
  "step-up": m(["quadriceps", "bilspieren"], ["hamstrings", "kuiten"]),
  "single-leg-bridge": m(["bilspieren", "hamstrings"], ["onderrug", "buik"]),
  "calf-raise": m(["kuiten"]),
  "single-leg-rdl": m(["hamstrings", "bilspieren"], ["onderrug"]),
  "wall-sit": m(["quadriceps"], ["bilspieren"]),

  // Kracht met gewicht (0230)
  "barbell-half-squat": m(["quadriceps", "bilspieren"], ["hamstrings", "adductoren", "onderrug"]),
  "single-leg-press": m(["quadriceps", "bilspieren"], ["hamstrings", "adductoren"]),
  "standing-hip-flexion": m(["heupbuigers"], ["quadriceps", "buik"]),
  "loaded-calf-raise": m(["kuiten"]),
  "goblet-squat": m(["quadriceps", "bilspieren"], ["hamstrings", "adductoren", "buik"]),
  "bulgarian-split-squat": m(["quadriceps", "bilspieren"], ["hamstrings", "adductoren"]),
  "banded-hip-flexion": m(["heupbuigers"], ["quadriceps", "buik"]),
  "single-leg-calf-raise": m(["kuiten"]),
};

export function exerciseMuscles(slug: string | null | undefined): ExerciseMuscles | null {
  if (!slug) return null;
  return EXERCISE_MUSCLES[slug] ?? null;
}

/** Belasting per spiergroep. Na `normalizeLoad` loopt die van 0 tot 1. */
export type MuscleLoad = Partial<Record<MuscleGroup, number>>;

const PRIMARY_WEIGHT = 1;
/** Een hulpspier telt mee, maar duidelijk lichter dan waar de oefening om
 * draait; anders kleurt bij elke serie het halve lichaam even fel. */
const SECONDARY_WEIGHT = 0.4;

/** Alleen dit werk telt als training in het weekoverzicht. */
const TRAINING_CATEGORIES: MobilityCategory[] = ["core", "kracht"];

/** Voor één oefening: hoofdspieren vol, hulpspieren lichter. */
export function exerciseLoad(muscles: ExerciseMuscles | null): MuscleLoad {
  const load: MuscleLoad = {};
  if (!muscles) return load;
  for (const group of muscles.secondary) load[group] = SECONDARY_WEIGHT;
  for (const group of muscles.primary) load[group] = PRIMARY_WEIGHT;
  return load;
}

function addLoad(total: MuscleLoad, extra: MuscleLoad, factor = 1) {
  for (const group of MUSCLE_GROUPS) {
    const value = extra[group];
    if (value) total[group] = (total[group] ?? 0) + value * factor;
  }
}

/**
 * Opgeteld over de oefeningen van een serie, gewogen naar het aantal sets. Niet
 * genormaliseerd, zodat meerdere sessies bij elkaar op te tellen zijn.
 */
export function seriesLoad(
  items: MobilitySeriesItem[],
  options: { trainingOnly?: boolean } = {},
): MuscleLoad {
  const total: MuscleLoad = {};
  for (const item of items) {
    if (options.trainingOnly && !TRAINING_CATEGORIES.includes(item.exercise.category)) continue;
    addLoad(total, exerciseLoad(exerciseMuscles(item.exercise.slug)), item.sets);
  }
  return total;
}

/**
 * Wat er de afgelopen zeven dagen (vandaag meegerekend) getraind is, uit de
 * afgevinkte sessies. Een sessie van een serie die niet meer bestaat telt niet
 * mee: zonder items valt er niets op te tellen.
 */
export function weekLoad(
  sessions: MobilitySession[],
  series: { id: string; items: MobilitySeriesItem[] }[],
  today: string,
): MuscleLoad {
  const from = shiftDayKey(today, -6);
  const itemsBySeries = new Map(series.map((row) => [row.id, row.items]));
  const total: MuscleLoad = {};
  for (const session of sessions) {
    if (session.completed_on < from || session.completed_on > today) continue;
    const items = itemsBySeries.get(session.series_id);
    if (items) addLoad(total, seriesLoad(items, { trainingOnly: true }));
  }
  return total;
}

/** Schaalt naar 0-1 ten opzichte van de zwaarst belaste groep. */
export function normalizeLoad(load: MuscleLoad): MuscleLoad {
  const peak = Math.max(0, ...MUSCLE_GROUPS.map((group) => load[group] ?? 0));
  if (peak <= 0) return {};
  const scaled: MuscleLoad = {};
  for (const group of MUSCLE_GROUPS) {
    const value = load[group];
    if (value) scaled[group] = value / peak;
  }
  return scaled;
}

/** Groepen met belasting, zwaarste eerst. */
export function rankedGroups(load: MuscleLoad): MuscleGroup[] {
  return MUSCLE_GROUPS.filter((group) => (load[group] ?? 0) > 0).sort(
    (a, b) => (load[b] ?? 0) - (load[a] ?? 0),
  );
}
