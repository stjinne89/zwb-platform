// Een bron in een kennisbank of protocol. Zelfde vorm als NutritionSource en
// StrengthSource; die blijven bestaan zodat hun bestanden niet hoeven te wijzigen.

import type { EvidenceKind } from "@/lib/nutrition/library";

export type KnowledgeSource = {
  citation: string;
  year: number;
  url: string;
  kind: EvidenceKind;
};

export const doi = (id: string) => `https://doi.org/${id}`;
