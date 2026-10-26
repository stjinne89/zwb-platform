"use client";

// Een verpakt product via de barcode: overtypen, of een foto maken met Scan.
// Gedeeld door het eetdagboek en het receptformulier; wat er met het product
// gebeurt, bepaalt het formulier zelf.

import { useState } from "react";
import { ScanBarcode, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NutritionProduct } from "@/lib/nutrition/products";
import type { BarcodeResult } from "../_log-actions";
import { readBarcode } from "./read-barcode";

export function BarcodeInput({
  lookupAction,
  onProduct,
}: {
  lookupAction: (barcode: string) => Promise<BarcodeResult>;
  onProduct: (product: NutritionProduct) => void;
}) {
  const [barcode, setBarcode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(value: string) {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await lookupAction(value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onProduct(result.product);
      setBarcode("");
    } catch {
      setError("Opzoeken mislukt.");
    } finally {
      setBusy(false);
    }
  }

  async function scan(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    let value: string | null = null;
    try {
      value = await readBarcode(file);
    } catch {
      // Een foto die de browser niet kan openen telt als geen barcode.
    }
    setBusy(false);
    if (!value) {
      setError("Geen barcode gevonden op de foto.");
      return;
    }
    await add(value);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input
          inputMode="numeric"
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            void add(barcode);
          }}
          placeholder="Barcode"
          aria-label="Barcode"
          className="min-h-[44px] min-w-0 flex-1 basis-40 rounded-md border bg-background px-3"
        />
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px]"
          disabled={busy || !barcode.trim()}
          onClick={() => void add(barcode)}
        >
          <Search className="size-4" />
          {busy ? "Bezig…" : "Zoek"}
        </Button>
        <label
          aria-disabled={busy}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium hover:border-primary aria-disabled:cursor-wait aria-disabled:opacity-50"
        >
          <ScanBarcode className="size-4" />
          {busy ? "Bezig…" : "Scan"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy}
            className="sr-only"
            onChange={(event) => {
              void scan(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </>
  );
}
