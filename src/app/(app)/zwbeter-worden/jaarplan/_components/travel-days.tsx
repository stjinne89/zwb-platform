"use client";

// Reisdagen kiezen binnen een trainingskamp: één knop per kampdag. De gekozen
// dagen gaan als verborgen velden "travel_days" mee in het formulier.

import { useState } from "react";
import { daysBetween, shiftDays } from "@/lib/training/season";

/** Langer dan dit is geen kamp meer om per dag te tonen. */
const MAX_DAYS = 42;

function dagLabel(dayKey: string) {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function TravelDaysPicker({
  startDate,
  endDate,
  defaultDays,
}: {
  startDate: string;
  endDate: string;
  defaultDays: string[];
}) {
  const [gekozen, setGekozen] = useState(() => new Set(defaultDays));

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate);
  const lengte = valid ? daysBetween(startDate, endDate) + 1 : 0;
  if (lengte < 1 || lengte > MAX_DAYS) return null;
  const dagen = Array.from({ length: lengte }, (_, index) => shiftDays(startDate, index));

  function wissel(day: string) {
    setGekozen((huidig) => {
      const volgende = new Set(huidig);
      if (volgende.has(day)) volgende.delete(day);
      else volgende.add(day);
      return volgende;
    });
  }

  return (
    <fieldset className="text-sm sm:col-span-2">
      <legend>Reisdagen</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {dagen.map((day) => {
          const aan = gekozen.has(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={aan}
              onClick={() => wissel(day)}
              className={`min-h-9 rounded-full border px-3 text-sm ${
                aan ? "border-primary bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              {dagLabel(day)}
            </button>
          );
        })}
      </div>
      {dagen
        .filter((day) => gekozen.has(day))
        .map((day) => (
          <input key={day} type="hidden" name="travel_days" value={day} />
        ))}
    </fieldset>
  );
}
