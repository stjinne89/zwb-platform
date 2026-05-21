export const MARKETPLACE_CATEGORIES = [
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

export const KNOWLEDGE_CATEGORIES = [
  { value: "training", label: "Training" },
  { value: "routes", label: "Routes" },
  { value: "race-craft", label: "Race craft" },
  { value: "regelgeving", label: "Regelgeving" },
  { value: "voeding", label: "Voeding" },
  { value: "algemeen", label: "Algemeen" },
] as const;

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
  { value: "training", label: "Training" },
  { value: "routes", label: "Routes" },
  { value: "race-craft", label: "Race craft" },
  { value: "regelgeving", label: "Regelgeving" },
  { value: "algemeen", label: "Algemeen" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

export const CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label])),
  materiaal: "Materiaal (oud)",
};

export const POST_KINDS = [
  {
    value: "aanbod",
    label: "Aanbod",
    icon: "tag",
    tone: "primary",
    description: "Te koop, te ruil of gratis af te halen.",
  },
  {
    value: "gezocht",
    label: "Gezocht",
    icon: "search",
    tone: "accent",
    description: "Je zoekt iets en andere leden kunnen reageren.",
  },
  {
    value: "vraag",
    label: "Vraag",
    icon: "question",
    tone: "sage",
    description: "Een hulpvraag of adviesvraag aan de community.",
  },
  {
    value: "tip",
    label: "Tip",
    icon: "sparkles",
    tone: "steel",
    description: "Een tip, ervaring of aanbeveling voor andere ZWB'ers.",
  },
] as const;

export type PostKind = (typeof POST_KINDS)[number]["value"];

export const POST_KIND_LABELS: Record<string, string> = Object.fromEntries(
  POST_KINDS.map((k) => [k.value, k.label]),
);

export const POST_KIND_META = Object.fromEntries(
  POST_KINDS.map((k) => [k.value, k]),
) as Record<PostKind, (typeof POST_KINDS)[number]>;

export const POST_STATUSES = [
  { value: "open", label: "Open" },
  { value: "gereserveerd", label: "Gereserveerd" },
  { value: "afgerond", label: "Afgerond" },
] as const;

export type PostStatus = (typeof POST_STATUSES)[number]["value"];

export const POST_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  POST_STATUSES.map((s) => [s.value, s.label]),
);

export function categoriesForKind(kind: PostKind) {
  return kind === "aanbod" || kind === "gezocht"
    ? MARKETPLACE_CATEGORIES
    : KNOWLEDGE_CATEGORIES;
}

export function hasPriceField(kind: PostKind) {
  return kind === "aanbod" || kind === "gezocht";
}
