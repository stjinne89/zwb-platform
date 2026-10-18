import { notFound } from "next/navigation";
import { MATERIAAL_CATEGORY_LABELS, materiaalArticleBySlug } from "@/lib/materiaal/library";
import { requireViewer } from "../../../_data";
import { KnowledgeArticleView } from "../../../_components/protocols/knowledge-article";

export const dynamic = "force-dynamic";

export default async function MateriaalArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireViewer();
  const article = materiaalArticleBySlug(slug);
  if (!article) notFound();

  return (
    <KnowledgeArticleView
      backHref="/zwbeter-worden/materiaal/kennis"
      category={MATERIAAL_CATEGORY_LABELS[article.category]}
      article={article}
      articleHref={`/zwbeter-worden/materiaal/kennis/${article.slug}`}
    />
  );
}
