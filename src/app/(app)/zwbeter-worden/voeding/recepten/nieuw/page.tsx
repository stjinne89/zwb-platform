import { Link2 } from "lucide-react";
import { requireViewer } from "../../_data";
import { saveOwnRecipe, searchFoods } from "../../_actions";
import { lookupRecipeBarcode } from "../../_log-actions";
import { prefillFromLink } from "../../_import";
import { RecipeForm } from "../../_components/recipe-form";
import { BackLink } from "@/components/app-ui";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Search = { link?: string | string[]; soort?: string | string[] };

export default async function NewRecipePage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const viewer = await requireViewer();
  const link = (Array.isArray(params.link) ? params.link[0] : params.link)?.trim() ?? "";
  // De pagina haalt het recept zelf op: een link in de URL is te delen en te herladen.
  const prefill = link ? await prefillFromLink(viewer, link) : null;
  // Vanaf "Sportvoeding" in het receptenboek: een gel of bidon, voor onderweg.
  const sport = (Array.isArray(params.soort) ? params.soort[0] : params.soort) === "sportvoeding";

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/zwbeter-worden/voeding/recepten" label="Receptenboek" />
        <h2 className="mt-1 text-xl font-semibold">{sport ? "Sportvoeding" : "Eigen recept"}</h2>
      </div>

      {!sport && (
        <form method="get" className="flex flex-wrap items-start gap-2">
          <label className="min-w-0 flex-1 basis-64">
            <span className="sr-only">Link naar een recept</span>
            <input
              name="link"
              type="url"
              required
              defaultValue={link}
              placeholder="Link naar een recept"
              className="min-h-[44px] w-full rounded-md border bg-background px-3"
            />
          </label>
          <Button type="submit" variant="outline" className="min-h-[44px]">
            <Link2 className="size-4" />
            Ophalen
          </Button>
          {prefill && !prefill.ok && <p className="basis-full text-sm text-destructive">{prefill.error}</p>}
        </form>
      )}

      {prefill?.ok ? (
        <RecipeForm
          key={link}
          initial={prefill.initial}
          pending={prefill.pending}
          saveAction={saveOwnRecipe}
          searchAction={searchFoods}
          barcodeAction={lookupRecipeBarcode}
        />
      ) : (
        <RecipeForm
          saveAction={saveOwnRecipe}
          searchAction={searchFoods}
          barcodeAction={lookupRecipeBarcode}
          defaultMoment={sport ? "tijdens_rit" : undefined}
        />
      )}
    </div>
  );
}
