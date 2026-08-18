"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthGrid, monthLabel, shiftMonth, WEEKDAY_LABELS } from "@/lib/calendar/month";
import { INTENSITY_COLORS, INTENSITY_LABELS, type WorkoutIntensity } from "@/lib/training/workouts";
import { cn } from "@/lib/utils";

export type CalendarWorkout = {
  id: string;
  dateKey: string;
  title: string;
  durationMinutes: number | null;
  intensity: string | null;
  /**
   * ZWB-schema, een event uit intervals.icu, of een gereden rit waar geen
   * training voor stond gepland.
   */
  source: "zwb" | "intervals" | "rit";
  skipped?: boolean;
};

function colorFor(workout: CalendarWorkout) {
  // Bij een rit is de intensiteit afgeleid uit de belasting; zonder
  // vermogensmeter valt daar niets over te zeggen en blijft hij neutraal.
  if (workout.source === "rit" && !workout.intensity) return INTENSITY_COLORS.rest;
  const key = (workout.intensity ?? "endurance") as WorkoutIntensity;
  return INTENSITY_COLORS[key] ?? INTENSITY_COLORS.endurance;
}

function labelFor(workout: CalendarWorkout) {
  const intensity = (workout.intensity ?? "") as WorkoutIntensity;
  const parts = [
    workout.source === "rit" ? "gereden rit" : null,
    workout.durationMinutes ? `${workout.durationMinutes} min` : null,
    INTENSITY_LABELS[intensity] ?? null,
  ].filter(Boolean);
  return parts.length ? `${workout.title} - ${parts.join(" - ")}` : workout.title;
}

export function WorkoutCalendar({
  workouts,
  todayKey,
  onSelect,
  selectedId,
}: {
  workouts: CalendarWorkout[];
  todayKey: string;
  /** Meegeven maakt de blokjes aanklikbaar; zonder dit is de maand alleen kijken. */
  onSelect?: (workoutId: string) => void;
  selectedId?: string | null;
}) {
  const [year, month] = todayKey.split("-").map(Number);
  const [view, setView] = useState({ year, month });
  const cells = monthGrid(view.year, view.month);

  const byDate = new Map<string, CalendarWorkout[]>();
  for (const workout of workouts) {
    const list = byDate.get(workout.dateKey);
    if (list) list.push(workout);
    else byDate.set(workout.dateKey, [workout]);
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Vorige maand"
          onClick={() => setView((current) => shiftMonth(current.year, current.month, -1))}
          className="rounded-md border p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-medium capitalize">{monthLabel(view.year, view.month)}</p>
        <button
          type="button"
          aria-label="Volgende maand"
          onClick={() => setView((current) => shiftMonth(current.year, current.month, 1))}
          className="rounded-md border p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const dayWorkouts = byDate.get(cell.dateKey) ?? [];
          const dayNumber = Number(cell.dateKey.slice(8, 10));
          return (
            <div
              key={cell.dateKey}
              className={cn(
                "min-h-16 rounded-md border p-1 text-left",
                cell.inMonth ? "bg-background" : "bg-muted/30 text-muted-foreground",
                cell.dateKey === todayKey && "border-primary",
              )}
            >
              <span className="text-xs tabular-nums">{dayNumber}</span>
              {/* Een maandcel is op een telefoon ~40px breed: daar past geen
                  titel in, ook niet afgekapt. Dan tonen we een gekleurde balk
                  per workout en pas vanaf sm de titel zelf. */}
              <div className="mt-1 space-y-0.5">
                {dayWorkouts.map((workout) => {
                  // Een gereden rit stond niet in het schema, dus krijgt hij
                  // niet het volle vlak van een geplande training: gestippeld
                  // en doorzichtig, in de kleur van de zone waarin hij viel.
                  const ridden = workout.source === "rit";
                  const className = cn(
                    "block w-full rounded-full text-left sm:h-auto sm:truncate sm:rounded sm:px-1 sm:py-0.5 sm:text-xs sm:leading-tight",
                    // Aanklikbaar wil op een telefoon een grotere raakvlek dan
                    // het streepje van de leesweergave.
                    onSelect ? "h-4 cursor-pointer transition hover:opacity-80" : "h-1.5",
                    ridden && "border border-dashed",
                    workout.skipped && "opacity-60 sm:line-through",
                    selectedId === workout.id && "ring-2 ring-foreground ring-offset-1",
                  );
                  const color = colorFor(workout);
                  const style = ridden
                    ? { backgroundColor: `${color}33`, borderColor: color }
                    : { backgroundColor: color };
                  return onSelect ? (
                    <button
                      key={workout.id}
                      type="button"
                      title={labelFor(workout)}
                      aria-label={labelFor(workout)}
                      aria-pressed={selectedId === workout.id}
                      onClick={() => onSelect(workout.id)}
                      className={className}
                      style={style}
                    >
                      <span className="hidden sm:inline">{workout.title}</span>
                    </button>
                  ) : (
                    <span key={workout.id} title={labelFor(workout)} className={className} style={style}>
                      <span className="hidden sm:inline">{workout.title}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
