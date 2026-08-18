"use client";

import { useState, useTransition } from "react";
import {
  DISCIPLINES,
  disciplineLabel,
  type Discipline,
} from "@/lib/maintenance/component-types";
import { setBikeDiscipline, setManualDistance } from "../_actions";

const CONTROL =
  "rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

/**
 * Fietstype en, voor handmatige fietsen, de kilometerstand. De sync gokt het
 * type uit de gearnaam en zit er geregeld naast, dus dit moet ter plekke
 * bij te stellen zijn.
 */
export function BikeControls({
  bikeId,
  discipline,
  manual,
  distanceKm,
}: {
  bikeId: string;
  discipline: Discipline;
  manual: boolean;
  distanceKm: number;
}) {
  const [pending, startTransition] = useTransition();
  const [km, setKm] = useState(String(Math.round(distanceKm)));
  const [error, setError] = useState<string | null>(null);

  function onDiscipline(next: string) {
    setError(null);
    startTransition(async () => {
      const res = await setBikeDiscipline(bikeId, next);
      if (!res.ok) setError(res.error);
    });
  }

  function onDistance() {
    setError(null);
    const parsed = Number.parseFloat(km.replace(",", "."));
    startTransition(async () => {
      const res = await setManualDistance(bikeId, parsed);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Fietstype"
        className={CONTROL}
        defaultValue={discipline}
        disabled={pending}
        onChange={(e) => onDiscipline(e.target.value)}
      >
        {DISCIPLINES.map((d) => (
          <option key={d} value={d}>
            {disciplineLabel(d)}
          </option>
        ))}
      </select>

      {manual && (
        <span className="inline-flex items-center gap-1">
          <input
            aria-label="Kilometerstand"
            type="number"
            min={0}
            inputMode="numeric"
            className={`${CONTROL} w-24`}
            value={km}
            disabled={pending}
            onChange={(e) => setKm(e.target.value)}
            onBlur={onDistance}
          />
          <span className="text-xs text-muted-foreground">km</span>
        </span>
      )}

      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
