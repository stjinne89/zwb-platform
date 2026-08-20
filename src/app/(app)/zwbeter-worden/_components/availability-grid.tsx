"use client";

// De schuifbalken zelf, los van waar ze staan.
//
// Ze zaten in de beschikbaarheidskaart op de schemapagina, maar horen sinds
// 2026-08-20 ook in het doelformulier: uit de doorlichting bleek dat juist de
// leden zonder ingevulde beschikbaarheid de rare schema's kregen, en het moment
// waarop je een doel invult is het moment waarop je toch al nadenkt over wat je
// kunt. Eén component, zodat de twee plekken niet uit elkaar gaan lopen.
//
// De range-inputs dragen hun eigen `name`, dus in een gewoon formulier komen ze
// vanzelf mee; de kaart op de schemapagina bouwt zijn FormData zelf op en heeft
// daar geen last van.

import {
  AVAILABILITY_MAX_MINUTES,
  AVAILABILITY_STEP_MINUTES,
  WEEKDAY_LABELS,
  WEEKDAY_SLUGS,
} from "@/lib/training/availability";

export function minutesLabel(minutes: number) {
  if (minutes <= 0) return "geen";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} uur`;
  return `${hours}u ${rest}`;
}

export function AvailabilityGrid({
  minutes,
  onChange,
  disabled = false,
  idPrefix,
}: {
  minutes: Record<string, number>;
  onChange: (day: string, value: number) => void;
  disabled?: boolean;
  /** Uniek per plek op de pagina; twee rasters mogen niet dezelfde id's krijgen. */
  idPrefix: string;
}) {
  return (
    <div className="space-y-3">
      {WEEKDAY_SLUGS.map((day) => {
        const value = minutes[day] ?? 0;
        return (
          <div key={day} className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3">
            <label htmlFor={`${idPrefix}-${day}`} className="text-sm">
              {WEEKDAY_LABELS[day]}
            </label>
            <input
              id={`${idPrefix}-${day}`}
              name={`minutes_${day}`}
              type="range"
              min={0}
              max={AVAILABILITY_MAX_MINUTES}
              step={AVAILABILITY_STEP_MINUTES}
              value={value}
              disabled={disabled}
              onChange={(event) => onChange(day, Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:cursor-not-allowed"
            />
            <span
              className={`text-right text-sm tabular-nums ${
                value > 0 ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {minutesLabel(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
