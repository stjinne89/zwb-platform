"use client";

// Knoppen en formulieren van het eetdagboek (Naleving): aanzetten, een recept
// of eerdere maaltijd vastleggen, pauzeren en wissen. Een maaltijd samenstellen
// staat in meal-form.tsx.

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionResult = { ok: true } | { ok: false; error: string };
type Action = (formData: FormData) => Promise<ActionResult>;

function useFormAction(action: Action) {
  return useActionState(async (_previous: ActionResult | null, formData: FormData) => action(formData), null);
}

export function LogConsentForm({ action }: { action: Action }) {
  const [state, submit, pending] = useFormAction(action);
  return (
    <form action={submit} className="max-w-2xl space-y-4 rounded-lg border bg-card p-5">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="consent" required className="mt-1 size-4 shrink-0" />
        <span>
          Ik wil vastleggen wat ik eet. ZWB bewaart per maaltijd de producten en de hoeveelheden en rekent
          daaruit mijn koolhydraten en eiwit. Alleen ik zie dit. Ik kan pauzeren en alles wissen.{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacyverklaring
          </Link>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="min-h-[44px]" disabled={pending}>
          {pending ? "Bezig…" : "Naleving aanzetten"}
        </Button>
        {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}

/** Eén knop die een actie met vaste velden uitvoert. */
export function LogActionButton({
  action,
  fields,
  children,
  variant = "outline",
  size,
  ariaLabel,
  confirm,
}: {
  action: Action;
  fields?: Record<string, string>;
  children: ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "sm";
  ariaLabel?: string;
  /** Vraag die het lid eerst moet bevestigen. */
  confirm?: string;
}) {
  const [state, submit, pending] = useFormAction(action);
  return (
    <form
      action={submit}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className="flex items-center gap-2"
    >
      {Object.entries(fields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button
        type="submit"
        variant={variant}
        size={size}
        className={size ? undefined : "min-h-[44px]"}
        disabled={pending}
        aria-label={ariaLabel}
      >
        {children}
      </Button>
      {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
    </form>
  );
}

export function DeleteMealButton({ mealId, title, action }: { mealId: string; title: string; action: Action }) {
  return (
    <LogActionButton action={action} fields={{ meal_id: mealId }} variant="ghost" size="sm" ariaLabel={`${title} verwijderen`}>
      <X className="size-4" />
    </LogActionButton>
  );
}

export function DeleteLogButton({ action }: { action: Action }) {
  return (
    <LogActionButton action={action} confirm="Je hele eetdagboek wissen en Naleving uitzetten?">
      <Trash2 className="size-4" />
      Alles wissen
    </LogActionButton>
  );
}
