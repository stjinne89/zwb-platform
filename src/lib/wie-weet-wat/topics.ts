// Onderwerpen voor "Wie weet wat". Een vaste lijst in code, zodat leden elkaar
// vinden onder hetzelfde woord in plaats van onder vijf spellingen van "gravel".
// De slug staat in de database (member_knowledge_topics, member_tips,
// knowledge_threads) en moet aan '^[a-z0-9-]{2,40}$' voldoen.
//
// Bewust geen gezondheidsonderwerp (blessures, herstel na ziekte): wie zich daar
// als kenner meldt, vertelt de hele club iets over zijn gezondheid.
//
// De groep bepaalt de tenuekleur van het icoon (topic-badge.tsx): petrol voor
// rijden, teal voor trainen, sage voor materiaal.

export const KNOWLEDGE_TOPICS = [
  { slug: "zwift-racen", label: "Zwift-racen (ZRL, WTRL)", group: "rijden" },
  { slug: "zwift-setup", label: "Zwift-setup en smart trainers", group: "materiaal" },
  { slug: "vermogensmeters", label: "Vermogensmeters", group: "trainen" },
  { slug: "trainen-met-schema", label: "Trainen met schema", group: "trainen" },
  { slug: "data-apps", label: "Strava, intervals.icu en Garmin", group: "trainen" },
  { slug: "voeding-onderweg", label: "Eten en drinken onderweg", group: "trainen" },
  { slug: "kracht-core", label: "Kracht en core", group: "trainen" },
  { slug: "bikefit", label: "Bikefit en houding", group: "materiaal" },
  { slug: "sleutelen", label: "Sleutelen en onderhoud", group: "materiaal" },
  { slug: "banden-tubeless", label: "Banden en tubeless", group: "materiaal" },
  { slug: "gravel", label: "Gravel en bikepacking", group: "rijden" },
  { slug: "bergen-cols", label: "Bergen en cols", group: "rijden" },
  { slug: "groepsrijden", label: "Rijden in een groep", group: "rijden" },
  { slug: "toertochten", label: "Toertochten en granfondo's", group: "rijden" },
  { slug: "kleding-weer", label: "Kleding en slecht weer", group: "materiaal" },
] as const;

export type KnowledgeTopicGroup = (typeof KNOWLEDGE_TOPICS)[number]["group"];

export type KnowledgeTopicSlug = (typeof KNOWLEDGE_TOPICS)[number]["slug"];

const LABELS = new Map<string, string>(KNOWLEDGE_TOPICS.map((t) => [t.slug, t.label]));

export function isKnowledgeTopic(slug: unknown): slug is KnowledgeTopicSlug {
  return typeof slug === "string" && LABELS.has(slug);
}

const GROUPS = new Map<string, KnowledgeTopicGroup>(KNOWLEDGE_TOPICS.map((t) => [t.slug, t.group]));

export function topicGroup(slug: string): KnowledgeTopicGroup | null {
  return GROUPS.get(slug) ?? null;
}

export function topicLabel(slug: string): string {
  return LABELS.get(slug) ?? slug;
}
