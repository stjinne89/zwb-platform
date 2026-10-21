"use client";

// Een maaltijd samenstellen voor het eetdagboek: producten uit NEVO, een
// verpakt product via de barcode, of herkend uit een omschrijving. Wat
// hier staat is altijd een lijst producten met grammen; het lid ziet en
// bevestigt elke hoeveelheid voor het bewaren.

import { useActionState, useEffect, useState } from "react";
import { Plus, ScanBarcode, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productLabel } from "@/lib/nutrition/products";
import { MEAL_MOMENTS, MEAL_MOMENT_LABELS, type MealMoment } from "@/lib/nutrition/targets";
import type { FoodOption } from "../_actions";
import type { BarcodeResult } from "../_log-actions";
import { readBarcode } from "./read-barcode";
import type { PollResult, StartResult } from "../_recognize-actions";
import { RECOGNITION_TEXT_MAX } from "@/lib/nutrition/recognize";

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
  /** Bij een herkend onderdeel: de geschatte bandbreedte. */
  hint?: string;
  /** Bij een herkend onderdeel: andere NEVO-treffers om uit te kiezen. */
  alternatives?: Pick<FoodOption, "id" | "name_nl" | "quantity_unit">[];
};

export type RecognitionActions = {
  start: (input: { text: string }) => Promise<StartResult>;
  poll: (id: string) => Promise<PollResult>;
};

const POLL_MS = 2000;
const POLL_TRIES = 45;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}



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
  recognition,
}: {
  day: string;
  defaultMoment: MealMoment;
  saveAction: (formData: FormData) => Promise<ActionResult>;
  searchAction: (query: string) => Promise<FoodOption[]>;
  barcodeAction: (barcode: string) => Promise<BarcodeResult>;
  /** Alleen als het lid tekst herkennen heeft aangezet. */
  recognition?: RecognitionActions;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodOption[]>([]);
  const [emptyFor, setEmptyFor] = useState<string | null>(null);
  const [barcode, setBarcode] = useState("");
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [source, setSource] = useState<"handmatig" | "tekst">("handmatig");
  const [description, setDescription] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [state, submit, pending] = useActionState(async (_previous: ActionResult | null, formData: FormData) => {
    const result = await saveAction(formData);
    if (result.ok) {
      setRows([]);
      setSource("handmatig");
      setQuestions([]);
      setUnmatched([]);
    }
    return result;
  }, null);

  async function recognize(input: { text: string }) {
    if (!recognition || recognizing) return;
    setRecognizing(true);
    setRecognitionError(null);
    try {
      const started = await recognition.start(input);
      if (!started.ok) {
        setRecognitionError(started.error);
        return;
      }
      for (let attempt = 0; attempt < POLL_TRIES; attempt++) {
        await wait(POLL_MS);
        const result = await recognition.poll(started.id);
        if (result.status === "busy") continue;
        if (result.status === "failed") {
          setRecognitionError(result.error);
          return;
        }
        const found = result.rows.filter((row) => row.matches.length > 0);
        setRows((current) => [
          ...current,
          ...found.map((row): Row => ({
            kind: "nevo",
            id: row.matches[0].id,
            name: row.matches[0].name_nl,
            unit: row.matches[0].quantity_unit,
            grams: String(row.grams),
            serving: null,
            hint: `${row.name}: ${row.gramsMin}–${row.gramsMax} g`,
            alternatives: row.matches,
          })),
        ]);
        setUnmatched(result.rows.filter((row) => row.matches.length === 0).map((row) => row.name));
        setQuestions(result.questions);
        setSource("tekst");
        setDescription("");
        return;
      }
      setRecognitionError("Herkennen duurt te lang. Voer de maaltijd zelf in.");
    } catch {
      setRecognitionError("Herkennen lukt nu niet. Voer de maaltijd zelf in.");
    } finally {
      setRecognizing(false);
    }
  }

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
    if (!file || barcodeBusy) return;
    setBarcodeBusy(true);
    setBarcodeError(null);
    let value: string | null = null;
    try {
      value = await readBarcode(file);
    } catch {
      // Een foto die de browser niet kan openen telt als geen barcode.
    }
    setBarcodeBusy(false);
    if (!value) {
      setBarcodeError("Geen barcode gevonden op de foto.");
      return;
    }
    await addBarcode(value);
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
      <input type="hidden" name="source" value={source} />

      {recognition && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={RECOGNITION_TEXT_MAX}
              placeholder="Beschrijf wat je at"
              aria-label="Omschrijving van de maaltijd"
              className="min-h-[44px] min-w-0 flex-1 basis-48 rounded-md border bg-background px-3"
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              disabled={recognizing || !description.trim()}
              onClick={() => void recognize({ text: description })}
            >
              <Sparkles className="size-4" />
              Herken
            </Button>
          </div>
          {recognizing && <p className="text-sm text-muted-foreground">Bezig met herkennen…</p>}
          {recognitionError && <p className="text-sm text-destructive">{recognitionError}</p>}
          {unmatched.length > 0 && (
            <p className="text-sm text-muted-foreground">Niet in NEVO gevonden: {unmatched.join(", ")}.</p>
          )}
          {questions.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          )}
        </div>
      )}

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
              <span className="min-w-0 flex-1 basis-40 text-sm">
                {row.alternatives && row.alternatives.length > 1 ? (
                  <select
                    aria-label={`Product voor ${row.hint ?? row.name}`}
                    value={row.id}
                    onChange={(event) => {
                      const choice = row.alternatives?.find((item) => item.id === event.target.value);
                      if (!choice) return;
                      setRows((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, id: choice.id, name: choice.name_nl, unit: choice.quantity_unit } : item,
                        ),
                      );
                    }}
                    className="min-h-[44px] w-full rounded-md border bg-background px-2"
                  >
                    {row.alternatives.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name_nl}
                      </option>
                    ))}
                  </select>
                ) : (
                  row.name
                )}
                {row.hint && <span className="mt-1 block text-xs text-muted-foreground">{row.hint}</span>}
              </span>
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
        <label
          aria-disabled={barcodeBusy}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium hover:border-primary aria-disabled:cursor-wait aria-disabled:opacity-50"
        >
          <ScanBarcode className="size-4" />
          {barcodeBusy ? "Bezig…" : "Scan"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={barcodeBusy}
            className="sr-only"
            onChange={(event) => {
              void scan(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
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
