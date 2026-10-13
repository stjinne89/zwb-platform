"use client";

// Knoppen en formulieren van het eetdagboek (Naleving): aanzetten, een recept
// of eerdere maaltijd vastleggen, een maaltijd uit NEVO samenstellen, pauzeren
// en wissen.

import Link from "next/link";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MEAL_MOMENTS, MEAL_MOMENT_LABELS, type MealMoment } from "@/lib/nutrition/targets";
import type { FoodOption } from "../_actions";

type ActionResult = { ok: true } | { ok: false; error: string };
type Action = (formData: FormData) => Promise<ActionResult>;

function useFormAction(action: Action) {
  return useActionState(async (_previous: ActionResult | null, formData: FormData) => action(formData), null);
}

const inputClass = "min-h-[44px] w-full rounded-md border bg-background px-3";

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

type Row = { food: Pick<FoodOption, "id" | "name_nl" | "quantity_unit">; grams: string };

/** Een maaltijd samenstellen uit NEVO-producten. */
export function MealForm({
  day,
  defaultMoment,
  saveAction,
  searchAction,
}: {
  day: string;
  defaultMoment: MealMoment;
  saveAction: Action;
  searchAction: (query: string) => Promise<FoodOption[]>;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodOption[]>([]);
  const [emptyFor, setEmptyFor] = useState<string | null>(null);
  const [state, submit, pending] = useActionState(async (_previous: ActionResult | null, formData: FormData) => {
    const result = await saveAction(formData);
    if (result.ok) setRows([]);
    return result;
  }, null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchAction(term)
        .then((found) => {
          if (cancelled) return;
          setResults(found);
          setEmptyFor(found.length === 0 ? term : null);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setEmptyFor(term);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searchAction]);

  const payload = JSON.stringify(
    rows.map((row) => ({ food_id: row.food.id, grams: Number(row.grams.replace(",", ".")) })),
  );

  return (
    <form action={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="items" value={payload} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Moment</span>
          <select name="moment" defaultValue={defaultMoment} className={inputClass}>
            {MEAL_MOMENTS.map((value) => (
              <option key={value} value={value}>
                {MEAL_MOMENT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Naam</span>
          <input name="title" maxLength={120} className={inputClass} />
        </label>
      </div>

      {rows.length > 0 && (
        <ol className="divide-y rounded-md border">
          {rows.map((row, index) => (
            <li key={`${row.food.id}-${index}`} className="flex items-center gap-2 p-2">
              <span className="min-w-0 flex-1 text-sm">{row.food.name_nl}</span>
              <label className="flex items-center gap-1 text-sm">
                <input
                  inputMode="decimal"
                  aria-label={`Hoeveelheid ${row.food.name_nl}`}
                  value={row.grams}
                  onChange={(event) =>
                    setRows(rows.map((item, i) => (i === index ? { ...item, grams: event.target.value } : item)))
                  }
                  className="min-h-[44px] w-20 rounded-md border bg-background px-2 text-right"
                />
                {row.food.quantity_unit}
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`${row.food.name_nl} verwijderen`}
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ol>
      )}

      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          if (event.target.value.trim().length < 2) setResults([]);
        }}
        placeholder="Zoek in NEVO"
        aria-label="Product zoeken"
        className={inputClass}
      />
      {emptyFor !== null && emptyFor === query.trim() && (
        <p className="text-sm text-muted-foreground">Niets gevonden in NEVO.</p>
      )}
      {results.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {results.map((food) => (
            <button
              key={food.id}
              type="button"
              onClick={() => {
                setRows([...rows, { food, grams: "100" }]);
                setQuery("");
                setResults([]);
              }}
              className="min-h-[36px] rounded-full border px-3 text-left text-sm hover:border-primary"
            >
              {food.name_nl}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="min-h-[44px]" disabled={pending || rows.length === 0}>
          {pending ? "Bezig…" : "Maaltijd bewaren"}
        </Button>
        {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}
