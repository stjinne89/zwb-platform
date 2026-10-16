// De kennisbanken als tekst voor de coachchat.
//
// Tot 16 oktober 2026 kreeg de coach alleen de data van het lid en antwoordde hij
// op een vraag als "is 10 % per week veilig?" uit de algemene kennis van het
// model — precies de beweringen die de wetenschappelijke toets net had
// bijgesteld. Nu krijgt hij de drie kennisbanken mee, met per artikel het pad
// waar het lid het kan nalezen en de beperkingen die erbij horen.
//
// Alles, niet een selectie: het zijn een kleine vijftig artikelen, die passen in
// één keer. Zoeken (embeddings, een vectoropslag) zou alleen missers en
// infrastructuur toevoegen. De tekst is vast en staat vóór alles wat per lid
// verschilt, zodat de prompt-cache van OpenAI hem hergebruikt.

import { EVIDENCE_LABELS, NUTRITION_ARTICLES } from "@/lib/nutrition/library";
import type { KnowledgeSource } from "@/lib/knowledge/source";
import { STRENGTH_ARTICLES } from "@/lib/training/strength-library";
import { METHOD_LABEL_TEXT, type MethodLabel } from "@/lib/training/method-label";
import { TRAINING_ARTICLES } from "@/lib/training/training-library";

type Article = {
  slug: string;
  title: string;
  summary: string;
  points: string[];
  limits: string[];
  sources: KnowledgeSource[];
  /** Veelbelovend of experimenteel; de coach noemt het label erbij. */
  methodLabel?: MethodLabel;
};

/** De drie kennisbanken met het pad waaronder hun artikelen staan. */
export const COACH_KNOWLEDGE_BASES: Array<{ title: string; basePath: string; articles: Article[] }> = [
  { title: "Trainen", basePath: "/zwbeter-worden/kennis", articles: TRAINING_ARTICLES },
  { title: "Voeding", basePath: "/zwbeter-worden/voeding/kennis", articles: NUTRITION_ARTICLES },
  { title: "Kracht, core en mobiliteit", basePath: "/zwbeter-worden/core/kennis", articles: STRENGTH_ARTICLES },
];

/**
 * Korte bronvermelding: eerste auteur (of organisatie), "e.a." bij meer auteurs,
 * jaar en soort bewijs. Genoeg om een bron te kunnen noemen zonder er een te
 * verzinnen; de volledige verwijzing staat op de artikelpagina.
 */
export function shortSourceLabel(source: KnowledgeSource): string {
  const authors = source.citation.split(". ")[0] ?? source.citation;
  const first = authors.split(",")[0].trim().replace(/\s+[A-ZÀ-Ý]{1,4}$/u, "");
  const more = authors.includes(",") ? " e.a." : "";
  return `${first}${more} ${source.year} (${EVIDENCE_LABELS[source.kind].toLowerCase()})`;
}

function articleText(article: Article, basePath: string): string {
  const lines = [
    `### ${article.title}`,
    `Pad: ${basePath}/${article.slug}`,
    ...(article.methodLabel ? [`Label: ${METHOD_LABEL_TEXT[article.methodLabel]}`] : []),
    `Samenvatting: ${article.summary}`,
    ...article.points.map((point) => `- ${point}`),
  ];
  if (article.limits.length) {
    lines.push("Beperkingen:", ...article.limits.map((limit) => `- ${limit}`));
  }
  if (article.sources.length) {
    lines.push(`Bronnen: ${article.sources.map(shortSourceLabel).join("; ")}`);
  }
  return lines.join("\n");
}

let cached: string | null = null;

/** De kennisbanken als één vast tekstblok. Verandert alleen met een commit. */
export function coachKnowledgeText(): string {
  cached ??= COACH_KNOWLEDGE_BASES.map(
    (base) =>
      `## Kennisbank ${base.title}\n\n` +
      base.articles.map((article) => articleText(article, base.basePath)).join("\n\n"),
  ).join("\n\n");
  return cached;
}

let cachedPaths: Set<string> | null = null;

/** Alle paden die de coach mag noemen; andere blijven geen link. */
export function coachKnowledgePaths(): Set<string> {
  cachedPaths ??= new Set(
    COACH_KNOWLEDGE_BASES.flatMap((base) =>
      base.articles.map((article) => `${base.basePath}/${article.slug}`),
    ),
  );
  return cachedPaths;
}
