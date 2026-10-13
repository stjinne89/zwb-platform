// Welk materiaal een oefening vraagt.
//
// In code, net als de spiergroepen en de figuren: een oefening die hier niet
// staat, vraagt niets. Zo werkt de bibliotheek ook voordat een seed is gedraaid,
// en hoeft er geen kolom bij die hier niet te testen is.

import type { MobilitySeriesItem } from "./mobility";

export type Equipment = "band" | "dumbbell" | "halter" | "machine";

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  band: "Weerstandsband",
  dumbbell: "Dumbbell",
  halter: "Halterstang",
  machine: "Apparaat",
};

/** Per oefening-slug uit mobility_exercises (0230). */
export const EXERCISE_EQUIPMENT: Record<string, Equipment[]> = {
  "barbell-half-squat": ["halter"],
  "single-leg-press": ["machine"],
  "standing-hip-flexion": ["machine"],
  "loaded-calf-raise": ["halter"],
  "goblet-squat": ["dumbbell"],
  "bulgarian-split-squat": ["dumbbell"],
  "banded-hip-flexion": ["band"],
};

const ORDER: Equipment[] = ["halter", "machine", "dumbbell", "band"];

export function exerciseEquipment(slug: string): Equipment[] {
  return EXERCISE_EQUIPMENT[slug] ?? [];
}

/** Alles wat je voor een serie nodig hebt, zonder dubbelen. */
export function seriesEquipment(items: Pick<MobilitySeriesItem, "exercise">[]): Equipment[] {
  const needed = new Set(items.flatMap((item) => exerciseEquipment(item.exercise.slug)));
  return ORDER.filter((kind) => needed.has(kind));
}

export function equipmentLabel(kinds: Equipment[]): string | null {
  return kinds.length > 0 ? kinds.map((kind) => EQUIPMENT_LABELS[kind]).join(" · ") : null;
}
