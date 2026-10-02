import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/app-ui";
import { basePortion } from "@/lib/nutrition/scale";
import { MEAL_MOMENT_LABELS } from "@/lib/nutrition/targets";
import { loadProposedRecipes, requireViewer } from "../../_data";
import { reviewSharedRecipe } from "../../_actions";
import { ReviewRecipeButtons } from "../../_components/recipe-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Recepten die leden met de club willen delen. Alleen voor wie schema's mag
// maken; RLS (0213) laat anderen de voorgestelde recepten ook niet zien.
export default async function ProposedRecipesPage() {
  const viewer = await requireViewer();
  if (!viewer.access.has("training.create_plans")) notFound();

  const recipes = await loadProposedRecipes(viewer);

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/zwbeter-worden/voeding" label="Voeding" />
        <h2 className="mt-1 text-xl font-semibold">Voorgestelde recepten</h2>
      </div>

      {recipes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Geen voorstellen.</p>
      ) : (
        <ul className="space-y-3">
          {recipes.map((recipe) => {
            const portion = basePortion(
              recipe.ingredients.map((item) => ({ food: item.food, grams: item.grams, role: item.role })),
              recipe.servings,
            ).perPortion;
            return (
              <li key={recipe.id} className="space-y-3 rounded-lg border bg-card p-4">
                <div>
                  <Link
                    href={`/zwbeter-worden/voeding/recepten/${recipe.slug}`}
                    className="font-semibold hover:text-primary hover:underline"
                  >
                    {recipe.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[
                      recipe.owner_name,
                      MEAL_MOMENT_LABELS[recipe.meal_moment],
                      `${Math.round(portion.carbsG)} g koolhydraten`,
                      `${Math.round(portion.proteinG)} g eiwit`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <ReviewRecipeButtons recipeId={recipe.id} action={reviewSharedRecipe} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
