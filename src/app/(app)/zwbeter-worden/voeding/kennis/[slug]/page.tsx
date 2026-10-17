import { notFound } from "next/navigation";
import { NUTRITION_CATEGORY_LABELS, articleBySlug } from "@/lib/nutrition/library";
import { requireViewer } from "../../_data";
import { KnowledgeArticleView } from "../../../_components/protocols/knowledge-article";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireViewer();
  const article = articleBySlug(slug);
  if (!article) notFound();

  return (
    <KnowledgeArticleView
      backHref="/zwbeter-worden/voeding/kennis"
      category={NUTRITION_CATEGORY_LABELS[article.category]}
      article={article}
      articleHref={`/zwbeter-worden/voeding/kennis/${article.slug}`}
    />
  );
}
