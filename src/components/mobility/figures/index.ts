// Het figuurregister: illustration_slug uit mobility_exercises → poses.
//
// De database kent alleen de slug. Ontbreekt hier een figuur, dan valt
// ExerciseVisual terug op de tekst — een seed met een onbekende slug levert dus
// nooit een lege kaart op. tests/unit/mobility-figures.test.ts bewaakt dat de
// meegeleverde set wél compleet is.
//
// Gegroepeerd per categorie in plaats van één bestand per oefening: een pose is
// pure data van een paar regels, dus achttien losse bestanden zouden meer
// ceremonie dan inhoud zijn.

import { ACTIVATION_POSES } from "./activatie";
import { CORE_POSES } from "./core";
import { MOBILITY_POSES } from "./mobiliteit";
import type { Pose } from "./figure-kit";

export { Figure } from "./figure-kit";
export type { Pose } from "./figure-kit";

export const MOBILITY_FIGURES: Record<string, Pose[]> = {
  ...CORE_POSES,
  ...MOBILITY_POSES,
  ...ACTIVATION_POSES,
};

export function figurePoses(slug: string | null | undefined): Pose[] | null {
  if (!slug) return null;
  return MOBILITY_FIGURES[slug] ?? null;
}
