// De tip zelf, gedeeld door de Vandaag-kaart en de voedingspagina.

import Link from "next/link";
import { BookOpen, ChevronRight, Utensils } from "lucide-react";
import type { NutritionTip as Tip } from "@/lib/nutrition/tips";
import type { Recipe } from "@/lib/nutrition/recipes";

export function NutritionTip({
  tip,
  recipe,
  titleHref,
}: {
  tip: Tip;
  recipe: Recipe | null;
  /** Op Vandaag linkt de titel door naar de voedingspagina. */
  titleHref?: string;
}) {
  const title = (
    <h2 className="flex items-center gap-2 font-semibold">
      <Utensils className="size-5 text-primary" />
      {tip.title}
    </h2>
  );

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-5">
        {titleHref ? (
          <Link href={titleHref} className="hover:underline">
            {title}
          </Link>
        ) : (
          title
        )}
        <p className="mt-1 text-sm text-muted-foreground">{tip.body}</p>
      </div>
      {recipe ? (
        <Link
          href={`/zwbeter-worden/voeding/recepten/${recipe.slug}`}
          className="flex min-h-[44px] items-center justify-between gap-3 border-t px-5 py-3 text-sm hover:bg-accent/40"
        >
          <span className="min-w-0 truncate">
            Recept: <span className="font-medium">{recipe.title}</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}
      <Link
        href={`/zwbeter-worden/voeding/kennis/${tip.articleSlug}`}
        className="flex min-h-[44px] items-center justify-between gap-3 border-t px-5 py-3 text-sm text-muted-foreground hover:bg-accent/40"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="size-4" />
          Waarom
        </span>
        <ChevronRight className="size-4 shrink-0" />
      </Link>
    </div>
  );
}
