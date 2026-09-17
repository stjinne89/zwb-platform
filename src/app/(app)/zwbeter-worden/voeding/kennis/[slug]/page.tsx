import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { EVIDENCE_LABELS, NUTRITION_CATEGORY_LABELS, articleBySlug } from "@/lib/nutrition/library";
import { requireViewer } from "../../_data";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireViewer();
  const article = articleBySlug(slug);
  if (!article) notFound();

  return (
    <article className="space-y-6">
      <div>
        <Link
          href="/zwbeter-worden/voeding"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="size-4" />
          Voeding
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {NUTRITION_CATEGORY_LABELS[article.category]}
        </p>
        <h2 className="mt-1 text-xl font-semibold">{article.title}</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">{article.summary}</p>
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
    </article>
  );
}
