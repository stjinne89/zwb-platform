import { notFound } from "next/navigation";
import { RACEN_CATEGORY_LABELS, racenArticleBySlug } from "@/lib/racen/library";
import { requireViewer } from "../../../_data";
import { KnowledgeArticleView } from "../../../_components/protocols/knowledge-article";

export const dynamic = "force-dynamic";

export default async function RacenArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireViewer();
  const article = racenArticleBySlug(slug);
  if (!article) notFound();

  return (
    <KnowledgeArticleView
      backHref="/zwbeter-worden/racen/kennis"
      category={RACEN_CATEGORY_LABELS[article.category]}
      article={article}
      articleHref={`/zwbeter-worden/racen/kennis/${article.slug}`}
    />
  );
}
