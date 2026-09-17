import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MEAL_MOMENT_LABELS } from "@/lib/nutrition/targets";
import type { Macros } from "@/lib/nutrition/scale";
import type { Recipe } from "@/lib/nutrition/recipes";

function grams(value: number) {
  return Math.round(value);
}

export function RecipeCard({ recipe, portion }: { recipe: Recipe; portion: Macros }) {
  return (
    <Link
      href={`/zwbeter-worden/voeding/recepten/${recipe.slug}`}
      className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border bg-card p-4 hover:border-primary"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{recipe.title}</h3>
          {!recipe.is_standard && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Eigen</span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {MEAL_MOMENT_LABELS[recipe.meal_moment]}
          {recipe.prep_minutes ? ` · ${recipe.prep_minutes} min` : ""} · {grams(portion.carbsG)} g koolhydraten ·{" "}
          {grams(portion.proteinG)} g eiwit
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
