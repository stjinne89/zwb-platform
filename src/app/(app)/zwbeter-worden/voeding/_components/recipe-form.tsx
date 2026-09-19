"use client";

// Eigen recept samenstellen. Ingrediënten komen uit NEVO, zodat de voedingswaarden
// altijd een bron hebben; een los getypt ingrediënt zonder waarden kan niet.

import { useActionState, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DIET_TAGS, DIET_TAG_LABELS, FUEL_PROFILE_LABELS } from "@/lib/nutrition/labels";
import { INGREDIENT_ROLES, INGREDIENT_ROLE_LABELS, type IngredientRole } from "@/lib/nutrition/scale";
import { MEAL_MOMENTS, MEAL_MOMENT_LABELS } from "@/lib/nutrition/targets";
import type { FoodOption } from "../_actions";

type ActionResult = { ok: true } | { ok: false; error: string };

type Row = {
  food: Pick<FoodOption, "id" | "name_nl" | "quantity_unit">;
  grams: string;
  role: IngredientRole;
};

export type RecipeFormInitial = {
  recipe_id: string;
  title: string;
  meal_moment: string;
  fuel_profile: string;
  diet_tags: string[];
  servings: number;
  prep_minutes: number | null;
  steps_md: string;
  rows: Row[];
};

const inputClass = "min-h-[44px] w-full rounded-md border bg-background px-3";

export function RecipeForm({
  initial,
  saveAction,
  searchAction,
}: {
  initial?: RecipeFormInitial;
  saveAction: (formData: FormData) => Promise<ActionResult>;
  searchAction: (query: string) => Promise<FoodOption[]>;
}) {
  const [rows, setRows] = useState<Row[]>(initial?.rows ?? []);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodOption[]>([]);
  const [state, submit, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => saveAction(formData),
    null,
  );

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchAction(term)
        .then((found) => {
          if (!cancelled) setResults(found);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searchAction]);

  function update(index: number, patch: Partial<Row>) {
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
  }

  const payload = JSON.stringify(
    rows.map((row) => ({
      food_id: row.food.id,
      grams: Number(row.grams.replace(",", ".")),
      role: row.role,
    })),
  );

  return (
    <form action={submit} className="space-y-5 rounded-lg border bg-card p-4">
      {initial && <input type="hidden" name="recipe_id" value={initial.recipe_id} />}
      <input type="hidden" name="ingredients" value={payload} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Naam</span>
          <input name="title" required maxLength={120} defaultValue={initial?.title} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Moment</span>
          <select name="meal_moment" defaultValue={initial?.meal_moment ?? "diner"} className={inputClass}>
            {MEAL_MOMENTS.map((value) => (
              <option key={value} value={value}>
                {MEAL_MOMENT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Profiel</span>
          <select name="fuel_profile" defaultValue={initial?.fuel_profile ?? "gemengd"} className={inputClass}>
            {Object.entries(FUEL_PROFILE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Porties</span>
          <input
            name="servings"
            type="number"
            min={1}
            max={20}
            required
            defaultValue={initial?.servings ?? 1}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Minuten</span>
          <input
            name="prep_minutes"
            type="number"
            min={0}
            max={600}
            defaultValue={initial?.prep_minutes ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <fieldset className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {DIET_TAGS.map((tag) => (
          <label key={tag} className="inline-flex min-h-[44px] items-center gap-2">
            <input type="checkbox" name={`diet_${tag}`} defaultChecked={initial?.diet_tags.includes(tag)} />
            {DIET_TAG_LABELS[tag]}
          </label>
        ))}
      </fieldset>

      <div className="space-y-2">
        <span className="block text-sm font-medium">Ingrediënten</span>
        {rows.length > 0 && (
          <ol className="divide-y rounded-md border">
            {rows.map((row, index) => (
              <li key={`${row.food.id}-${index}`} className="grid gap-2 p-2 sm:grid-cols-[1fr_110px_170px_auto] sm:items-center">
                <span className="min-w-0 text-sm">{row.food.name_nl}</span>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    inputMode="decimal"
                    aria-label={`Hoeveelheid ${row.food.name_nl}`}
                    value={row.grams}
                    onChange={(event) => update(index, { grams: event.target.value })}
                    className="min-h-[44px] w-20 rounded-md border bg-background px-2 text-right"
                  />
                  {row.food.quantity_unit}
                </label>
                <select
                  aria-label={`Rol ${row.food.name_nl}`}
                  value={row.role}
                  onChange={(event) => update(index, { role: event.target.value as IngredientRole })}
                  className="min-h-[44px] rounded-md border bg-background px-2 text-sm"
                >
                  {INGREDIENT_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {INGREDIENT_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
                <div className="flex">
                  <Button type="button" size="sm" variant="ghost" aria-label="Omhoog" onClick={() => move(index, -1)}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" aria-label="Omlaag" onClick={() => move(index, 1)}>
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Verwijderen"
                    onClick={() => setRows(rows.filter((_, i) => i !== index))}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
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
          aria-label="Ingrediënt zoeken"
          className={inputClass}
        />
        {results.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {results.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => {
                  const carbs = Number(food.carbs_g ?? 0);
                  const protein = Number(food.protein_g ?? 0);
                  const role: IngredientRole =
                    carbs >= 15 && carbs >= protein ? "kh_bron" : protein >= 8 ? "eiwit_bron" : "vast";
                  setRows([...rows, { food, grams: "100", role }]);
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
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Bereiding</span>
        <textarea
          name="steps_md"
          rows={6}
          maxLength={5000}
          defaultValue={initial?.steps_md}
          className="w-full rounded-md border bg-background p-3"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="min-h-[44px]" disabled={pending || rows.length === 0}>
          {pending ? "Bezig…" : "Recept bewaren"}
        </Button>
        {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}
