// Onderwerpen van ZWBieb: kennis (waar je ervaring mee hebt) en spullen (wat
// je wilt uitlenen). Sinds 0242 staan ze in de database (knowledge_topics),
// zodat leden er zelf bij kunnen zetten. De lijsten hieronder zijn de startlijst
// die 0242 erin zet; een test houdt beide gelijk.
//
// In de startlijst staat bewust geen gezondheidsonderwerp (blessures, herstel na
// ziekte): wie zich daar als kenner meldt, vertelt de hele club iets over zijn
// gezondheid.

export const BUILT_IN_TOPICS = [
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

export const BUILT_IN_ITEMS = [
  { slug: "fietskoffer", label: "Fietskoffer of fietstas" },
  { slug: "momentsleutel", label: "Momentsleutel" },
  { slug: "fietsendrager", label: "Fietsendrager (trekhaak)" },
  { slug: "dakdrager-zuignap", label: "Dakdrager met zuignappen (SeaSucker)" },
  { slug: "werkstandaard", label: "Werkstandaard" },
  { slug: "camper", label: "Camper" },
] as const;

export type TopicKind = "kennis" | "spullen";

export function isTopicKind(value: unknown): value is TopicKind {
  return value === "kennis" || value === "spullen";
}

export const TOPIC_SLUG_PATTERN = /^[a-z0-9-]{2,40}$/;
export const TOPIC_LABEL_MIN = 2;
export const TOPIC_LABEL_MAX = 40;

export type TopicOption = { slug: string; label: string; kind: TopicKind };

export type TopicRow = TopicOption & {
  sort_order: number;
  status: "active" | "hidden";
};

/** De onderwerpen zoals een pagina ze gebruikt: kiesbaar, en een naam per slug. */
export type TopicCatalog = {
  /** Kiesbare onderwerpen (niet verborgen), in volgorde. */
  options: TopicOption[];
  kindOf: (slug: string) => TopicKind | null;
  /** Alle onderwerpen, ook verborgen, in volgorde. */
  all: TopicRow[];
  label: (slug: string) => string;
  /** Bestaat en is kiesbaar. */
  isActive: (slug: unknown) => slug is string;
  /** Bestaat, ook als hij verborgen is. */
  exists: (slug: unknown) => slug is string;
};

export function buildTopicCatalog(rows: TopicRow[]): TopicCatalog {
  const all = [...rows].sort(
    (a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, "nl"),
  );
  const bySlug = new Map(all.map((row) => [row.slug, row]));
  return {
    all,
    options: all
      .filter((row) => row.status === "active")
      .map(({ slug, label, kind }) => ({ slug, label, kind })),
    kindOf: (slug) => bySlug.get(slug)?.kind ?? null,
    label: (slug) => bySlug.get(slug)?.label ?? slug,
    isActive: (slug): slug is string =>
      typeof slug === "string" && bySlug.get(slug)?.status === "active",
    exists: (slug): slug is string => typeof slug === "string" && bySlug.has(slug),
  };
}

/** Naam per slug, voor componenten die geen functie kunnen ontvangen. */
export function topicLabels(catalog: TopicCatalog): Record<string, string> {
  return Object.fromEntries(catalog.all.map((row) => [row.slug, row.label]));
}

/** Naam en soort per slug. */
export function topicInfo(catalog: TopicCatalog): Record<string, { label: string; kind: TopicKind }> {
  return Object.fromEntries(catalog.all.map((row) => [row.slug, { label: row.label, kind: row.kind }]));
}

/** Zelfde vergelijking als de unieke index in 0242: hoofdletters en spaties tellen niet. */
export function normalizeTopicLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

/** "Tijdrijden & TT" wordt "tijdrijden-tt"; accenten vallen weg. */
export function slugifyTopic(label: string): string {
  return normalizeTopicLabel(label)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/** Bestaande onderwerpen die lijken op wat iemand typt, om dubbelingen te voorkomen. */
export function similarTopics(options: TopicOption[], query: string, limit = 5): TopicOption[] {
  const needle = slugifyTopic(query);
  if (needle.length < 2) return [];
  const words = needle.split("-").filter((word) => word.length >= 3);
  return options
    .filter((option) => {
      const hay = slugifyTopic(option.label);
      return hay.includes(needle) || words.some((word) => hay.includes(word));
    })
    .slice(0, limit);
}
