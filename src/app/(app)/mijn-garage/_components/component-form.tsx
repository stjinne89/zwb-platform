"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  WEAR_RANGES,
  componentTypesFor,
  rangeLabel,
  resolveThreshold,
  type Discipline,
  type WearRange,
} from "@/lib/maintenance/component-types";
import { addComponent } from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

export type FormBike = { id: string; label: string; discipline: Discipline };

export function ComponentForm({ bikes }: { bikes: FormBike[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bikeId, setBikeId] = useState(bikes[0]?.id ?? "");
  const [range, setRange] = useState<WearRange>("normal");

  const discipline = bikes.find((b) => b.id === bikeId)?.discipline ?? "race";
  // Welke onderdelen bestaan hangt van het fietstype af: een dropper zit niet
  // op een racefiets, een trainerband niet op een gravelfiets.
  const types = useMemo(() => componentTypesFor(discipline), [discipline]);
  const [type, setType] = useState(types[0]?.slug ?? "");

  const activeType = types.some((t) => t.slug === type) ? type : (types[0]?.slug ?? "");
  const preset = resolveThreshold(activeType, discipline, range);
  const metric = preset?.metric ?? "km";
  const unit = metric === "months" ? "maanden" : "km";

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await addComponent(formData);
      if (res && !res.ok) setError(res.error);
    });
  }

  if (types.length === 0) return null;

  return (
    <form action={submit} className="space-y-4 rounded-lg border bg-card p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Fiets</label>
          <select
            name="bike_id"
            className={FIELD}
            value={bikeId}
            onChange={(e) => setBikeId(e.target.value)}
          >
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
            value={activeType}
            onChange={(e) => setType(e.target.value)}
          >
            {types.map((c) => (
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
            {WEAR_RANGES.map((r) => {
              const option = resolveThreshold(activeType, discipline, r);
              return (
                <option key={r} value={r}>
                  {rangeLabel(r)}
                  {option
                    ? ` — ${option.value.toLocaleString("nl-NL")} ${
                        option.metric === "months" ? "maanden" : "km"
                      }`
                    : ""}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className={LABEL}>Eigen drempel ({unit}, optioneel)</label>
          <input
            name="custom_value"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder={preset ? String(preset.value) : ""}
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
          <label className={LABEL}>
            Montagedatum{metric === "months" ? "" : " (optioneel)"}
          </label>
          <input
            name="installed_at"
            type="date"
            required={metric === "months"}
            className={FIELD}
          />
        </div>
        {metric === "km" && (
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
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Toevoegen…" : "Onderdeel toevoegen"}
      </Button>
    </form>
  );
}
