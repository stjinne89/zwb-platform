"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  COMPONENT_TYPES,
  WEAR_RANGES,
  rangeLabel,
  resolveThresholdKm,
  type WearRange,
} from "@/lib/maintenance/component-types";
import { addComponent } from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

type Bike = { id: string; label: string };

export function ComponentForm({ bikes }: { bikes: Bike[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(COMPONENT_TYPES[0].slug);
  const [range, setRange] = useState<WearRange>("normal");

  const preset = resolveThresholdKm(type, range);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await addComponent(formData);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form action={submit} className="space-y-4 rounded-lg border bg-card p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Fiets</label>
          <select name="bike_id" className={FIELD} defaultValue={bikes[0]?.id}>
            {bikes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Onderdeel</label>
          <select
            name="component_type"
            className={FIELD}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {COMPONENT_TYPES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Slijtage-range</label>
          <select
            name="wear_range"
            className={FIELD}
            value={range}
            onChange={(e) => setRange(e.target.value as WearRange)}
          >
            {WEAR_RANGES.map((r) => (
              <option key={r} value={r}>
                {rangeLabel(r)}
                {resolveThresholdKm(type, r)
                  ? ` — ${resolveThresholdKm(type, r)!.toLocaleString("nl-NL")} km`
                  : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Eigen drempel (km, optioneel)</label>
          <input
            name="custom_km"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder={preset ? String(preset) : ""}
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className={LABEL}>Naam (optioneel)</label>
          <input name="name" className={FIELD} placeholder="Bv. KMC X11" />
        </div>
        <div>
          <label className={LABEL}>Montagedatum (optioneel)</label>
          <input name="installed_at" type="date" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Al gereden (km, optioneel)</label>
          <input
            name="already_ridden_km"
            type="number"
            min={0}
            inputMode="numeric"
            className={FIELD}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Toevoegen…" : "Onderdeel toevoegen"}
      </Button>
    </form>
  );
}
