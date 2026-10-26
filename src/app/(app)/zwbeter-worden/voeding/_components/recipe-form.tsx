"use client";

// Eigen recept samenstellen. Ingrediënten komen uit NEVO of, voor sportvoeding
// als een gel of sportdrank, via de barcode uit Open Food Facts, zodat de
// voedingswaarden altijd een bron hebben; een los getypt ingrediënt zonder
// waarden kan niet.
// Bij een recept van een link staan de gekoppelde ingrediënten er al, met de
// regel van de site eronder; wat niet te koppelen was, staat als losse regel
// klaar om te zoeken.

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DIET_TAGS, DIET_TAG_LABELS, FUEL_PROFILE_LABELS } from "@/lib/nutrition/labels";
import { INGREDIENT_ROLES, INGREDIENT_ROLE_LABELS, guessRole, type IngredientRole } from "@/lib/nutrition/scale";
import { MEAL_MOMENTS, MEAL_MOMENT_LABELS } from "@/lib/nutrition/targets";
import type { RecipeVisibility } from "@/lib/nutrition/recipes";
import { productLabel, type NutritionProduct } from "@/lib/nutrition/products";
import type { IngredientLine } from "@/lib/nutrition/recipe-import";
import type { FoodOption } from "../_actions";
import type { BarcodeResult } from "../_log-actions";
import { BarcodeInput } from "./barcode-input";

type ActionResult = { ok: true } | { ok: false; error: string };

type Row = {
  /** Bij een verpakt product is `id` de barcode, en staat die ook in `barcode`. */
  food: Pick<FoodOption, "id" | "name_nl" | "quantity_unit"> & { barcode?: string | null };
  grams: string;
  role: IngredientRole;
  /** De regel van de receptsite waar dit ingrediënt uit komt. */
  source?: string;
};

export type RecipeFormInitial = {
  /** Leeg bij een nieuw recept, ook als het van een link komt. */
  recipe_id?: string;
  title: string;
  meal_moment: string;
  fuel_profile: string;
  diet_tags: string[];
  servings: number;
  prep_minutes: number | null;
  steps_md: string;
  source_name: string | null;
  source_url: string | null;
  image_url: string | null;
  visibility: RecipeVisibility;
  show_owner: boolean;
  rows: Row[];
};

