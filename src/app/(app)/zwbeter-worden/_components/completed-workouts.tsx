// Afgewerkte trainingen van de afgelopen week: wat er gepland stond, wat er
// gereden is en wat het lid er zelf van vond. Lid en trainer kijken naar
// dezelfde rij, net als bij de beoordeling.
//
// De cijfers komen uit de momentopname die bij het afronden is vastgelegd
// (metrics_json). Die is bewust bevroren: CTL en de gereedscore worden nergens
// bewaard, dus live herrekenen zou elke dag andere getallen geven.

import type { WorkoutMetricsSnapshot } from "@/lib/training/completion";
import { COMPLIANCE_LABELS, COMPLIANCE_PILLS } from "@/lib/training/compliance";
import { intensityLabel } from "@/lib/training/workouts";
import { WorkoutMetricsPanel } from "./workout-metrics-panel";
import { FEEL_LABELS, formatDayMonth } from "./format";
import type { WorkoutReportRow, WorkoutRow } from "./types";

/** Hoe ver terug de lijst kijkt. */
export const COMPLETED_WINDOW_DAYS = 7;

/** Wat er met de geplande training gebeurd is. */
export type WorkoutOutcome = "gereden" | "gemist" | "rustdag" | "gepland";

export type CompletedWorkoutItem = {
  workoutId: string;
  title: string;
  scheduledAt: string;
  outcome: WorkoutOutcome;
  /** Geplande duur en type, ook als er geen momentopname is. */
  plannedMinutes: number | null;
  plannedIntensity: string;
  metrics: WorkoutMetricsSnapshot | null;
  rpe: number | null;
  feel: string | null;
  report: string | null;
  trainerFeedback: string | null;
};

function dayKeyOf(scheduledAt: string) {
  return String(scheduledAt).slice(0, 10);
}

