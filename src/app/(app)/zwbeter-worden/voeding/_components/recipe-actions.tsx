"use client";

// Knoppen bij een recept: favoriet of "niet voor mij", delen met de club, en
// het beoordelen van een gedeeld recept.

import { useActionState } from "react";
import { Check, EyeOff, Heart, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RecipePref } from "@/lib/nutrition/menu";
import type { ShareStatus } from "@/lib/nutrition/recipes";

type ActionResult = { ok: true } | { ok: false; error: string };
type Action = (formData: FormData) => Promise<ActionResult>;

function useFormAction(action: Action) {
  return useActionState(async (_previous: ActionResult | null, formData: FormData) => action(formData), null);
}

export function RecipePrefButtons({
  recipeId,
  pref,
  action,
}: {
  recipeId: string;
  pref: RecipePref | null;
  action: Action;
}) {
  const [state, submit, pending] = useFormAction(action);
  const favorite = pref === "favoriet";
  const hidden = pref === "verborgen";

  return (
    <form action={submit} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="recipe_id" value={recipeId} />
      <Button
        type="submit"
        name="pref"
        value={favorite ? "" : "favoriet"}
        variant={favorite ? "default" : "outline"}
        className="min-h-[44px]"
        disabled={pending}
        aria-pressed={favorite}
      >
        <Heart className="size-4" />
        Favoriet
      </Button>
      <Button
        type="submit"
        name="pref"
        value={hidden ? "" : "verborgen"}
        variant={hidden ? "default" : "outline"}
        className="min-h-[44px]"
        disabled={pending}
        aria-pressed={hidden}
      >
        <EyeOff className="size-4" />
        Niet voor mij
      </Button>
      {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
    </form>
  );
}

export function ShareRecipeButton({
  recipeId,
  status,
  action,
}: {
  recipeId: string;
  status: ShareStatus | null;
  action: Action;
}) {
  const [state, submit, pending] = useFormAction(action);
  const proposed = status === "voorgesteld";

  return (
    <form action={submit} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="recipe_id" value={recipeId} />
      <input type="hidden" name="share" value={proposed ? "0" : "1"} />
      <Button type="submit" variant="outline" className="min-h-[44px]" disabled={pending}>
        <Share2 className="size-4" />
        {proposed ? "Voorstel intrekken" : "Deel met de club"}
      </Button>
      {proposed && <span className="text-sm text-muted-foreground">Voorgesteld</span>}
      {status === "afgewezen" && <span className="text-sm text-muted-foreground">Niet overgenomen</span>}
      {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
    </form>
  );
}

export function ReviewRecipeButtons({ recipeId, action }: { recipeId: string; action: Action }) {
  const [state, submit, pending] = useFormAction(action);

  return (
    <form action={submit} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="recipe_id" value={recipeId} />
      <Button type="submit" name="decision" value="goedkeuren" className="min-h-[44px]" disabled={pending}>
        <Check className="size-4" />
        Goedkeuren
      </Button>
      <Button type="submit" name="decision" value="afwijzen" variant="outline" className="min-h-[44px]" disabled={pending}>
        <X className="size-4" />
        Afwijzen
      </Button>
      {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
    </form>
  );
}
