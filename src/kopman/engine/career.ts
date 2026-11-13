// A new career with harder rules (round D of docs/kopman-breder.md, built
// 2026-11-13): after a title in the Wereldtour you may start again in the
// Kermis, with one rider as heirloom and one harder rule more. The rules stack.

export const RULES = ["minder-pakketten", "sterkere-rivalen", "sneller-oud", "krap-budget"] as const;
export type Rule = (typeof RULES)[number];

export const RULE_LABELS: Record<Rule, string> = {
  "minder-pakketten": "Alleen een pakket voor een zege",
  "sterkere-rivalen": "Rivaliserende kopmannen +1 kracht",
  "sneller-oud": "Renners worden twee jaar eerder oud",
  "krap-budget": "Budget 15% lager",
};

export type Career = { level: number; rules: Rule[] };
export const FIRST_CAREER: Career = { level: 1, rules: [] };

/** What the rules of a career change. */
export function ruleEffects(career: Career | undefined) {
  const has = (rule: Rule) => !!career?.rules.includes(rule);
  return {
    winPackOnly: has("minder-pakketten"),
    rivalXp: has("sterkere-rivalen") ? 1 : 0,
    ageShift: has("sneller-oud") ? 2 : 0,
    budget: has("krap-budget") ? 0.85 : 1,
  };
}

/** A title of the Wereldtour, for the erelijst over careers. */
export type Title = { career: number; season: number };