function shiftDays(dayKey: string, days: number) {
  const date = new Date(`${dayKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Wat er met een geplande training gebeurd is. Eén bron voor de schemapagina van
 * het lid en die van de trainer, zodat "gemist" overal hetzelfde betekent.
 *
 * Een training van vandaag die nog niet gereden is telt als gepland: de dag is
 * nog niet om.
 */
export function workoutOutcome(
  workout: WorkoutRow,
  report: WorkoutReportRow | undefined,
  todayKey: string,
): WorkoutOutcome {
  if (workout.status === "skipped") return "rustdag";
  if (workout.status === "completed" || report?.metrics_json?.tss != null) return "gereden";
  const dayKey = dayKeyOf(workout.scheduled_at);
  if (dayKey > todayKey) return "gepland";
  if (dayKey === todayKey && report?.athlete_rpe == null) return "gepland";
  return "gemist";
}

/**
 * De trainingen uit het venster, nieuwste eerst: gereden, gemist en als rustdag
 * afgeschreven. Een training van vandaag die nog moet gebeuren telt niet als
 * gemist; die staat gewoon nog in het schema.
 *
 * Geplande rustdagen (intensiteit 'rest') blijven eruit — daar valt niets te
 * missen.
 */
export function recentCompleted(
  workouts: WorkoutRow[],
  reports: Map<string, WorkoutReportRow> | undefined,
  todayKey: string,
  days = COMPLETED_WINDOW_DAYS,
): CompletedWorkoutItem[] {
  const fromKey = shiftDays(todayKey, -days);

  return workouts
    .flatMap((workout) => {
      const dayKey = dayKeyOf(workout.scheduled_at);
      if (dayKey < fromKey || dayKey > todayKey) return [];
      if (workout.intensity === "rest") return [];

      const report = reports?.get(workout.id);
      const outcome = workoutOutcome(workout, report, todayKey);
      // Wat nog moet gebeuren hoort in het schema, niet in de terugblik.
      if (outcome === "gepland") return [];

      return [
        {
          workoutId: workout.id,
          title: workout.title,
          scheduledAt: workout.scheduled_at,
          outcome,
          plannedMinutes: workout.duration_minutes ?? null,
          plannedIntensity: workout.intensity,
          metrics: report?.metrics_json ?? null,
          rpe: report?.athlete_rpe ?? null,
          feel: report?.athlete_feel ?? null,
          report: report?.athlete_report ?? null,
          trainerFeedback: report?.trainer_feedback ?? null,
        },
      ];
    })
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
}

/**
 * Eén oordeel per training. Gereden trainingen krijgen de nalevingspil uit de
 * momentopname; zonder rit valt er niets te vergelijken en zegt de pil alleen
 * wat er gebeurd is.
 */
function OutcomePill({ item }: { item: CompletedWorkoutItem }) {
  const base = "rounded-md px-2 py-0.5 text-xs font-medium";
  if (item.outcome === "rustdag") {
    return <span className={`${base} bg-muted text-muted-foreground`}>Rustdag</span>;
  }
  if (item.outcome === "gemist" || !item.metrics) {
    return (
      <span className={`${base} ${COMPLIANCE_PILLS.niet_gereden}`}>
        {COMPLIANCE_LABELS.niet_gereden}
      </span>
    );
  }
  return (
    <span className={`${base} ${COMPLIANCE_PILLS[item.metrics.verdict]}`}>
      {COMPLIANCE_LABELS[item.metrics.verdict]}
      {item.metrics.loadPct == null ? "" : ` · ${item.metrics.loadPct}%`}
    </span>
  );
}

function Column({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div className="rounded-md bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm tabular-nums">{lines.join(" · ") || "-"}</p>
    </div>
  );
}

function plannedLines(item: CompletedWorkoutItem) {
  const metrics = item.metrics;
  return [
    item.plannedMinutes ? `${item.plannedMinutes} min` : null,
    metrics?.plannedLoad ? `${metrics.plannedLoad} TSS` : null,
    intensityLabel(item.plannedIntensity),
  ].filter((part): part is string => Boolean(part));
}

function riddenLines(metrics: WorkoutMetricsSnapshot | null) {
  if (!metrics) return [];
  return [
    metrics.movingMinutes ? `${metrics.movingMinutes} min` : null,
    metrics.tss ? `${Math.round(metrics.tss)} TSS` : null,
    metrics.intensityFactor ? `IF ${metrics.intensityFactor.toFixed(2)}` : null,
  ].filter((part): part is string => Boolean(part));
}

function feelingLines(item: CompletedWorkoutItem) {
  return [
    item.rpe ? `RPE ${item.rpe}` : null,
    item.feel ? (FEEL_LABELS[item.feel] ?? item.feel) : null,
  ].filter((part): part is string => Boolean(part));
}

export function CompletedWorkouts({
  items,
  feelingLabel = "Jouw gevoel",
}: {
  items: CompletedWorkoutItem[];
  /** De trainer kijkt naar het gevoel van het lid, niet naar dat van zichzelf. */
  feelingLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Geen geplande trainingen in de afgelopen {COMPLETED_WINDOW_DAYS} dagen.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {items.map((item) => {
        const metrics = item.metrics;
        return (
          <li key={item.workoutId} className={`space-y-3 p-4 ${item.outcome === "gereden" ? "" : "bg-muted/20"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDayMonth(item.scheduledAt)}
                </p>
              </div>
              <OutcomePill item={item} />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <Column label="Gepland" lines={plannedLines(item)} />
              <Column label="Gereden" lines={riddenLines(metrics)} />
              <Column label={feelingLabel} lines={feelingLines(item)} />
            </div>

            {item.report ? (
              <p className="rounded-md bg-muted/40 p-3 text-sm whitespace-pre-line">
                {item.report}
              </p>
            ) : null}

            {item.trainerFeedback ? (
              <p className="rounded-md border-l-2 border-primary bg-primary/5 p-3 text-sm whitespace-pre-line">
                {item.trainerFeedback}
              </p>
            ) : null}

            {metrics ? (
              <details className="rounded-md border bg-background/60 p-3">
                <summary className="cursor-pointer text-sm font-medium">Alle cijfers</summary>
                <div className="mt-3">
                  <WorkoutMetricsPanel metrics={metrics} />
                </div>
              </details>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
