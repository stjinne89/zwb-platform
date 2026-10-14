import { notFound } from "next/navigation";
import { requireViewer } from "../../_data";
import { trainingArticleBySlug, TRAINING_CATEGORY_LABELS } from "@/lib/training/training-library";
import { KnowledgeArticleView } from "../../_components/protocols/knowledge-article";

export const dynamic = "force-dynamic";

export default async function TrainingArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireViewer();
  const article = trainingArticleBySlug(slug);
  if (!article) notFound();

  return (
    <KnowledgeArticleView
      backHref="/zwbeter-worden/kennis"
      category={TRAINING_CATEGORY_LABELS[article.category]}
      article={article}
      articleHref={`/zwbeter-worden/kennis/${article.slug}`}
    />
  );
}
