"use client";

// Een recept vanaf de receptpagina in het menu zetten: kies dag en moment.

import { useActionState } from "react";
import { CalendarPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionResult = { ok: true } | { ok: false; error: string };
type Option = { value: string; label: string };

const FIELD =
  "min-h-[44px] rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function MenuChoiceForm({
  recipeId,
  days,
  moments,
  action,
}: {
  recipeId: string;
  days: Option[];
  moments: Option[];
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const [state, submit, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => action(formData),
    null,
  );
  return (
    <form action={submit} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="recipe_id" value={recipeId} />
      <select name="day" aria-label="Dag" defaultValue={days[0]?.value} className={FIELD}>
        {days.map((day) => (
          <option key={day.value} value={day.value}>
            {day.label}
          </option>
        ))}
      </select>
      {moments.length > 1 ? (
        <select name="moment" aria-label="Moment" defaultValue={moments[0]?.value} className={FIELD}>
          {moments.map((moment) => (
            <option key={moment.value} value={moment.value}>
              {moment.label}
            </option>
          ))}
        </select>
      ) : (
        <input type="hidden" name="moment" value={moments[0]?.value} />
      )}
      <Button type="submit" variant="outline" className="min-h-[44px]" disabled={pending}>
        {state?.ok ? <Check className="size-4" /> : <CalendarPlus className="size-4" />}
        {state?.ok ? "In je menu" : "In menu"}
      </Button>
      {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
    </form>
  );
}
