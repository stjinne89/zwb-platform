import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireViewer } from "../../_data";
import { saveOwnRecipe, searchFoods } from "../../_actions";
import { RecipeForm } from "../../_components/recipe-form";

export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  await requireViewer();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/zwbeter-worden/voeding/recepten"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="size-4" />
          Recepten
        </Link>
        <h2 className="mt-1 text-xl font-semibold">Eigen recept</h2>
      </div>
      <RecipeForm saveAction={saveOwnRecipe} searchAction={searchFoods} />
    </div>
  );
}
