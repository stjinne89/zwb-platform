
import { requireViewer } from "../../_data";
import { saveOwnRecipe, searchFoods } from "../../_actions";
import { RecipeForm } from "../../_components/recipe-form";
import { BackLink } from "@/components/app-ui";

export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  await requireViewer();

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/zwbeter-worden/voeding/recepten" label="Recepten" />
        <h2 className="mt-1 text-xl font-semibold">Eigen recept</h2>
      </div>
      <RecipeForm saveAction={saveOwnRecipe} searchAction={searchFoods} />
    </div>
  );
}