function amount(value: number) {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

function validAmount(grams: string) {
  const value = Number(grams.replace(",", "."));
  return Number.isFinite(value) && value > 0 && value <= 5000;
}

const inputClass = "min-h-[44px] w-full rounded-md border bg-background px-3";

export function RecipeForm({
  initial,
  pending: initialPending = [],
  saveAction,
  searchAction,
  barcodeAction,
  defaultMoment = "diner",
}: {
  initial?: RecipeFormInitial;
  /** Regels van een link die niet aan NEVO te koppelen waren. */
  pending?: IngredientLine[];
  saveAction: (formData: FormData) => Promise<ActionResult>;
  searchAction: (query: string) => Promise<FoodOption[]>;
  barcodeAction: (barcode: string) => Promise<BarcodeResult>;
  /** Het moment van een nieuw recept, zoals "Tijdens de rit" voor sportvoeding. */
  defaultMoment?: string;
}) {
  const [rows, setRows] = useState<Row[]>(initial?.rows ?? []);
  const titleRef = useRef<HTMLInputElement>(null);
  const [pendingLines, setPendingLines] = useState<IngredientLine[]>(initialPending);
  // De losse regel waarvoor nu gezocht wordt; die krijgt de gekozen NEVO-naam.
  const [activeLine, setActiveLine] = useState<IngredientLine | null>(null);
  const [visibility, setVisibility] = useState<RecipeVisibility>(initial?.visibility ?? "prive");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodOption[]>([]);
  // De zoekterm waarvoor NEVO niets gaf, zodat het lid ziet dat er gezocht is.
  const [emptyFor, setEmptyFor] = useState<string | null>(null);
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

  function addProduct(product: NutritionProduct) {
    const name = productLabel(product);
    setRows((current) => [
      ...current,
      {
        food: { id: product.barcode, barcode: product.barcode, name_nl: name, quantity_unit: product.quantity_unit },
        grams: amount(product.serving_g ?? 100),
        role: guessRole(product),
      },
    ]);
    // Eén gel of sportdrank is meestal het hele recept: dan is de naam die van het product.
    if (titleRef.current && !titleRef.current.value.trim()) titleRef.current.value = name.slice(0, 120);
  }

  const amountsMissing = rows.some((row) => !validAmount(row.grams));

  const payload = JSON.stringify(
    rows.map((row) => {
      const grams = Number(row.grams.replace(",", "."));
      return row.food.barcode
        ? { barcode: row.food.barcode, grams, role: row.role }
        : { food_id: row.food.id, grams, role: row.role };
    }),
  );

  return (
    <form action={submit} className="space-y-5 rounded-lg border bg-card p-4">
      {initial?.recipe_id && <input type="hidden" name="recipe_id" value={initial.recipe_id} />}
      <input type="hidden" name="ingredients" value={payload} />
      <input type="hidden" name="source_name" value={initial?.source_name ?? ""} />
      <input type="hidden" name="source_url" value={initial?.source_url ?? ""} />
      <input type="hidden" name="image_url" value={initial?.image_url ?? ""} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Naam</span>
          <input
            ref={titleRef}
            name="title"
            required
            maxLength={120}
            defaultValue={initial?.title}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Moment</span>
          <select name="meal_moment" defaultValue={initial?.meal_moment ?? defaultMoment} className={inputClass}>
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
                <span className="min-w-0 text-sm">
                  {row.food.name_nl}
                  {row.source && <span className="block text-xs text-muted-foreground">{row.source}</span>}
                </span>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    inputMode="decimal"
                    aria-label={`Hoeveelheid ${row.food.name_nl}`}
                    value={row.grams}
                    onChange={(event) => update(index, { grams: event.target.value })}
                    aria-invalid={!validAmount(row.grams)}
                    className="min-h-[44px] w-20 rounded-md border bg-background px-2 text-right aria-[invalid=true]:border-destructive"
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
        {pendingLines.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {pendingLines.map((line, index) => (
              <li
                key={`${line.line}-${index}`}
                className={`inline-flex min-h-[36px] items-center rounded-full border border-dashed text-sm ${
                  activeLine === line ? "border-primary text-primary" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveLine(line);
                    setQuery(line.name);
                  }}
                  className="inline-flex min-h-[36px] items-center gap-1 pl-3 pr-1 text-left"
                >
                  <Search className="size-3.5 shrink-0" />
                  {line.line}
                </button>
                <button
                  type="button"
                  aria-label={`${line.line} weglaten`}
                  onClick={() => {
                    setPendingLines(pendingLines.filter((item) => item !== line));
                    if (activeLine === line) setActiveLine(null);
                  }}
                  className="inline-flex min-h-[36px] items-center px-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
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
                  const line = activeLine;
                  setRows([
                    ...rows,
                    {
                      food,
                      grams: line ? (line.grams == null ? "" : String(line.grams)) : "100",
                      role: guessRole(food),
                      source: line?.line,
                    },
                  ]);
                  if (line) setPendingLines(pendingLines.filter((item) => item !== line));
                  setActiveLine(null);
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
        <BarcodeInput lookupAction={barcodeAction} onProduct={addProduct} />
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

      <fieldset className="space-y-2 text-sm">
        <legend className="mb-1 font-medium">Delen</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <label className="inline-flex min-h-[44px] items-center gap-2">
            <input
              type="radio"
              name="visibility"
              value="prive"
              checked={visibility === "prive"}
              onChange={() => setVisibility("prive")}
            />
            Alleen voor mij
          </label>
          <label className="inline-flex min-h-[44px] items-center gap-2">
            <input
              type="radio"
              name="visibility"
              value="leden"
              checked={visibility === "leden"}
              onChange={() => setVisibility("leden")}
            />
            Alle leden
          </label>
        </div>
        {visibility === "leden" && (
          <label className="inline-flex min-h-[44px] items-center gap-2">
            <input
              type="checkbox"
              name="show_owner"
              defaultChecked={initial?.visibility === "leden" ? initial.show_owner : true}
            />
            Toon mijn naam en avatar
          </label>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="min-h-[44px]" disabled={pending || rows.length === 0 || amountsMissing}>
          {pending ? "Bezig…" : "Recept bewaren"}
        </Button>
        {rows.length === 0 && (
          <span className="text-sm text-muted-foreground">Kies eerst een ingrediënt.</span>
        )}
        {rows.length > 0 && amountsMissing && (
          <span className="text-sm text-muted-foreground">Vul bij elk ingrediënt een hoeveelheid in.</span>
        )}
        {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}
