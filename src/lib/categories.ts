// Marketplace-categorieën voor /materiaal (Vraag en Aanbod).
export const CATEGORIES = [
  { value: "fiets", label: "Hele fiets" },
  { value: "frame", label: "Frame" },
  { value: "wielen", label: "Wielen" },
  { value: "componenten", label: "Componenten" },
  { value: "kleding", label: "Kleding" },
  { value: "schoenen", label: "Schoenen" },
  { value: "helm", label: "Helm" },
  { value: "accessoires", label: "Accessoires" },
  { value: "training-gear", label: "Training-gear" },
  { value: "tools", label: "Tools" },
  { value: "voeding", label: "Voeding" },
  { value: "overig", label: "Overig" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

// Labels voor bestaande posts (oude kennisbank-categorieën) + nieuwe markt.
export const CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label])),
  // Legacy categorieën voor backwards compat met oude posts:
  materiaal: "Materiaal (oud)",
  training: "Training (oud)",
  "race-craft": "Race craft (oud)",
  regelgeving: "Regelgeving (oud)",
  routes: "Routes (oud)",
  algemeen: "Algemeen (oud)",
};

export const POST_KINDS = [
  { value: "aanbod", label: "Aanbod", icon: "💰" },
  { value: "vraag", label: "Vraag", icon: "🔍" },
] as const;

export type PostKind = (typeof POST_KINDS)[number]["value"];

export const POST_KIND_LABELS: Record<string, string> = Object.fromEntries(
  POST_KINDS.map((k) => [k.value, k.label]),
);
