"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BAND_TYPES,
  BAND_TYPE_LABEL,
  MAX_BREEDTE_MM,
  MIN_BREEDTE_MM,
  type BandSetup,
} from "@/lib/materiaal/bandendruk";
import { saveTireSetup } from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

function value(n: number | null): string {
  return n == null ? "" : String(n).replace(".", ",");
}

function MmField({ id, name, label, defaultValue, required }: {
  id: string;
  name: string;
  label: string;
  defaultValue: number | null;
  required?: boolean;
}) {
  return (
    <div>
      <label className={LABEL} htmlFor={id}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          name={name}
          inputMode="decimal"
          required={required}
          className={FIELD}
          defaultValue={value(defaultValue)}
          pattern="[0-9]+([.,][0-9])?"
          title={`${MIN_BREEDTE_MM} tot ${MAX_BREEDTE_MM} mm`}
        />
        <span className="text-sm text-muted-foreground">mm</span>
      </div>
    </div>
  );
}

/**
 * Wielen en banden van één fiets. `saved` is false zolang er nog geen rij is;
 * dan staan de startwaarden voor het fietstype in de velden.
 */
export function TireSetupForm({
  bikeId,
  setup,
  saved,
}: {
  bikeId: string;
  setup: BandSetup;
  saved: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const idPrefix = `band-${bikeId}`;

  function submit(formData: FormData) {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await saveTireSetup(bikeId, formData);
      if (!res.ok) setError(res.error);
      else setDone(true);
    });
  }

  const summary = saved
    ? `${value(setup.voorBreedteMm)} / ${value(setup.achterBreedteMm)} mm · ${BAND_TYPE_LABEL[setup.bandType]}`
    : "Nog niet ingevuld";

  return (
    <details className="group mb-3 rounded-lg border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm transition hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
        <span className="font-medium">Wielen en banden</span>
        <span className="flex-1 truncate text-muted-foreground">{summary}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" aria-hidden />
      </summary>
      <form action={submit} className="space-y-4 px-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <MmField id={`${idPrefix}-front`} name="front_width_mm" label="Band voor" defaultValue={setup.voorBreedteMm} required />
          <MmField id={`${idPrefix}-rear`} name="rear_width_mm" label="Band achter" defaultValue={setup.achterBreedteMm} required />
          <MmField id={`${idPrefix}-front-measured`} name="front_measured_mm" label="Gemeten voor" defaultValue={setup.voorGemetenMm} />
          <MmField id={`${idPrefix}-rear-measured`} name="rear_measured_mm" label="Gemeten achter" defaultValue={setup.achterGemetenMm} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={LABEL} htmlFor={`${idPrefix}-type`}>
              Type
            </label>
            <select id={`${idPrefix}-type`} name="tire_type" className={FIELD} defaultValue={setup.bandType}>
              {BAND_TYPES.map((type) => (
                <option key={type} value={type}>
                  {BAND_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor={`${idPrefix}-kg`}>
              Fiets
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`${idPrefix}-kg`}
                name="bike_kg"
                inputMode="decimal"
                required
                className={FIELD}
                defaultValue={value(setup.fietsKg)}
              />
              <span className="text-sm text-muted-foreground">kg</span>
            </div>
          </div>
          <div>
            <label className={LABEL} htmlFor={`${idPrefix}-max`}>
              Max. druk
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`${idPrefix}-max`}
                name="max_bar"
                inputMode="decimal"
                className={FIELD}
                defaultValue={value(setup.maxBar)}
              />
              <span className="text-sm text-muted-foreground">bar</span>
            </div>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hookless" defaultChecked={setup.hookless} className="size-4" />
          Hookless velgen
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Opslaan…" : "Opslaan"}
          </Button>
          {done && <span className="text-sm text-muted-foreground">Opgeslagen</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </form>
    </details>
  );
}
