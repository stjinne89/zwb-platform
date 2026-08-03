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
  /** ZWB-schema of een event uit intervals.icu. */
  source: "zwb" | "intervals";
  skipped?: boolean;
};

function colorFor(intensity: string | null) {
  const key = (intensity ?? "endurance") as WorkoutIntensity;
  return INTENSITY_COLORS[key] ?? INTENSITY_COLORS.endurance;
}

function labelFor(workout: CalendarWorkout) {
  const intensity = (workout.intensity ?? "") as WorkoutIntensity;
  const parts = [
    workout.durationMinutes ? `${workout.durationMinutes} min` : null,
    INTENSITY_LABELS[intensity] ?? null,
  ].filter(Boolean);
  return parts.length ? `${workout.title} - ${parts.join(" - ")}` : workout.title;
}

export function WorkoutCalendar({
  workouts,
  todayKey,
}: {
  workouts: CalendarWorkout[];
  todayKey: string;
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
                {dayWorkouts.map((workout) => (
                  <span
                    key={workout.id}
                    title={labelFor(workout)}
                    className={cn(
                      "block h-1.5 rounded-full sm:h-auto sm:truncate sm:rounded sm:px-1 sm:py-0.5 sm:text-xs sm:leading-tight",
                      workout.skipped && "opacity-60 sm:line-through",
                    )}
                    style={{
                      backgroundColor: colorFor(workout.intensity),
                    }}
                  >
                    <span className="hidden sm:inline">{workout.title}</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
