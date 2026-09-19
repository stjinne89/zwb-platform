"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionResult = { ok: true } | { ok: false; error: string };

export function DeleteRecipeButton({
  recipeId,
  deleteAction,
}: {
  recipeId: string;
  deleteAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const [state, submit, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => deleteAction(formData),
    null,
  );

  return (
    <form
      action={submit}
      onSubmit={(event) => {
        if (!window.confirm("Dit recept verwijderen?")) event.preventDefault();
      }}
      className="flex items-center gap-3"
    >
      <input type="hidden" name="recipe_id" value={recipeId} />
      <Button type="submit" variant="outline" className="min-h-[44px]" disabled={pending}>
        <Trash2 className="size-4" />
        {pending ? "Bezig…" : "Verwijderen"}
      </Button>
      {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
    </form>
  );
}
