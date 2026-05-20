export const CATEGORIES = [
  { value: "algemeen", label: "Algemeen" },
  { value: "voeding", label: "Voeding" },
  { value: "materiaal", label: "Materiaal" },
  { value: "training", label: "Training" },
  { value: "race-craft", label: "Race craft" },
  { value: "regelgeving", label: "Regelgeving" },
  { value: "routes", label: "Routes" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);
