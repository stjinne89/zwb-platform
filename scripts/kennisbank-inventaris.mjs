// Inventaris van de kennisbanken en protocollen: per artikel de kern, de
// beperkingen en de bronnen, en daarna alle bronnen op één lijst.
//
// Voor de maandelijkse literatuurscan (.claude/skills/kennisbank-scan): die moet
// weten welke onderwerpen er zijn en welke bronnen er al in staan, zonder vijf
// bestanden met elk honderden regels door te lezen. Leest de bestanden zelf, dus
// de lijst is altijd die van de huidige commit.
//
//   node scripts/kennisbank-inventaris.mjs          markdown
//   node scripts/kennisbank-inventaris.mjs --json   JSON
//   node scripts/kennisbank-inventaris.mjs --ids    alleen DOI's en PMID's

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(root, "src") } });

const { COACH_KNOWLEDGE_BASES } = await jiti.import(path.join(root, "src/lib/knowledge/coach.ts"));
const { PROTOCOLS } = await jiti.import(path.join(root, "src/lib/protocols/index.ts"));

const PROTOCOL_PATHS = { trainen: "/zwbeter-worden/protocollen", voeden: "/zwbeter-worden/voeding/protocollen" };

const sections = [
  ...COACH_KNOWLEDGE_BASES.map((base) => ({
    title: `Kennisbank ${base.title}`,
    items: base.articles.map((article) => ({
      title: article.title,
      path: `${base.basePath}/${article.slug}`,
      summary: article.summary,
      points: article.points,
      limits: article.limits,
      sources: article.sources,
      evidence: article.evidence,
      conclusion: article.conclusion ?? null,
      methodLabel: article.methodLabel ?? null,
    })),
  })),
  {
    title: "Protocollen",
    items: PROTOCOLS.map((protocol) => ({
      title: protocol.title,
      path: `${PROTOCOL_PATHS[protocol.pillar]}/${protocol.slug}`,
      summary: protocol.summary,
      points: [],
      limits: protocol.limits,
      sources: protocol.sources,
      evidence: protocol.evidence,
      conclusion: null,
      methodLabel: protocol.methodLabel ?? null,
    })),
  },
];

// Eén regel per bron, met waar hij gebruikt wordt. De url is de sleutel: een
// DOI-link is uniek, en een bron zonder DOI heeft een eigen url.
const sources = new Map();
for (const section of sections) {
  for (const item of section.items) {
    for (const source of item.sources) {
      const entry = sources.get(source.url) ?? { ...source, usedIn: [] };
      entry.usedIn.push(item.path);
      sources.set(source.url, entry);
    }
  }
}
const sourceList = [...sources.values()].sort((a, b) => a.year - b.year || a.citation.localeCompare(b.citation));

if (process.argv.includes("--ids")) {
  // Kale DOI's en PMID's, voor de controle op teruggetrokken artikelen in PubMed.
  for (const { url } of sourceList) {
    const id = url.match(/doi\.org\/(.+)$/)?.[1] ?? url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/)?.[1];
    if (id) console.log(decodeURIComponent(id));
  }
} else if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ sections, sources: sourceList }, null, 2));
} else {
  const lines = [];
  for (const section of sections) {
    lines.push(`## ${section.title} (${section.items.length})`, "");
    for (const item of section.items) {
      lines.push(`### ${item.title}`, `Pad: ${item.path}`, `Samenvatting: ${item.summary}`);
      lines.push(`Bewijs: ${item.evidence}${item.conclusion ? `, ${item.conclusion}` : ""}`);
      if (item.methodLabel) lines.push(`Label: ${item.methodLabel}`);
      lines.push(...item.points.map((point) => `- ${point}`));
      if (item.limits.length) lines.push("Beperkingen:", ...item.limits.map((limit) => `- ${limit}`));
      lines.push("Bronnen:", ...item.sources.map((source) => `- ${source.year} · ${source.kind} · ${source.citation} · ${source.url}`), "");
    }
  }
  lines.push(`## Alle bronnen (${sourceList.length})`, "");
  for (const source of sourceList) {
    lines.push(`- ${source.year} · ${source.kind} · ${source.url} · ${source.citation} · in ${source.usedIn.length}: ${source.usedIn.join(", ")}`);
  }
  console.log(lines.join("\n"));
}
