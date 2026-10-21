import type { Recipe } from "@/lib/nutrition/recipes";

/**
 * Wie een recept met de leden deelt: avatar en naam als de maker dat wil,
 * anders alleen "Lid". Niets bij clubrecepten en privérecepten.
 */
export function RecipeSharer({ recipe, size = 20 }: { recipe: Recipe; size?: number }) {
  if (recipe.is_standard || recipe.visibility !== "leden") return null;
  const person = recipe.show_owner ? recipe.sharer : null;
  const name = person?.display_name?.trim() || "Lid";

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
        aria-hidden
      >
        {person?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.avatar_url}
            alt=""
            width={size}
            height={size}
            className="size-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : person ? (
          name.charAt(0).toUpperCase()
        ) : null}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}
