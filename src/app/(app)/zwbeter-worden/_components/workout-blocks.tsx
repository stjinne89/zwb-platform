// Weergave van workoutblokken (de gekleurde balk met vermogensbanden) plus de
// vertaling van een intervals.icu workout_doc naar diezelfde blokvorm.

import { intervalsWeekUrl } from "@/lib/intervals/links";
import type { IntervalsEvent } from "@/lib/intervals/client";
import {
  INTENSITY_COLORS,
  INTENSITY_LABELS,
  intensityFromLoad,
  intensityFromPct,
  powerRangePercentForBlock,
  type WorkoutBlock,
} from "@/lib/training/workouts";
import { cn } from "@/lib/utils";
import { dateValue } from "./format";
import type { WorkoutRow } from "./types";

export function intervalsWorkoutUrl(athleteId: string | undefined, workout: WorkoutRow) {
  return intervalsWeekUrl(athleteId, dateValue(workout.scheduled_at));
}

// Workout-titel: linkt direct naar intervals.icu zodra de workout daar staat
// (gepubliceerd = intervals_event_id aanwezig); anders platte tekst.
export function WorkoutTitle({
  workout,
  athleteId,
  className = "truncate font-medium",
}: {
  workout: WorkoutRow;
  athleteId?: string;
  className?: string;
}) {
  if (workout.intervals_event_id) {
    return (
      <a
        href={intervalsWorkoutUrl(athleteId, workout)}
        target="_blank"
        rel="noreferrer"
        title="Open deze workout in intervals.icu"
        className={`block ${className} transition hover:text-primary hover:underline`}
      >
        {workout.title}
      </a>
    );
  }
  return <p className={className}>{workout.title}</p>;
}

export function WorkoutBlocks({
  blocks,
  ftpWatts,
  variant = "compact",
}: {
  blocks: WorkoutBlock[];
  ftpWatts?: number | null;
  variant?: "compact" | "preview";
}) {
  if (blocks.length === 0) return null;
  const total = blocks.reduce((sum, block) => sum + block.durationMinutes, 0) || 1;
  const maxPct = 160;
  const preview = variant === "preview";
  return (
    <div className="mt-3">
      <div
        className={cn(
          "flex overflow-hidden rounded-md border bg-muted",
          preview ? "h-32" : "h-16",
        )}
        role="img"
        aria-label="Workoutblokken met vermogensbanden"
      >
        {blocks.map((block, idx) => {
          const range = powerRangePercentForBlock(block, ftpWatts ?? null);
          const low = range ? Math.max(0, Math.min(maxPct, range[0])) : 0;
          const high = range ? Math.max(low, Math.min(maxPct, range[1])) : maxPct;
          const bandHeight = range ? Math.max(6, ((high - low) / maxPct) * 100) : 100;
          return (
            <div
              key={`${block.label}-${idx}`}
              title={`${block.label}: ${block.durationMinutes} min ${block.target || INTENSITY_LABELS[block.intensity]}`}
              className="relative min-w-[10px] border-r border-background/60 last:border-r-0"
              style={{
                width: `${Math.max(4, (block.durationMinutes / total) * 100)}%`,
                backgroundColor: `${INTENSITY_COLORS[block.intensity]}26`,
              }}
            >
              <span
                className={cn("absolute inset-x-0", preview && "shadow-sm")}
                style={{
                  bottom: `${(low / maxPct) * 100}%`,
                  height: `${bandHeight}%`,
                  backgroundColor: INTENSITY_COLORS[block.intensity],
                }}
              />
              {preview && block.durationMinutes >= total * 0.08 ? (
                <span className="absolute inset-x-1 bottom-1 truncate text-xs font-medium text-foreground/80">
                  {block.durationMinutes}m
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className={cn("mt-2 flex flex-wrap gap-1", preview && "gap-1.5")}>
        {blocks.map((block, idx) => (
          <span
            key={`${block.label}-label-${idx}`}
            className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            {block.label} {block.durationMinutes}m {block.target}
          </span>
        ))}
      </div>
    </div>
  );
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function positiveNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function secondsFromStep(row: Record<string, unknown>) {
  const seconds =
    positiveNumber(row.duration) ??
    positiveNumber(row.seconds) ??
    positiveNumber(row.secs) ??
    positiveNumber(row.duration_secs) ??
    positiveNumber(row.duration_seconds);
  if (seconds) return seconds;
  const minutes = positiveNumber(row.minutes) ?? positiveNumber(row.durationMinutes);
  return minutes ? minutes * 60 : null;
}

function powerTargetFromStep(row: Record<string, unknown>) {
  const power = recordValue(row.power ?? row.target ?? row.power_target);
  if (!power) return { target: "", pct: null as number | null };
  const units = String(power.units ?? power.unit ?? "").toLowerCase();
  const value = positiveNumber(power.value);
  const start = positiveNumber(power.start ?? power.low ?? power.min);
  const end = positiveNumber(power.end ?? power.high ?? power.max);
  const suffix = units.includes("%") || units.includes("ftp") ? "%" : units.includes("w") ? "w" : "";

  if (start && end) {
    return {
      target: `${Math.round(start)}-${Math.round(end)}${suffix}`,
      pct: suffix === "%" ? (start + end) / 2 : null,
    };
  }
  if (value) {
    return {
      target: `${Math.round(value)}${suffix}`,
      pct: suffix === "%" ? value : null,
    };
  }
  return { target: "", pct: null as number | null };
}

function intervalStepBlocks(value: unknown): WorkoutBlock[] {
  if (Array.isArray(value)) return value.flatMap(intervalStepBlocks);
  const row = recordValue(value);
  if (!row) return [];

  const nested = row.steps ?? row.blocks ?? row.children;
  if (Array.isArray(nested)) {
    const repeats = Math.max(
      1,
      Math.min(20, Math.round(positiveNumber(row.reps ?? row.repeat ?? row.repeat_count) ?? 1)),
    );
    return Array.from({ length: repeats }).flatMap(() => intervalStepBlocks(nested));
  }

  const seconds = secondsFromStep(row);
  if (!seconds) return [];
  const { target, pct } = powerTargetFromStep(row);
  const label = String(row.name ?? row.label ?? row.title ?? "Blok").trim() || "Blok";
  return [
    {
      label,
      durationMinutes: Math.max(1, Math.round(seconds / 60)),
      target,
      notes: "",
      intensity: intensityFromPct(pct),
    },
  ];
}

export function eventWorkoutBlocks(event: IntervalsEvent): WorkoutBlock[] {
  const doc = recordValue(event.workout_doc);
  const docBlocks = doc ? intervalStepBlocks(doc.steps ?? doc.blocks ?? doc.children) : [];
  if (docBlocks.length > 0) return docBlocks;

  const load = positiveNumber(event.icu_training_load ?? event.load_target ?? doc?.tss);
  const durationSeconds =
    positiveNumber(event.moving_time) ??
    positiveNumber(doc?.duration) ??
    (load ? Math.max(30, Math.round(load * 1.2)) * 60 : 60 * 60);
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return [
    {
      label: "Workout",
      durationMinutes: minutes,
      target: load ? `${Math.round(load)} TSS` : "",
      notes: "",
      intensity: intensityFromLoad(load, minutes),
    },
  ];
}
