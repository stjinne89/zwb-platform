import { notFound } from "next/navigation";
import { loadRecipeBySlug, requireViewer } from "../../../_data";
import { saveOwnRecipe, searchFoods } from "../../../_actions";
import { RecipeForm } from "../../../_components/recipe-form";
import { BackLink } from "@/components/app-ui";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await requireViewer();
  const recipe = await loadRecipeBySlug(viewer, slug);
  // Clubrecepten en recepten van een ander zijn hier niet te bewerken.
  if (!recipe || recipe.is_standard || recipe.owner_id !== viewer.user.id) notFound();

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={`/zwbeter-worden/voeding/recepten/${recipe.slug}`} label={recipe.title} />
        <h2 className="mt-1 text-xl font-semibold">Recept bewerken</h2>
      </div>
      <RecipeForm
        saveAction={saveOwnRecipe}
        searchAction={searchFoods}
        initial={{
          recipe_id: recipe.id,
          title: recipe.title,
          meal_moment: recipe.meal_moment,
          fuel_profile: recipe.fuel_profile,
          diet_tags: recipe.diet_tags,
          servings: recipe.servings,
          prep_minutes: recipe.prep_minutes,
          steps_md: recipe.steps_md,
          rows: recipe.ingredients.map((item) => ({
            food: { id: item.food.id, name_nl: item.food.name_nl, quantity_unit: item.food.quantity_unit },
            grams: String(item.grams).replace(".", ","),
            role: item.role,
          })),
        }}
      />
    </div>
  );
}
