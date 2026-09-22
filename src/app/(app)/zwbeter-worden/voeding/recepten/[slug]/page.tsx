import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { DIET_TAG_LABELS, FUEL_PROFILE_LABELS, portionForRider } from "@/lib/nutrition/recipes";
import { MEAL_MOMENT_LABELS } from "@/lib/nutrition/targets";
import { nutritionDay } from "@/lib/nutrition/tips";
import {
  energyFactorFor,
  loadNutritionDayInput,
  loadNutritionProfile,
  loadRecipeBySlug,
  requireViewer,
  todayKeyAmsterdam,
} from "../../_data";
import { deleteOwnRecipe } from "../../_actions";
import { DeleteRecipeButton } from "../../_components/delete-recipe-button";
import { BackLink } from "@/components/app-ui";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function amount(grams: number, unit: "g" | "ml") {
  return `${String(grams).replace(".", ",")} ${unit}`;
}

function macro(value: number) {
  return `${Math.round(value)} g`;
}

export default async function RecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ portie?: string | string[] }>;
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();

  const [recipe, profile] = await Promise.all([
    loadRecipeBySlug(viewer, slug),
    loadNutritionProfile(viewer, today),
  ]);
  if (!recipe) notFound();

  const wantsBase = search.portie === "basis";
  const personal = !wantsBase && profile.weightKg != null;
  const day = personal ? nutritionDay(await loadNutritionDayInput(viewer, today, profile.weightKg)) : null;
  const portion = portionForRider(
    recipe,
    day
      ? {
          weightKg: profile.weightKg,
          energyFactor: energyFactorFor(profile),
          dayType: day.dayType,
          rideMinutes: day.rideMinutes,
        }
      : null,
  );
  const unitByFood = new Map(recipe.ingredients.map((item) => [item.food.id, item.food.quantity_unit]));
  const own = !recipe.is_standard && recipe.owner_id === viewer.user.id;

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/zwbeter-worden/voeding/recepten" label="Recepten" />
        <h2 className="mt-1 text-xl font-semibold">{recipe.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {[
            MEAL_MOMENT_LABELS[recipe.meal_moment],
            FUEL_PROFILE_LABELS[recipe.fuel_profile],
            recipe.prep_minutes ? `${recipe.prep_minutes} min` : null,
            ...recipe.diet_tags.map((tag) => DIET_TAG_LABELS[tag]),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3 rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{personal ? "Jouw portie vandaag" : "Eén portie"}</h3>
            {profile.weightKg != null && (
              <Link
                href={`/zwbeter-worden/voeding/recepten/${recipe.slug}${personal ? "?portie=basis" : ""}`}
                className="inline-flex min-h-[44px] items-center text-sm text-primary hover:underline"
              >
                {personal ? "Standaardportie" : "Jouw portie"}
              </Link>
            )}
          </div>
          <ul className="divide-y text-sm">
            {portion.ingredients.map((item, index) => (
              <li key={`${item.food.id}-${index}`} className="flex justify-between gap-3 py-2">
                <span className="min-w-0">{item.food.name_nl}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {amount(item.grams, unitByFood.get(item.food.id) ?? "g")}
                </span>
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-4 gap-2 border-t pt-3 text-center text-sm">
            {[
              ["Koolh.", portion.perPortion.carbsG],
              ["Eiwit", portion.perPortion.proteinG],
              ["Vet", portion.perPortion.fatG],
              ["Vezels", portion.perPortion.fiberG],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-semibold tabular-nums">
                  {portion.perPortion.incomplete ? "≥ " : ""}
                  {macro(value as number)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold">Bereiding</h3>
          <div className="mt-2">
            <Markdown source={recipe.steps_md || "-"} />
          </div>
          {recipe.servings > 1 && (
            <p className="mt-3 text-xs text-muted-foreground">
              De bereiding is voor {recipe.servings} porties.
            </p>
          )}
        </div>
      </section>

      {own && (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/zwbeter-worden/voeding/recepten/${recipe.slug}/bewerken`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border px-3 text-sm font-medium hover:border-primary"
          >
            <Pencil className="size-4" />
            Bewerken
          </Link>
          <DeleteRecipeButton recipeId={recipe.id} deleteAction={deleteOwnRecipe} />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Gebaseerd op gegevens van NEVO-online versie 2025/9.0, RIVM, Bilthoven.
      </p>
    </div>
  );
}
