import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Pencil } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { DIET_TAG_LABELS, FUEL_PROFILE_LABELS, portionForRider } from "@/lib/nutrition/recipes";
import { MEAL_MOMENT_LABELS } from "@/lib/nutrition/targets";
import { nutritionDay } from "@/lib/nutrition/tips";
import { MICRONUTRIENT_LABELS, portionTraits } from "@/lib/nutrition/traits";
import { logRecipe } from "../../_log-actions";
import { chooseMenuRecipe } from "../../_menu-actions";
import { MenuChoiceForm } from "../../_components/menu-choice-form";
import { choiceMoments } from "@/lib/nutrition/menu";
import { CHOICE_DAYS_AHEAD } from "@/lib/nutrition/plan";
import { shiftDayKey } from "@/lib/training/mobility";
import { LogActionButton } from "../../_components/log-controls";
import {
  energyFactorFor,
  loadLogSettings,
  loadNutritionDayInput,
  loadNutritionProfile,
  loadRecipeBySlug,
  loadRecipePrefs,
  requireViewer,
  todayKeyAmsterdam,
} from "../../_data";
import { deleteOwnRecipe, setRecipePref, shareOwnRecipe } from "../../_actions";
import { DeleteRecipeButton } from "../../_components/delete-recipe-button";
import { RecipePrefButtons, ShareRecipeButton } from "../../_components/recipe-actions";
import { RecipeSharer } from "../../_components/recipe-sharer";
import { BackLink } from "@/components/app-ui";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function menuDayLabel(day: string, index: number) {
  if (index === 0) return "Vandaag";
  if (index === 1) return "Morgen";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

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

  const [recipe, profile, prefs, logSettings] = await Promise.all([
    loadRecipeBySlug(viewer, slug),
    loadNutritionProfile(viewer, today),
    loadRecipePrefs(viewer),
    loadLogSettings(viewer),
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
          rideIntensity: day.rideIntensity,
        }
      : null,
  );
  const unitByFood = new Map(recipe.ingredients.map((item) => [item.food.id, item.food.quantity_unit]));
  const own = !recipe.is_standard && recipe.owner_id === viewer.user.id;
  const traits = portionTraits(portion.ingredients);
  const labels = [
    traits.lightDigest ? "Licht verteerbaar" : null,
    traits.fiberRich ? "Vezelrijk" : null,
    ...traits.richIn.map((key) => `Rijk aan ${MICRONUTRIENT_LABELS[key]}`),
  ].filter((label): label is string => label != null);

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/zwbeter-worden/voeding/recepten" label="Receptenboek" />
        {recipe.image_url && (
          // Van de site van het recept, niet bij ons opgeslagen (0264).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.image_url}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="mt-2 aspect-[16/9] w-full max-w-2xl rounded-lg border object-cover"
          />
        )}
        <h2 className="mt-1 text-xl font-semibold">{recipe.title}</h2>
        {recipe.from_member && (
          <div className="mt-1">
            <RecipeSharer recipe={recipe} size={24} />
          </div>
        )}
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
        {labels.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {labels.map((label) => (
              <li key={label} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {label}
              </li>
            ))}
          </ul>
        )}
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

      <div className="flex flex-wrap items-center gap-2">
        {logSettings && !logSettings.paused && (
          <LogActionButton
            action={logRecipe}
            fields={{ slug: recipe.slug, day: today, portie: personal ? "" : "basis" }}
            variant="default"
          >
            <Check className="size-4" />
            Gegeten
          </LogActionButton>
        )}
        <RecipePrefButtons recipeId={recipe.id} pref={prefs.get(recipe.id) ?? null} action={setRecipePref} />
      </div>

      <MenuChoiceForm
        recipeId={recipe.id}
        days={Array.from({ length: CHOICE_DAYS_AHEAD + 1 }, (_, index) => {
          const value = shiftDayKey(today, index);
          return { value, label: menuDayLabel(value, index) };
        })}
        moments={choiceMoments(recipe.meal_moment).map((moment) => ({
          value: moment,
          label: MEAL_MOMENT_LABELS[moment],
        }))}
        action={chooseMenuRecipe}
      />

      {own && (
        <div className="flex flex-wrap items-center gap-3">
          {recipe.visibility === "leden" && (
            <span className="text-sm text-muted-foreground">
              {recipe.show_owner ? "Gedeeld met alle leden" : "Gedeeld met alle leden, zonder naam"}
            </span>
          )}
          <ShareRecipeButton recipeId={recipe.id} status={recipe.share_status} action={shareOwnRecipe} />
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
        {recipe.contributor?.display_name ? `Van ${recipe.contributor.display_name}. ` : ""}
        {recipe.source_name ? (
          <>
            {recipe.is_standard ? "Naar" : "Bron"}:{" "}
            {recipe.source_url ? (
              <a href={recipe.source_url} target="_blank" rel="noreferrer" className="underline hover:text-primary">
                {recipe.source_name}
              </a>
            ) : (
              recipe.source_name
            )}
            .{" "}
          </>
        ) : null}
        Gebaseerd op gegevens van NEVO-online versie 2025/9.0, RIVM, Bilthoven.
      </p>
    </div>
  );
}
