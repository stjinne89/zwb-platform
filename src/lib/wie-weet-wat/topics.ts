// Onderwerpen voor "Wie weet wat". Een vaste lijst in code, zodat leden elkaar
// vinden onder hetzelfde woord in plaats van onder vijf spellingen van "gravel".
// De slug staat in de database (member_knowledge_topics, member_tips,
// knowledge_threads) en moet aan '^[a-z0-9-]{2,40}$' voldoen.
//
// Bewust geen gezondheidsonderwerp (blessures, herstel na ziekte): wie zich daar
// als kenner meldt, vertelt de hele club iets over zijn gezondheid.

export const KNOWLEDGE_TOPICS = [
  { slug: "zwift-racen", label: "Zwift-racen (ZRL, WTRL)" },
  { slug: "zwift-setup", label: "Zwift-setup en smart trainers" },
  { slug: "vermogensmeters", label: "Vermogensmeters" },
  { slug: "trainen-met-schema", label: "Trainen met schema" },
  { slug: "data-apps", label: "Strava, intervals.icu en Garmin" },
  { slug: "voeding-onderweg", label: "Eten en drinken onderweg" },
  { slug: "kracht-core", label: "Kracht en core" },
  { slug: "bikefit", label: "Bikefit en houding" },
  { slug: "sleutelen", label: "Sleutelen en onderhoud" },
  { slug: "banden-tubeless", label: "Banden en tubeless" },
  { slug: "gravel", label: "Gravel en bikepacking" },
  { slug: "bergen-cols", label: "Bergen en cols" },
  { slug: "groepsrijden", label: "Rijden in een groep" },
  { slug: "toertochten", label: "Toertochten en granfondo's" },
  { slug: "kleding-weer", label: "Kleding en slecht weer" },
] as const;

export type KnowledgeTopicSlug = (typeof KNOWLEDGE_TOPICS)[number]["slug"];

const LABELS = new Map<string, string>(KNOWLEDGE_TOPICS.map((t) => [t.slug, t.label]));

export function isKnowledgeTopic(slug: unknown): slug is KnowledgeTopicSlug {
  return typeof slug === "string" && LABELS.has(slug);
}

export function topicLabel(slug: string): string {
  return LABELS.get(slug) ?? slug;
}
