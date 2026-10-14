"use client";

// Een maaltijd samenstellen voor het eetdagboek: producten uit NEVO, of een
// verpakt product via de barcode. Wat hier staat is altijd een lijst producten
// met grammen; het lid ziet en bevestigt elke hoeveelheid voor het bewaren.

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { Plus, ScanBarcode, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productLabel } from "@/lib/nutrition/products";
import { MEAL_MOMENTS, MEAL_MOMENT_LABELS, type MealMoment } from "@/lib/nutrition/targets";
import type { FoodOption } from "../_actions";
import type { BarcodeResult } from "../_log-actions";

type ActionResult = { ok: true } | { ok: false; error: string };

type Row = {
  kind: "nevo" | "product";
  /** NEVO-id of barcode. */
  id: string;
  name: string;
  unit: "g" | "ml";
  grams: string;
  /** Eén stuk of portie van een verpakt product. */
  serving: number | null;
};

type Detector = { detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]> };
type DetectorClass = new (options?: { formats?: string[] }) => Detector;

const noSubscribe = () => () => {};
const hasBarcodeDetector = () => "BarcodeDetector" in window;

const inputClass = "min-h-[44px] w-full rounded-md border bg-background px-3";

function amount(value: number) {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

export function MealForm({
  day,
  defaultMoment,
  saveAction,
  searchAction,
  barcodeAction,
}: {
  day: string;
  defaultMoment: MealMoment;
  saveAction: (formData: FormData) => Promise<ActionResult>;
  searchAction: (query: string) => Promise<FoodOption[]>;
  barcodeAction: (barcode: string) => Promise<BarcodeResult>;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodOption[]>([]);
  const [emptyFor, setEmptyFor] = useState<string | null>(null);
  const [barcode, setBarcode] = useState("");
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  // Een foto van de barcode uitlezen kan alleen waar de browser dat zelf kan.
  const canScan = useSyncExternalStore(noSubscribe, hasBarcodeDetector, () => false);
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

  function update(index: number, grams: string) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, grams } : row)));
  }

  async function addBarcode(value: string) {
    if (!value.trim() || barcodeBusy) return;
    setBarcodeBusy(true);
    setBarcodeError(null);
    try {
      const result = await barcodeAction(value);
      if (!result.ok) {
        setBarcodeError(result.error);
        return;
      }
      const { product } = result;
      setRows((current) => [
        ...current,
        {
          kind: "product",
          id: product.barcode,
          name: productLabel(product),
          unit: product.quantity_unit,
          grams: amount(product.serving_g ?? 100),
          serving: product.serving_g,
        },
      ]);
      setBarcode("");
    } catch {
      setBarcodeError("Opzoeken mislukt.");
    } finally {
      setBarcodeBusy(false);
    }
  }

  async function scan(file: File | undefined) {
    if (!file) return;
    setBarcodeError(null);
    try {
      const Detector = (window as unknown as { BarcodeDetector: DetectorClass }).BarcodeDetector;
      const bitmap = await createImageBitmap(file);
      const found = await new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] }).detect(bitmap);
      bitmap.close();
      if (found.length === 0) {
        setBarcodeError("Geen barcode gevonden op de foto.");
        return;
      }
      await addBarcode(found[0].rawValue);
    } catch {
      setBarcodeError("Geen barcode gevonden op de foto.");
    }
  }

  const payload = JSON.stringify(
    rows.map((row) => {
      const grams = Number(row.grams.replace(",", "."));
      return row.kind === "product" ? { barcode: row.id, grams } : { food_id: row.id, grams };
    }),
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
            <li key={`${row.id}-${index}`} className="flex flex-wrap items-center gap-2 p-2">
              <span className="min-w-0 flex-1 basis-40 text-sm">{row.name}</span>
              {row.serving != null && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={`Eén portie ${row.name} erbij`}
                  onClick={() =>
                    update(index, amount((Number(row.grams.replace(",", ".")) || 0) + (row.serving ?? 0)))
                  }
                >
                  <Plus className="size-4" />
                  {amount(row.serving)} {row.unit}
                </Button>
              )}
              <label className="flex items-center gap-1 text-sm">
                <input
                  inputMode="decimal"
                  aria-label={`Hoeveelheid ${row.name}`}
                  value={row.grams}
                  onChange={(event) => update(index, event.target.value)}
                  className="min-h-[44px] w-20 rounded-md border bg-background px-2 text-right"
                />
                {row.unit}
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`${row.name} verwijderen`}
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
                setRows([
                  ...rows,
                  { kind: "nevo", id: food.id, name: food.name_nl, unit: food.quantity_unit, grams: "100", serving: null },
                ]);
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

      <div className="flex flex-wrap items-center gap-2">
        <input
          inputMode="numeric"
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            void addBarcode(barcode);
          }}
          placeholder="Barcode"
          aria-label="Barcode"
          className="min-h-[44px] min-w-0 flex-1 basis-40 rounded-md border bg-background px-3"
        />
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px]"
          disabled={barcodeBusy || !barcode.trim()}
          onClick={() => void addBarcode(barcode)}
        >
          <Search className="size-4" />
          {barcodeBusy ? "Bezig…" : "Zoek"}
        </Button>
        {canScan && (
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium hover:border-primary">
            <ScanBarcode className="size-4" />
            Scan
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => {
                void scan(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {barcodeError && <p className="text-sm text-destructive">{barcodeError}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="min-h-[44px]" disabled={pending || rows.length === 0}>
          {pending ? "Bezig…" : "Maaltijd bewaren"}
        </Button>
        {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}
