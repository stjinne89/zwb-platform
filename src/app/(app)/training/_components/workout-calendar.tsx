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
              <div className="mt-1 space-y-0.5">
                {dayWorkouts.map((workout) => (
                  <span
                    key={workout.id}
                    title={labelFor(workout)}
                    className={cn(
                      "block truncate rounded px-1 py-0.5 text-[10px] leading-tight",
                      workout.skipped && "line-through opacity-60",
                    )}
                    style={{
                      backgroundColor: `${colorFor(workout.intensity)}22`,
                      borderLeft: `3px solid ${colorFor(workout.intensity)}`,
                    }}
                  >
                    {workout.title}
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
