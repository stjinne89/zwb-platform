import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  STRENGTH_CATEGORY_LABELS,
  strengthArticlesByCategory,
} from "@/lib/training/strength-library";
import { requireViewer } from "../_data";

export const dynamic = "force-dynamic";

export default async function StrengthKnowledgePage() {
  await requireViewer();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Kennisbank</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {strengthArticlesByCategory().map(({ category, articles }) => (
          <div key={category} className="rounded-lg border bg-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {STRENGTH_CATEGORY_LABELS[category]}
            </h3>
            <ul className="mt-2 divide-y">
              {articles.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/zwbeter-worden/core/kennis/${article.slug}`}
                    className="flex min-h-[44px] items-center justify-between gap-3 text-sm hover:text-primary"
                  >
                    {article.title}
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
