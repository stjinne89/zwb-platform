import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronRight, ExternalLink } from "lucide-react";
import { EVIDENCE_LABELS } from "@/lib/nutrition/library";
import {
  STRENGTH_CATEGORY_LABELS,
  strengthArticleBySlug,
} from "@/lib/training/strength-library";
import { BackLink } from "@/components/app-ui";
import { EvidenceBadge } from "@/components/evidence-badge";
import { loadSeries, requireViewer } from "../../_data";
import { ProtocolLinks } from "../../../_components/protocols/knowledge-article";
import { ArticleExperts } from "@/app/(app)/zwbieb/_components/article-experts";

export const dynamic = "force-dynamic";

export default async function StrengthArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await requireViewer();
  const article = strengthArticleBySlug(slug);
  if (!article) notFound();

  // Alleen series die echt bestaan: een seed die nog niet gedraaid is, levert
  // anders een dode link op.
  const linked = article.series?.length
    ? (await loadSeries(viewer)).filter((row) => article.series!.includes(row.slug))
    : [];

  return (
    <article className="space-y-6">
      <div>
        <BackLink href="/zwbeter-worden/core/kennis" label="Kennisbank" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {STRENGTH_CATEGORY_LABELS[article.category]}
        </p>
        <h2 className="mt-1 text-xl font-semibold">{article.title}</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">{article.summary}</p>
        <EvidenceBadge evidence={article.evidence} conclusion={article.conclusion} className="mt-3" />
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

      <ProtocolLinks articleHref={`/zwbeter-worden/core/kennis/${article.slug}`} />

      <ArticleExperts articleHref={`/zwbeter-worden/core/kennis/${article.slug}`} />

      {linked.length > 0 && (
        <section className="max-w-3xl space-y-3">
          <h3 className="font-semibold">Series</h3>
          <ul className="divide-y rounded-lg border bg-card px-4 text-sm">
            {linked.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/zwbeter-worden/core/series/${row.slug}`}
                  className="flex min-h-[44px] items-center justify-between gap-3 hover:text-primary"
                >
                  {row.title}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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
        Eigen samenvatting van de bronnen, niet nagekeken door een trainer of
        fysiotherapeut. Stop bij pijn; bij aanhoudende klachten ga je naar een
        fysiotherapeut of huisarts.
      </p>
    </article>
  );
}
