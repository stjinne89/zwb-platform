"use client";

// De beschikbaarheid in het doelformulier. Zonder minuten per dag kent de
// planner alleen dagen en belandt het weekvolume in een paar lange blokken —
// precies wat er gebeurde bij de twee leden die niets hadden ingevuld.
//
// Staat er nog niets, dan begint elke dag op nul en weigert het formulier het
// doel; dat is een bewuste drempel, geen ongeluk.

import { useState } from "react";
import { WEEKDAY_SLUGS } from "@/lib/training/availability";
import { AvailabilityGrid, minutesLabel } from "../../_components/availability-grid";

export function GoalAvailability({ initial }: { initial: Record<string, number> }) {
  const [minutes, setMinutes] = useState<Record<string, number>>(() =>
    Object.fromEntries(WEEKDAY_SLUGS.map((day) => [day, initial[day] ?? 0])),
  );
  const total = WEEKDAY_SLUGS.reduce((sum, day) => sum + (minutes[day] ?? 0), 0);

  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-sm">Tijd per dag</legend>
      <div className="mt-2">
        <AvailabilityGrid
          minutes={minutes}
          idPrefix="doel-beschikbaarheid"
          onChange={(day, value) => setMinutes((current) => ({ ...current, [day]: value }))}
        />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {minutesLabel(total)} per week
      </p>
    </fieldset>
  );
}
