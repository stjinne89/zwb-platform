// Een kennisartikel met beperkingen en bronnen, plus de protocollen die erop
// leunen. Zelfde opbouw als de artikelen in de kennisbank kracht.

import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, ExternalLink } from "lucide-react";
import { BackLink } from "@/components/app-ui";
import { MethodLabelBadge } from "@/components/method-label-badge";
import type { KnowledgeSource } from "@/lib/knowledge/source";
import { EVIDENCE_LABELS } from "@/lib/nutrition/library";
import { PROTOCOLS } from "@/lib/protocols";
import type { ArticleConclusion, ArticleEvidence } from "@/lib/knowledge/evidence";
import { EvidenceBadge } from "@/components/evidence-badge";
import { ArticleExperts } from "@/app/(app)/zwbieb/_components/article-experts";

/** Protocollen die naar dit kennisartikel verwijzen. */
export function protocolLinksFor(articleHref: string): { href: string; title: string }[] {
  return PROTOCOLS.filter((protocol) => protocol.article?.href === articleHref).map((protocol) => ({
    href:
      protocol.pillar === "trainen"
        ? `/zwbeter-worden/protocollen/${protocol.slug}`
        : `/zwbeter-worden/voeding/protocollen/${protocol.slug}`,
    title: protocol.title,
  }));
}

export function ProtocolLinks({ articleHref }: { articleHref: string }) {
  const links = protocolLinksFor(articleHref);
  if (links.length === 0) return null;
  return (
    <section className="max-w-3xl space-y-3">
      <h3 className="font-semibold">Protocollen</h3>
      <ul className="divide-y rounded-lg border bg-card px-4 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex min-h-[44px] items-center justify-between gap-3 hover:text-primary"
            >
              {link.title}
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function KnowledgeArticleView({
  backHref,
  category,
  article,
  articleHref,
}: {
  backHref: string;
  category: string;
  article: {
    title: string;
    summary: string;
    points: string[];
    limits: string[];
    sources: KnowledgeSource[];
    methodLabel?: string;
    evidence: ArticleEvidence;
    conclusion?: ArticleConclusion;
  };
  articleHref: string;
}) {
  return (
    <article className="space-y-6">
      <div>
        <BackLink href={backHref} label="Kennisbank" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
        <h2 className="mt-1 text-xl font-semibold">{article.title}</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">{article.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <EvidenceBadge evidence={article.evidence} conclusion={article.conclusion} />
          <MethodLabelBadge label={article.methodLabel} />
        </div>
      </div>

      <ul className="max-w-3xl space-y-2 rounded-lg border bg-card p-5 text-sm">
        {article.points.map((point) => (
          <li key={point} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <section className="max-w-3xl space-y-3">
        <h3 className="font-semibold">Wat dit niet laat zien</h3>
        <ul className="space-y-2 rounded-lg border bg-card p-5 text-sm">
          {article.limits.map((limit) => (
            <li key={limit} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{limit}</span>
            </li>
          ))}
        </ul>
      </section>

      <ProtocolLinks articleHref={articleHref} />

      <ArticleExperts articleHref={articleHref} />

      <section className="max-w-3xl space-y-3">
        <h3 className="font-semibold">Bronnen</h3>
        <ol className="space-y-3 text-sm">
          {article.sources.map((source) => (
            <li key={source.url} className="rounded-md border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {EVIDENCE_LABELS[source.kind]}
                </span>
                <span className="text-xs text-muted-foreground">{source.year}</span>
              </div>
              <p className="mt-1">{source.citation}</p>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex min-h-[44px] items-center gap-1 break-all text-primary hover:underline"
              >
                Open bron
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
            </li>
          ))}
        </ol>
      </section>

      <p className="max-w-3xl text-xs text-muted-foreground">
        Eigen samenvatting van de bronnen, niet nagekeken door een trainer of sportarts.
      </p>
    </article>
  );
}
