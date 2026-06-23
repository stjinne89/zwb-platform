import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Calendar,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  MessageSquare,
  Mountain,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { EmptyState, HelpLink, PageHeader } from "@/components/app-ui";
import {
  fetchIntervalsEvents,
  fetchIntervalsWellness,
  type IntervalsEvent,
  type IntervalsWellness,
} from "@/lib/intervals/client";
import {
  createTrainingGoal,
  saveTrainerFeedback,
  saveWorkoutReport,
  updateTrainingPlan,
  updateWorkout,
} from "./_actions";
import {
  defaultTrainingPrompt,
  estimateTrainingLoad,
  INTENSITY_COLORS,
  INTENSITY_LABELS as WORKOUT_INTENSITY_LABELS,
  normalizeWorkoutBlocks,
  powerRangePercentForBlock,
  projectCtl,
  WORKOUT_INTENSITIES,
  type WorkoutBlock,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { ConnectIntervalsForm } from "./_components/connect-form";
import { DisconnectIntervalsButton } from "./_components/disconnect-button";
import { WellnessOptInToggle } from "./_components/wellness-optin-toggle";
import { AdjustTodayForm } from "./_components/adjust-today-form";
import { AiDraftForm } from "./_components/ai-draft-form";
import { DeleteTrainingPlanButton } from "./_components/delete-training-plan-button";
import { PlanActions } from "./_components/plan-actions";
import {
  TrainingLoadMetrics,
  type TrainingLoadPoint,
} from "./_components/training-load-chart";
import {
  summarizeWellness,
  summarizeTrainingReadiness,
  type WellnessSummary,
} from "@/lib/training/wellness";
import { zwbeterWordenAdvice } from "@/lib/training/zwbeterworden";
import { TrainerAccessPanel } from "./_components/trainer-access-panel";
import { cn } from "@/lib/utils";

type ProfileRow = {
  id: string;
  display_name: string | null;
  ftp_watts: number | null;
  weight_kg: number | string | null;
  zrl_category: string | null;
  zrl_division: string | null;
  community_roles?: string[] | null;
};

type StravaActivityRow = {
  id: number;
  profile_id: string;
  name: string | null;
  sport_type: string | null;
  start_date: string;
  distance_m: number | string;
  total_elevation_gain_m: number | string;
  kudos_count: number;
  moving_time_seconds: number;
  trainer: boolean;
};

type AssignmentRow = {
  id: string;
  athlete_id: string;
  trainer_id: string;
  status: string;
  notes: string | null;
  granted_at: string;
};

type GoalRow = {
  id: string;
  profile_id: string;
  title: string;
  goal_type: string;
  target_date: string | null;
  available_days: string[];
  max_hours_per_week: number | string | null;
  preferred_mode: string;
  experience_level: string;
  desired_intensity: string;
  risk_notes: string | null;
  status: string;
};

type PlanRow = {
  id: string;
  profile_id: string;
  trainer_id: string | null;
  goal_id: string | null;
  title: string;
  summary: string | null;
  start_date: string;
  end_date: string;
  status: string;
  source: string;
  created_at: string;
  adaptation_reason: string | null;
  parent_plan_id: string | null;
  ctl_projection_json?: Record<string, unknown> | null;
};

type WorkoutRow = {
  id: string;
  plan_id: string;
  profile_id: string;
  scheduled_at: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  intensity: string;
  target_type: string;
  structure_json: Array<{ label?: string; durationMinutes?: number; target?: string; notes?: string; intensity?: string }> | null;
  publish_status: string;
  publish_error: string | null;
  intervals_event_id: string | null;
  intervals_external_id: string | null;
};

type WorkoutReportRow = {
  id: string;
  workout_id: string;
  profile_id: string;
  athlete_rpe: number | null;
  athlete_feel: string | null;
  athlete_report: string | null;
  trainer_feedback: string | null;
  updated_at: string;
};

type AiGenerationRow = {
  id: string;
  profile_id: string;
  goal_id: string | null;
  status: "queued" | "in_progress" | "completed" | "failed" | "cancelled";
  error: string | null;
  created_at: string;
};

type TrainingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const GOAL_LABELS: Record<string, string> = {
  zrl: "ZRL",
  ladder: "Ladder",
  outdoor_event: "Outdoor event",
  gran_fondo: "Gran fondo",
  ftp: "FTP",
  base_fitness: "Basisconditie",
  rebuild: "Herstel/opbouw",
};

const INTENSITY_LABELS: Record<string, string> = {
  recovery: "Herstel",
  endurance: "Duur",
  tempo: "Tempo",
  threshold: "Drempel",
  vo2max: "VO2max",
  anaerobic: "Anaeroob",
  race: "Race",
  rest: "Rust",
};

function toNum(v: number | string | null | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatKm(meters?: number) {
  if (!meters) return "-";
  return `${(meters / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km`;
}

function formatHours(seconds?: number) {
  if (!seconds) return "-";
  return `${(seconds / 3600).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} u`;
}

function formatMeters(m?: number) {
  if (!m) return "-";
  return `${Math.round(m).toLocaleString("nl-NL")} m`;
}

function formatNumber(n?: number, digits = 0) {
  if (n === undefined || n === null) return "-";
  return n.toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function finiteNumber(value: number | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formAction(action: (formData: FormData) => Promise<unknown>) {
  return action as unknown as (formData: FormData) => Promise<void>;
}

function paramString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function dateValue(value: string) {
  return parseDate(value)?.toISOString().slice(0, 10) ?? "";
}

function timeValue(value: string) {
  return (parseDate(value) ?? new Date("2000-01-01T09:00:00+01:00")).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Amsterdam",
  });
}

function byProfile<T extends { profile_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) map.set(row.profile_id, [...(map.get(row.profile_id) ?? []), row]);
  return map;
}

function byPlan<T extends { plan_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) map.set(row.plan_id, [...(map.get(row.plan_id) ?? []), row]);
  return map;
}

function byWorkout<T extends { workout_id: string }>(rows: T[]) {
  const map = new Map<string, T>();
  for (const row of rows) map.set(row.workout_id, row);
  return map;
}

function loadSummary(rows: StravaActivityRow[]) {
  return rows.reduce(
    (acc, row) => ({
      activities: acc.activities + 1,
      distance: acc.distance + toNum(row.distance_m),
      elevation: acc.elevation + toNum(row.total_elevation_gain_m),
      time: acc.time + (row.moving_time_seconds ?? 0),
    }),
    { activities: 0, distance: 0, elevation: 0, time: 0 },
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <Icon className="size-5 text-primary" />
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function RecoveryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-3 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function PlanBadge({ status }: { status: string }) {
  const label =
    status === "published"
      ? "Gepubliceerd"
      : status === "approved"
        ? "Goedgekeurd"
        : status === "review"
          ? "Review"
          : status === "archived"
            ? "Archief"
            : "Concept";
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      {label}
    </span>
  );
}

function percentRangeForIntensity(intensity: string): [number, number] | null {
  const ranges: Record<string, [number, number]> = {
    recovery: [45, 60],
    endurance: [60, 75],
    tempo: [76, 90],
    threshold: [91, 105],
    vo2max: [106, 120],
    anaerobic: [121, 150],
    race: [85, 115],
    rest: [0, 0],
  };
  return ranges[intensity] ?? null;
}

function percentRangeForRpe(rpe: number): [number, number] | null {
  if (rpe <= 1) return [0, 45];
  if (rpe <= 3) return [45, 60];
  if (rpe === 4) return [60, 70];
  if (rpe === 5) return [70, 80];
  if (rpe === 6) return [80, 90];
  if (rpe === 7) return [90, 100];
  if (rpe === 8) return [100, 110];
  if (rpe === 9) return [110, 125];
  return [125, 150];
}

function rpeFromText(text: string) {
  const match = text.match(/\brpe\s*([1-9]|10)\b/i);
  return match ? Number(match[1]) : null;
}

function wattRangeLabel(ftpWatts: number | null | undefined, range: [number, number] | null) {
  if (!ftpWatts || !range) return null;
  const [low, high] = range;
  if (low === 0 && high === 0) return "Rust";
  return `${Math.round((ftpWatts * low) / 100)}-${Math.round((ftpWatts * high) / 100)}w`;
}

function targetHint({
  ftpWatts,
  intensity,
  target,
  notes,
}: {
  ftpWatts?: number | null;
  intensity: string;
  target?: string;
  notes?: string;
}) {
  const text = `${target ?? ""} ${notes ?? ""}`;
  const rpe = rpeFromText(text);
  const range = rpe ? percentRangeForRpe(rpe) : percentRangeForIntensity(intensity);
  const watts = wattRangeLabel(ftpWatts, range);
  if (!watts || /(\d+\s*-\s*\d+\s*w|\d+\s*w)/i.test(target ?? "")) return null;
  return rpe ? `RPE ${rpe}: ${watts}` : watts;
}

// Inklapbaar blok (native <details>): standaard dicht, klik op de kop opent het.
function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-lg border bg-card" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t">{children}</div>
    </details>
  );
}

function intervalsWorkoutUrl(athleteId: string | undefined, workout: WorkoutRow) {
  const date = dateValue(workout.scheduled_at);
  return athleteId
    ? `https://intervals.icu/athletes/${athleteId}/calendar?date=${date}`
    : `https://intervals.icu/calendar?date=${date}`;
}

// Workout-titel: linkt direct naar intervals.icu zodra de workout daar staat
// (gepubliceerd = intervals_event_id aanwezig); anders platte tekst.
function WorkoutTitle({
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

function WorkoutBlocks({
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
                <span className="absolute inset-x-1 bottom-1 truncate text-[10px] font-medium text-foreground/80">
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

function intensityFromPct(pct: number | null): WorkoutIntensity {
  if (pct == null) return "endurance";
  if (pct < 55) return "recovery";
  if (pct < 76) return "endurance";
  if (pct < 91) return "tempo";
  if (pct < 106) return "threshold";
  if (pct < 121) return "vo2max";
  return "anaerobic";
}

function intensityFromLoad(load: number | null, minutes: number): WorkoutIntensity {
  if (!load || minutes <= 0) return "endurance";
  const loadPerHour = load / (minutes / 60);
  if (loadPerHour < 35) return "recovery";
  if (loadPerHour < 65) return "endurance";
  if (loadPerHour < 85) return "tempo";
  if (loadPerHour < 105) return "threshold";
  if (loadPerHour < 125) return "vo2max";
  return "anaerobic";
}

function intervalStepBlocks(value: unknown): WorkoutBlock[] {
  if (Array.isArray(value)) return value.flatMap(intervalStepBlocks);
  const row = recordValue(value);
  if (!row) return [];

  const nested = row.steps ?? row.blocks ?? row.children;
  if (Array.isArray(nested)) {
    const repeats = Math.max(1, Math.min(20, Math.round(positiveNumber(row.reps ?? row.repeat ?? row.repeat_count) ?? 1)));
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

function eventWorkoutBlocks(event: IntervalsEvent): WorkoutBlock[] {
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

function ReportPanel({
  workout,
  report,
  editable,
}: {
  workout: WorkoutRow;
  report?: WorkoutReportRow;
  editable: boolean;
}) {
  return (
    <details className="mt-3 rounded-md border bg-background/60 p-3">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <MessageSquare className="size-4" />
        Rapportage en feedback
      </summary>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <form action={formAction(saveWorkoutReport)} className="space-y-2">
          <input type="hidden" name="workout_id" value={workout.id} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              RPE
              <input
                name="athlete_rpe"
                type="number"
                min="1"
                max="10"
                defaultValue={report?.athlete_rpe ?? ""}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Gevoel
              <select
                name="athlete_feel"
                defaultValue={report?.athlete_feel ?? ""}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
              >
                <option value="">-</option>
                <option value="goed">Goed</option>
                <option value="neutraal">Neutraal</option>
                <option value="zwaar">Zwaar</option>
                <option value="slecht">Slecht</option>
              </select>
            </label>
          </div>
          <textarea
            name="athlete_report"
            rows={3}
            defaultValue={report?.athlete_report ?? ""}
            placeholder="Hoe ging deze workout?"
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
          {!editable ? (
            <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">Rapportage opslaan</button>
          ) : null}
        </form>
        <form action={formAction(saveTrainerFeedback)} className="space-y-2">
          <input type="hidden" name="workout_id" value={workout.id} />
          <textarea
            name="trainer_feedback"
            rows={5}
            defaultValue={report?.trainer_feedback ?? ""}
            placeholder="Feedback van de trainer"
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
          {editable ? (
            <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">Feedback opslaan</button>
          ) : null}
        </form>
      </div>
    </details>
  );
}

function WorkoutList({
  workouts,
  editable,
  ftpWatts,
  reports,
  intervalsAthleteId,
}: {
  workouts: WorkoutRow[];
  editable: boolean;
  ftpWatts?: number | null;
  reports?: Map<string, WorkoutReportRow>;
  intervalsAthleteId?: string;
}) {
  if (workouts.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Nog geen workouts in dit schema.</p>;
  }

  return (
    <ul className="divide-y">
      {workouts.map((workout) => {
        const blocks = normalizeWorkoutBlocks(workout.structure_json, workout.intensity as WorkoutIntensity);
        const report = reports?.get(workout.id);
        return (
        <li key={workout.id} className="p-4">
          {editable ? (
            <form action={formAction(updateWorkout)} className="grid gap-3 lg:grid-cols-[120px_90px_1fr_90px_120px_auto] lg:items-end">
              <input type="hidden" name="workout_id" value={workout.id} />
              <label className="text-xs text-muted-foreground">
                Datum
                <input
                  name="date"
                  type="date"
                  defaultValue={dateValue(workout.scheduled_at)}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Tijd
                <input
                  name="time"
                  type="time"
                  defaultValue={timeValue(workout.scheduled_at)}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Titel
                <input
                  name="title"
                  defaultValue={workout.title}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Minuten
                <input
                  name="duration_minutes"
                  type="number"
                  min="1"
                  max="480"
                  defaultValue={workout.duration_minutes}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Intensiteit
                <select
                  name="intensity"
                  defaultValue={workout.intensity}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                >
                  {Object.entries(INTENSITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <input type="hidden" name="target_type" value={workout.target_type} />
              <button className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
                Opslaan
              </button>
              <label className="lg:col-span-6 text-xs text-muted-foreground">
                Instructie
                <textarea
                  name="description"
                  defaultValue={workout.description ?? ""}
                  rows={2}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <div className="lg:col-span-6 rounded-md border bg-background/60 p-3">
                <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <FileText className="size-3" />
                  Intervalblokken
                </p>
                <div className="space-y-2">
                  {[...blocks, { label: "", durationMinutes: 5, target: "", notes: "", intensity: workout.intensity as WorkoutIntensity }].map((block, idx) => (
                    <div key={idx} className="grid gap-2 rounded-md border p-2 lg:grid-cols-[1fr_80px_1fr_1fr_130px_90px]">
                      <input name="block_label" defaultValue={block.label} placeholder="Blok" className="rounded-md border bg-background px-2 py-1 text-sm" />
                      <input name="block_duration" type="number" min="0" max="480" defaultValue={block.durationMinutes || ""} className="rounded-md border bg-background px-2 py-1 text-sm" />
                      <input name="block_target" defaultValue={block.target} placeholder="Doel" className="rounded-md border bg-background px-2 py-1 text-sm" />
                      <input name="block_notes" defaultValue={block.notes} placeholder="Notitie" className="rounded-md border bg-background px-2 py-1 text-sm" />
                      <select name="block_intensity" defaultValue={block.intensity} className="rounded-md border bg-background px-2 py-1 text-sm">
                        {WORKOUT_INTENSITIES.map((value) => (
                          <option key={value} value={value}>{WORKOUT_INTENSITY_LABELS[value]}</option>
                        ))}
                      </select>
                      <select name="block_delete" defaultValue="0" className="rounded-md border bg-background px-2 py-1 text-sm">
                        <option value="0">Bewaar</option>
                        <option value="1">Verwijder</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-center">
              <span className="text-sm text-muted-foreground">
                {new Date(workout.scheduled_at).toLocaleDateString("nl-NL", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  timeZone: "Europe/Amsterdam",
                })}
              </span>
              <div className="min-w-0">
                <WorkoutTitle workout={workout} athleteId={intervalsAthleteId} />
                <p className="text-xs text-muted-foreground">
                  {workout.duration_minutes} min - {INTENSITY_LABELS[workout.intensity] ?? workout.intensity}
                  {workout.publish_status === "failed" ? ` - publicatiefout: ${workout.publish_error}` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{workout.publish_status}</span>
            </div>
          )}
          <WorkoutBlocks blocks={blocks} ftpWatts={ftpWatts} />
          {workout.structure_json && workout.structure_json.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {blocks.slice(0, 5).map((step, idx) => {
                const hint = targetHint({
                  ftpWatts,
                  intensity: step.intensity,
                  target: step.target,
                  notes: step.notes,
                });
                return (
                  <span key={idx} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {step.label ?? "Blok"} {step.durationMinutes ? `${step.durationMinutes}m` : ""} {step.target ?? ""}
                    {hint ? ` - ${hint}` : ""}
                  </span>
                );
              })}
            </div>
          )}
          {workout.publish_status === "published" && workout.intervals_event_id ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`/api/training/workouts/${workout.id}/fit`}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                <Download className="size-3" />
                Download FIT
              </a>
              <Link
                href="/hulp#fit-export"
                title="Hulp bij workout op je fietscomputer"
                aria-label="Hulp bij workout op je fietscomputer"
                className="inline-flex items-center rounded-md border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <CircleHelp className="size-3.5" />
              </Link>
            </div>
          ) : null}
          <ReportPanel workout={workout} report={report} editable={editable} />
        </li>
      );
      })}
    </ul>
  );
}

type CoachLoadMetric = {
  ctl?: number;
  tsb?: number;
  eftp?: number;
  error?: string;
};

type CoachRecoveryState = {
  optedIn: boolean;
  summary: WellnessSummary | null;
};

function recoveryStateLabel(state?: WellnessSummary["state"]) {
  if (state === "fresh") return "Fris";
  if (state === "fatigued") return "Vermoeid";
  if (state === "normal") return "Normaal";
  return "-";
}

function recoveryPillClass(state?: WellnessSummary["state"]) {
  if (state === "fatigued") return "bg-destructive/15 text-destructive";
  if (state === "fresh") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (state === "normal") return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
}


function formatWellnessDate(value: string | null) {
  if (!value) return "-";
  return new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Amsterdam",
  });
}

function CoachWorkspace({
  assignments,
  profiles,
  goals,
  activities,
  plans,
  workoutsByPlan,
  workoutsByProfile,
  intervalEvents,
  intervalAthleteIds,
  loadMetrics,
  wellness,
  reportsByWorkout,
  aiGenerations,
  selectedAthleteId,
  canUseAi,
  canGenerateAi,
  canPublish,
  nowMs,
}: {
  assignments: AssignmentRow[];
  profiles: Map<string, ProfileRow>;
  goals: Map<string, GoalRow[]>;
  activities: Map<string, StravaActivityRow[]>;
  plans: Map<string, PlanRow[]>;
  workoutsByPlan: Map<string, WorkoutRow[]>;
  workoutsByProfile: Map<string, WorkoutRow[]>;
  intervalEvents: Map<string, IntervalsEvent[]>;
  intervalAthleteIds: Map<string, string>;
  loadMetrics: Map<string, CoachLoadMetric>;
  wellness: Map<string, CoachRecoveryState>;
  reportsByWorkout: Map<string, WorkoutReportRow>;
  aiGenerations: AiGenerationRow[];
  selectedAthleteId?: string;
  canUseAi: boolean;
  canGenerateAi: boolean;
  canPublish: boolean;
  nowMs: number;
}) {
  if (assignments.length === 0) {
    return <EmptyState>Geen toegewezen leden.</EmptyState>;
  }

  const selected =
    assignments.find((assignment) => assignment.athlete_id === selectedAthleteId) ?? assignments[0];
  const athlete = profiles.get(selected.athlete_id);
  const athleteGoals = goals.get(selected.athlete_id) ?? [];
  const athleteActivities = activities.get(selected.athlete_id) ?? [];
  const athletePlans = plans.get(selected.athlete_id) ?? [];
  const athleteWorkouts = workoutsByProfile.get(selected.athlete_id) ?? [];
  const athleteEvents = intervalEvents.get(selected.athlete_id) ?? [];
  const intervalsAthleteId = intervalAthleteIds.get(selected.athlete_id);
  const metric = loadMetrics.get(selected.athlete_id);
  const pendingGenerationsByGoal = new Map<string, AiGenerationRow>();
  for (const generation of aiGenerations) {
    if (
      generation.profile_id === selected.athlete_id &&
      generation.goal_id &&
      !pendingGenerationsByGoal.has(generation.goal_id)
    ) {
      pendingGenerationsByGoal.set(generation.goal_id, generation);
    }
  }
  const recovery = wellness.get(selected.athlete_id);
  const trainingReadiness = summarizeTrainingReadiness({
    tsb: metric?.tsb,
    wellness: recovery?.summary,
  });
  const totals = loadSummary(athleteActivities);
  const recentZwbWorkouts = athleteWorkouts
    .filter((workout) => new Date(workout.scheduled_at).getTime() < nowMs)
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
    .slice(0, 4);
  const upcomingZwbWorkouts = athleteWorkouts
    .filter((workout) => new Date(workout.scheduled_at).getTime() >= nowMs)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .slice(0, 5);
  const activePlan = athletePlans.find((plan) => plan.status !== "archived");
  const activePlanWorkouts = activePlan ? workoutsByPlan.get(activePlan.id) ?? [] : [];
  const ctlProjection = projectCtl(
    metric?.ctl,
    activePlanWorkouts.map((workout) => ({
      date: workout.scheduled_at.slice(0, 10),
      load: estimateTrainingLoad(normalizeWorkoutBlocks(workout.structure_json, workout.intensity as WorkoutIntensity)),
    })),
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <aside className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Users className="size-5 text-primary" />
            Renners
          </h2>
        </div>
        <div className="divide-y">
          {assignments.map((assignment) => {
            const rowProfile = profiles.get(assignment.athlete_id);
            const rowMetric = loadMetrics.get(assignment.athlete_id);
            const rowRecovery = wellness.get(assignment.athlete_id);
            const rowActivities = activities.get(assignment.athlete_id) ?? [];
            const rowTotals = loadSummary(rowActivities);
            const rowTrainingReadiness = summarizeTrainingReadiness({
              tsb: rowMetric?.tsb,
              wellness: rowRecovery?.summary,
            });
            const active = assignment.athlete_id === selected.athlete_id;
            return (
              <Link
                key={assignment.id}
                href={`/training?tab=trainer&athlete=${assignment.athlete_id}`}
                className={`block p-4 transition hover:bg-muted/50 ${active ? "bg-primary/10" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{rowProfile?.display_name ?? "ZWB-lid"}</p>
                    <p className="text-xs text-muted-foreground">
                      FTP {rowProfile?.ftp_watts ?? "-"}w - {formatKm(rowTotals.distance)}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {rowProfile?.zrl_category ?? "-"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span className="rounded-md bg-background px-2 py-1">
                    CTL <strong>{formatNumber(rowMetric?.ctl, 1)}</strong>
                  </span>
                  <span className="rounded-md bg-background px-2 py-1">
                    Form <strong>{formatNumber(rowMetric?.tsb, 1)}</strong>
                  </span>
                </div>
                <div className="mt-2">
                  {(() => {
                    const advice = rowRecovery?.summary
                      ? zwbeterWordenAdvice(rowTrainingReadiness, rowProfile?.zrl_division)
                      : null;
                    return (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          advice ? advice.pill : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {advice
                          ? `${advice.level}/5 · ${advice.title}`
                          : rowRecovery?.optedIn
                            ? "Geen hersteldata"
                            : "Herstel niet gedeeld"}
                      </span>
                    );
                  })()}
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      <div className="space-y-4">
        <section className="rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Trainer-overzicht</p>
              <h2 className="text-2xl font-semibold">{athlete?.display_name ?? "ZWB-lid"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                FTP {athlete?.ftp_watts ?? "-"}w - {athlete?.zrl_category ? `ZRL ${athlete.zrl_category}` : "Geen ZRL-categorie"}
              </p>
            </div>
            <Link
              href={`/leden/${selected.athlete_id}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Profiel <ExternalLink className="size-3" />
            </Link>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="size-4 text-primary" />
                Belasting
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <MetricCard icon={TrendingUp} label="CTL" value={formatNumber(metric?.ctl, 1)} />
                <MetricCard icon={Activity} label="Form" value={formatNumber(metric?.tsb, 1)} />
                <MetricCard
                  icon={ShieldCheck}
                  label="Trainingsruimte"
                  value={trainingReadiness.score != null ? `${trainingReadiness.score}` : "-"}
                  hint={zwbeterWordenAdvice(trainingReadiness, athlete?.zrl_division).title}
                />
                <MetricCard icon={TrendingUp} label="CTL doel" value={formatNumber(ctlProjection ?? undefined, 1)} />
                <MetricCard icon={Mountain} label="28 dagen" value={formatKm(totals.distance)} hint={`${formatHours(totals.time)} - ${formatMeters(totals.elevation)}`} />
                <MetricCard icon={Calendar} label="Komend" value={`${upcomingZwbWorkouts.length + athleteEvents.length}`} hint="ZWB + intervals.icu" />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="size-4 text-primary" />
                  Hersteltrend
                </h3>
                {recovery?.summary ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${recoveryPillClass(
                      recovery.summary.state,
                    )}`}
                  >
                    {recoveryStateLabel(recovery.summary.state)}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 rounded-md bg-muted/40 p-3">
                {!recovery || !recovery.optedIn ? (
                  <p className="text-sm text-muted-foreground">
                    Hersteldata niet gedeeld.
                  </p>
                ) : !recovery.summary ? (
                  <p className="text-sm text-muted-foreground">
                    Nog geen hersteldata gevonden in intervals.icu.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <RecoveryStat
                        label="Readiness"
                        value={recovery.summary.readiness != null ? `${recovery.summary.readiness}` : "-"}
                      />
                      <RecoveryStat
                        label="Laatste"
                        value={formatWellnessDate(recovery.summary.latestDate)}
                      />
                      <RecoveryStat
                        label="HRV 7d"
                        value={recovery.summary.hrv != null ? `${recovery.summary.hrv}` : "-"}
                      />
                      <RecoveryStat
                        label="Rust-HR 7d"
                        value={recovery.summary.restingHr != null ? `${recovery.summary.restingHr}` : "-"}
                      />
                      <RecoveryStat
                        label="Slaap 7d"
                        value={recovery.summary.sleepHours != null ? `${recovery.summary.sleepHours}u` : "-"}
                      />
                      <RecoveryStat label="Dagen" value={`${recovery.summary.days}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {recovery.summary.note}
                    </p>
                  </div>
                )}
              </div>
              {(() => {
                const advice = zwbeterWordenAdvice(trainingReadiness, athlete?.zrl_division);
                return (
                  <div className={`mt-3 rounded-md p-3 ${advice.block}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">ZWBeterWorden</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${advice.pill}`}
                      >
                        {advice.level > 0 ? `Niveau ${advice.level}/5` : "—"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold">{advice.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{advice.description}</p>
                  </div>
                );
              })()}
            </div>
          </div>
          {metric?.error ? (
            <p className="mt-3 text-xs text-muted-foreground">Intervals: {metric.error}</p>
          ) : null}

        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card">
            <div className="border-b p-4">
              <h3 className="font-semibold">Doelen</h3>
            </div>
            {athleteGoals.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Geen actieve intake.</p>
            ) : (
              <div className="divide-y">
                {athleteGoals.map((goal) => {
                  const pendingGeneration = pendingGenerationsByGoal.get(goal.id);
                  return (
                    <div key={goal.id} className="p-4">
                      <p className="font-medium">{goal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {GOAL_LABELS[goal.goal_type] ?? goal.goal_type}
                        {goal.target_date ? ` - ${new Date(goal.target_date).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" })}` : ""}
                        {goal.max_hours_per_week ? ` - max ${goal.max_hours_per_week}u/week` : ""}
                      </p>
                      <AiDraftForm
                        athleteId={selected.athlete_id}
                        goalId={goal.id}
                        defaultPrompt={defaultTrainingPrompt()}
                        canUseAi={canUseAi}
                        canGenerateAi={canGenerateAi}
                        initialGenerationId={pendingGeneration?.id}
                        initialStatus={pendingGeneration?.status}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card">
            <div className="border-b p-4">
              <h3 className="font-semibold">Afgelopen uitvoering</h3>
            </div>
            {athleteActivities.length === 0 && recentZwbWorkouts.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Geen recente uitvoering.</p>
            ) : (
              <ul className="divide-y">
                {athleteActivities.slice(0, 5).map((activity) => (
                  <li key={activity.id} className="grid gap-2 p-4 sm:grid-cols-[90px_1fr_auto] sm:items-center">
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.start_date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" })}
                    </span>
                    <a
                      href={`https://www.strava.com/activities/${activity.id}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Open deze rit op Strava"
                      className="block truncate text-sm font-medium transition hover:text-primary hover:underline"
                    >
                      {activity.name ?? "Rit"}
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {formatKm(toNum(activity.distance_m))} - {formatHours(activity.moving_time_seconds)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h3 className="font-semibold">Komende workouts</h3>
          </div>
          {upcomingZwbWorkouts.length === 0 && athleteEvents.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Geen komende workouts.</p>
          ) : (
            <ul className="divide-y">
              {upcomingZwbWorkouts.map((workout) => (
                <li key={workout.id} className="grid gap-2 p-4 sm:grid-cols-[110px_1fr_auto] sm:items-center">
                  <span className="text-xs text-muted-foreground">
                    {new Date(workout.scheduled_at).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Amsterdam" })}
                  </span>
                  <WorkoutTitle
                    workout={workout}
                    athleteId={intervalsAthleteId}
                    className="truncate text-sm font-medium"
                  />
                  <span className="text-xs text-muted-foreground">
                    {workout.duration_minutes} min - {INTENSITY_LABELS[workout.intensity] ?? workout.intensity}
                  </span>
                </li>
              ))}
              {athleteEvents.map((event) => (
                <li key={String(event.id)} className="grid gap-2 p-4 sm:grid-cols-[110px_1fr_auto] sm:items-center">
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.start_date_local).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  <p className="truncate text-sm font-medium">{event.name ?? "Intervals workout"}</p>
                  <span className="text-xs text-muted-foreground">
                    {event.icu_training_load ? `${Math.round(event.icu_training_load)} TSS` : "intervals.icu"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold">Schema&apos;s maken en beheren</h3>
          {athletePlans.length === 0 ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Nog geen schema&apos;s voor dit lid.</p>
          ) : (
            athletePlans.map((plan) => (
              <div key={plan.id} className="rounded-lg border bg-card">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
                  <form action={formAction(updateTrainingPlan)} className="grid flex-1 gap-2 lg:grid-cols-[1fr_130px_130px_auto]">
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <label className="text-xs text-muted-foreground">
                      Schema
                      <input name="title" defaultValue={plan.title} className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm" />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Start
                      <input name="start_date" type="date" defaultValue={plan.start_date} className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm" />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Eind
                      <input name="end_date" type="date" defaultValue={plan.end_date} className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm" />
                    </label>
                    <button className="self-end rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">Schema opslaan</button>
                    <label className="lg:col-span-4 text-xs text-muted-foreground">
                      Samenvatting
                      <textarea name="summary" rows={3} defaultValue={plan.summary ?? ""} className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm" />
                    </label>
                    {plan.adaptation_reason ? (
                      <p className="lg:col-span-4 text-xs text-muted-foreground">{plan.adaptation_reason}</p>
                    ) : null}
                  </form>
                  <PlanBadge status={plan.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 border-b p-3">
                  <PlanActions
                    planId={plan.id}
                    status={plan.status}
                    mayApprove
                    mayPublish={canPublish}
                  />
                  <DeleteTrainingPlanButton planId={plan.id} title={plan.title} />
                </div>
                <WorkoutList
                  workouts={workoutsByPlan.get(plan.id) ?? []}
                  editable
                  ftpWatts={athlete?.ftp_watts}
                  reports={reportsByWorkout}
                  intervalsAthleteId={intervalsAthleteId}
                />
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export default async function TrainingPage({ searchParams }: TrainingPageProps) {
  const params = (await searchParams) ?? {};
  const requestedTab = paramString(params.tab);
  const requestedAthleteId = paramString(params.athlete);
  const supabase = await createClient();
  const admin = createAdminClient();
  const access = await getCurrentUserAccess(supabase);
  const user = access.user;
  if (!user) redirect("/login");

  const now = new Date();
  const since7 = new Date(now);
  since7.setDate(since7.getDate() - 7);
  const since21Workouts = new Date(now);
  since21Workouts.setDate(since21Workouts.getDate() - 21);
  const since28 = new Date(now);
  since28.setDate(since28.getDate() - 28);

  const [
    { data: myProfile },
    { data: conn },
    { data: stravaRows },
    { data: trainerRows },
    { data: myAssignments },
    { data: myGoals },
    { data: myPlans },
    { data: myWorkouts },
    { data: myReports },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, ftp_watts, weight_kg, zrl_category, zrl_division")
      .eq("id", user.id)
      .single(),
    supabase
      .from("intervals_connections")
      .select("athlete_id, athlete_name, api_key, updated_at, wellness_opt_in")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("strava_activities")
      .select(
        "id, profile_id, name, sport_type, start_date, distance_m, total_elevation_gain_m, kudos_count, moving_time_seconds, trainer",
      )
      .eq("profile_id", user.id)
      .gte("start_date", since7.toISOString())
      .order("start_date", { ascending: false })
      .limit(40),
    admin
      .from("profiles")
      .select("id, display_name, community_roles")
      .contains("community_roles", ["trainer"])
      .eq("is_approved", true)
      .order("display_name"),
    supabase
      .from("training_coach_assignments")
      .select("id, athlete_id, trainer_id, status, notes, granted_at")
      .eq("athlete_id", user.id)
      .eq("status", "active"),
    supabase
      .from("training_goals")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("training_plans")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("training_workouts")
      .select("*")
      .eq("profile_id", user.id)
      .order("scheduled_at", { ascending: true })
      .limit(200),
    supabase
      .from("training_workout_reports")
      .select("*")
      .eq("profile_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  let wellness: IntervalsWellness[] = [];
  let events: IntervalsEvent[] = [];
  let fetchError: string | null = null;
  if (conn?.api_key && conn.athlete_id) {
    try {
      [wellness, events] = await Promise.all([
        fetchIntervalsWellness(conn.api_key, conn.athlete_id, 730),
        fetchIntervalsEvents(conn.api_key, conn.athlete_id, 14),
      ]);
    } catch (err) {
      fetchError = err instanceof Error ? err.message : "Onbekende fout.";
    }
  }

  const activities = (stravaRows ?? []) as StravaActivityRow[];
  const totals7 = loadSummary(activities);
  const wellnessSorted = [...wellness].sort((a, b) => a.id.localeCompare(b.id));
  const latest = wellnessSorted[wellnessSorted.length - 1];
  // Herstel-samenvatting (alleen tonen als het lid wellness deelt).
  const recoverySummary =
    conn?.wellness_opt_in && wellness.length > 0
      ? summarizeWellness(
          wellness.map((w) => ({
            date: w.id,
            resting_hr: w.restingHR ?? null,
            hrv: w.hrv ?? w.hrvSDNN ?? null,
            sleep_secs: w.sleepSecs ?? null,
            sleep_score: w.sleepScore ?? null,
            readiness: w.readiness ?? null,
            fatigue: w.fatigue ?? null,
            stress: w.stress ?? null,
            soreness: w.soreness ?? null,
            mood: w.mood ?? null,
          })),
        )
      : null;
  const eftpFirst = wellnessSorted.find((w) => w.eftp)?.eftp;
  const eftpLatest = [...wellnessSorted].reverse().find((w) => w.eftp)?.eftp;
  const eftpDelta = eftpLatest && eftpFirst ? eftpLatest - eftpFirst : null;
  const currentTsb =
    latest?.ctl !== undefined && latest?.atl !== undefined ? latest.ctl - latest.atl : null;
  const todayKey = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Amsterdam",
  });
  const trainingLoadPoints: TrainingLoadPoint[] = wellnessSorted.map((row) => {
    const ctl = finiteNumber(row.ctl);
    const atl = finiteNumber(row.atl);
    return {
      date: row.id,
      load: finiteNumber(row.ctl_load ?? row.atl_load),
      ctl,
      atl,
      tsb: ctl != null && atl != null ? ctl - atl : null,
    };
  });
  const currentTrainingReadiness = summarizeTrainingReadiness({
    tsb: currentTsb,
    wellness: recoverySummary,
  });
  const upcomingEvents = [...events]
    .filter((e) => e.start_date_local >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local))
    .slice(0, 5);
  const memberWorkouts = (myWorkouts ?? []) as WorkoutRow[];
  const myWorkoutsByPlan = byPlan(memberWorkouts);
  // Toon workouts van VANDAAG of later. Vergelijk op datum (Amsterdam), niet op
  // exact tijdstip — anders verdwijnt de training van vandaag zodra de klok het
  // geplande uur voorbij is, terwijl de trainer-weergave 'm wel toont.
  const upcomingZwbMemberWorkouts = memberWorkouts
    .filter((workout) => String(workout.scheduled_at).slice(0, 10) >= todayKey)
    .slice(0, 8);
  const nextZwbWorkout = upcomingZwbMemberWorkouts[0] ?? null;
  const nextIntervalsEvent = upcomingEvents[0] ?? null;
  const nextWorkout =
    nextZwbWorkout && nextIntervalsEvent
      ? new Date(nextZwbWorkout.scheduled_at).getTime() <=
          new Date(nextIntervalsEvent.start_date_local).getTime()
        ? { kind: "zwb" as const, workout: nextZwbWorkout }
        : { kind: "intervals" as const, event: nextIntervalsEvent }
      : nextZwbWorkout
        ? { kind: "zwb" as const, workout: nextZwbWorkout }
        : nextIntervalsEvent
          ? { kind: "intervals" as const, event: nextIntervalsEvent }
          : null;
  const myReportsByWorkout = byWorkout((myReports ?? []) as WorkoutReportRow[]);

  const assignments = (myAssignments ?? []) as AssignmentRow[];
  const trainerIds = assignments.map((a) => a.trainer_id);
  const trainerMap = new Map(
    ((trainerRows ?? []) as ProfileRow[]).map((trainer) => [trainer.id, trainer]),
  );
  const selectableTrainers = ((trainerRows ?? []) as ProfileRow[]).filter(
    (trainer) => !trainerIds.includes(trainer.id),
  );
  const goals = (myGoals ?? []) as GoalRow[];
  const plans = (myPlans ?? []) as PlanRow[];
  const canUseAi = Boolean(process.env.OPENAI_API_KEY);
  const canCoach = access.has("training.view_assigned");
  const canSelfManagePlans = access.has("training.create_plans");
  const canSelfPublishPlans = access.has("training.publish_plans");

  let coachAssignments: AssignmentRow[] = [];
  let coachProfiles = new Map<string, ProfileRow>();
  let coachGoals = new Map<string, GoalRow[]>();
  let coachActivities = new Map<string, StravaActivityRow[]>();
  let coachPlans = new Map<string, PlanRow[]>();
  let coachWorkouts = new Map<string, WorkoutRow[]>();
  let coachWorkoutsByProfile = new Map<string, WorkoutRow[]>();
  let coachReportsByWorkout = new Map<string, WorkoutReportRow>();
  let coachAiGenerations: AiGenerationRow[] = [];

  if (canCoach) {
    const { data: assignmentRows } = await supabase
      .from("training_coach_assignments")
      .select("id, athlete_id, trainer_id, status, notes, granted_at")
      .eq("trainer_id", user.id)
      .eq("status", "active")
      .order("granted_at", { ascending: false });
    coachAssignments = (assignmentRows ?? []) as AssignmentRow[];
    const athleteIds = coachAssignments.map((assignment) => assignment.athlete_id);
    if (athleteIds.length > 0) {
      const [
        { data: profileRows },
        { data: goalRows },
        { data: activityRows },
        { data: planRows },
        { data: workoutRows },
        { data: reportRows },
        { data: aiGenerationRows },
      ] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, display_name, ftp_watts, weight_kg, zrl_category, zrl_division")
            .in("id", athleteIds),
          supabase
            .from("training_goals")
            .select("*")
            .in("profile_id", athleteIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("strava_activities")
            .select(
              "id, profile_id, name, sport_type, start_date, distance_m, total_elevation_gain_m, kudos_count, moving_time_seconds, trainer",
            )
            .in("profile_id", athleteIds)
            .gte("start_date", since28.toISOString())
            .order("start_date", { ascending: false }),
          supabase
            .from("training_plans")
            .select("*")
            .in("profile_id", athleteIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("training_workouts")
            .select("*")
            .in("profile_id", athleteIds)
            .gte("scheduled_at", since21Workouts.toISOString())
            .order("scheduled_at", { ascending: true }),
          supabase
            .from("training_workout_reports")
            .select("*")
            .in("profile_id", athleteIds)
            .order("updated_at", { ascending: false }),
          supabase
            .from("training_ai_generations")
            .select("id, profile_id, goal_id, status, error, created_at")
            .in("profile_id", athleteIds)
            .in("status", ["queued", "in_progress"])
            .order("created_at", { ascending: false })
            .limit(50),
        ]);
      coachProfiles = new Map(((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
      coachGoals = byProfile((goalRows ?? []) as GoalRow[]);
      coachActivities = byProfile((activityRows ?? []) as StravaActivityRow[]);
      coachPlans = byProfile((planRows ?? []) as PlanRow[]);
      const workouts = (workoutRows ?? []) as WorkoutRow[];
      coachWorkouts = byPlan(workouts);
      coachWorkoutsByProfile = byProfile(workouts);
      coachReportsByWorkout = byWorkout((reportRows ?? []) as WorkoutReportRow[]);
      coachAiGenerations = (aiGenerationRows ?? []) as AiGenerationRow[];
    }
  }

  const activeTab = canCoach && requestedTab === "trainer" ? "trainer" : "member";
  const coachLoadMetrics = new Map<string, CoachLoadMetric>();
  const coachIntervalEvents = new Map<string, IntervalsEvent[]>();
  const coachIntervalAthleteIds = new Map<string, string>();
  const coachWellness = new Map<string, CoachRecoveryState>();

  if (activeTab === "trainer" && coachAssignments.length > 0) {
    const athleteIds = coachAssignments.map((assignment) => assignment.athlete_id);
    const { data: coachConnections } = await admin
      .from("intervals_connections")
      .select("profile_id, athlete_id, api_key, wellness_opt_in")
      .in("profile_id", athleteIds);

    await Promise.all(
      ((coachConnections ?? []) as Array<{
        profile_id: string;
        athlete_id: string;
        api_key: string;
        wellness_opt_in: boolean | null;
      }>).map(
        async (connection) => {
          try {
            const [rows, upcoming] = await Promise.all([
              fetchIntervalsWellness(connection.api_key, connection.athlete_id, 30),
              fetchIntervalsEvents(connection.api_key, connection.athlete_id, 14),
            ]);
            coachIntervalAthleteIds.set(connection.profile_id, connection.athlete_id);
            const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id));
            const latestRow = sorted[sorted.length - 1];
            coachLoadMetrics.set(connection.profile_id, {
              ctl: latestRow?.ctl,
              tsb:
                latestRow?.ctl !== undefined && latestRow?.atl !== undefined
                  ? latestRow.ctl - latestRow.atl
                  : undefined,
              eftp: [...sorted].reverse().find((row) => row.eftp)?.eftp,
            });
            if (connection.wellness_opt_in) {
              const summary = summarizeWellness(
                rows.map((w) => ({
                  date: w.id,
                  resting_hr: w.restingHR ?? null,
                  hrv: w.hrv ?? w.hrvSDNN ?? null,
                  sleep_secs: w.sleepSecs ?? null,
                  sleep_score: w.sleepScore ?? null,
                  readiness: w.readiness ?? null,
                  fatigue: w.fatigue ?? null,
                  stress: w.stress ?? null,
                  soreness: w.soreness ?? null,
                  mood: w.mood ?? null,
                })),
              );
              coachWellness.set(connection.profile_id, {
                optedIn: true,
                summary,
              });
            } else {
              coachWellness.set(connection.profile_id, {
                optedIn: false,
                summary: null,
              });
            }
            coachIntervalEvents.set(
              connection.profile_id,
              upcoming
                .filter((event) => event.start_date_local >= new Date().toISOString().slice(0, 10))
                .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local))
                .slice(0, 5),
            );
          } catch (err) {
            coachLoadMetrics.set(connection.profile_id, {
              error: err instanceof Error ? err.message : "Kon intervals.icu niet laden.",
            });
          }
        },
      ),
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="ZWB Training"
        title="Coach-cockpit"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/training/vermogen"
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              <Activity className="size-4" />
              Mijn vermogen
            </Link>
            <HelpLink href="/hulp#trainingsruimte" />
            {conn ? <DisconnectIntervalsButton /> : null}
          </div>
        }
      />

      {fetchError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {fetchError}
        </p>
      )}

      {canCoach && (
        <nav className="flex w-fit rounded-lg border bg-card p-1 text-sm">
          <Link
            href="/training"
            className={`rounded-md px-3 py-1.5 font-medium ${
              activeTab === "member"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mijn training
          </Link>
          <Link
            href="/training?tab=trainer"
            className={`rounded-md px-3 py-1.5 font-medium ${
              activeTab === "trainer"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Trainer
          </Link>
        </nav>
      )}

      {activeTab === "member" ? (
        <>
      {!conn && (
        <ConnectIntervalsForm />
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <TrainingLoadMetrics
          points={trainingLoadPoints}
          ctl={latest?.ctl ?? null}
          tsb={currentTsb}
          today={todayKey}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Trainingsruimte"
          value={currentTrainingReadiness.score != null ? `${currentTrainingReadiness.score}` : "-"}
          hint={zwbeterWordenAdvice(currentTrainingReadiness, myProfile?.zrl_division).title}
        />
        <MetricCard
          icon={Mountain}
          label="eFTP"
          value={eftpLatest ? `${Math.round(eftpLatest)}w` : "-"}
          hint={
            eftpDelta !== null
              ? `${eFTPDeltaLabel(eftpDelta)} over 90 dagen`
              : `${myProfile?.ftp_watts ?? "-"}w in profiel`
          }
        />
        <MetricCard
          icon={Calendar}
          label="7 dagen totaal"
          value={formatKm(totals7.distance)}
          hint={
            activities.length > 0
              ? `${activities.length} ritten - ${formatHours(totals7.time)} - ${formatMeters(totals7.elevation)}`
              : "Nog geen recente Strava-ritten"
          }
        />
      </section>

      {nextWorkout && (
        <section className="rounded-lg border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <ClipboardList className="size-5 text-primary" />
            Eerstvolgende workout
          </h2>
          {nextWorkout.kind === "zwb" ? (
            <div className="mt-4">
              <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                <span className="text-sm text-muted-foreground">
                  {new Date(nextWorkout.workout.scheduled_at).toLocaleDateString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    timeZone: "Europe/Amsterdam",
                  })}
                </span>
                <div className="min-w-0">
                  <WorkoutTitle workout={nextWorkout.workout} athleteId={conn?.athlete_id} />
                  <p className="text-xs text-muted-foreground">
                    ZWB-schema - {nextWorkout.workout.duration_minutes} min -{" "}
                    {INTENSITY_LABELS[nextWorkout.workout.intensity] ?? nextWorkout.workout.intensity}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {nextWorkout.workout.publish_status}
                </span>
              </div>
              <WorkoutBlocks
                blocks={normalizeWorkoutBlocks(
                  nextWorkout.workout.structure_json,
                  nextWorkout.workout.intensity as WorkoutIntensity,
                )}
                ftpWatts={myProfile?.ftp_watts}
                variant="preview"
              />
            </div>
          ) : (
            <div className="mt-4">
              <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                <span className="text-sm text-muted-foreground">
                  {new Date(nextWorkout.event.start_date_local).toLocaleDateString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <p className="truncate font-medium">{nextWorkout.event.name ?? "Workout"}</p>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {nextWorkout.event.icu_training_load
                    ? `${Math.round(nextWorkout.event.icu_training_load)} TSS`
                    : "intervals.icu"}
                </span>
              </div>
              <WorkoutBlocks
                blocks={eventWorkoutBlocks(nextWorkout.event)}
                ftpWatts={myProfile?.ftp_watts}
                variant="preview"
              />
            </div>
          )}
        </section>
      )}

      {conn && (
        <section className="rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <Activity className="size-5 text-primary" />
                Herstel &amp; belastbaarheid
              </h2>
            </div>
            <WellnessOptInToggle initialOptIn={Boolean(conn.wellness_opt_in)} />
          </div>

          {conn.wellness_opt_in &&
            (recoverySummary ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <RecoveryStat
                    label="Status"
                    value={
                      recoverySummary.state === "fresh"
                        ? "Fris"
                        : recoverySummary.state === "fatigued"
                          ? "Vermoeid"
                          : recoverySummary.state === "normal"
                            ? "Normaal"
                            : "—"
                    }
                  />
                  <RecoveryStat
                    label="Readiness"
                    value={
                      recoverySummary.readiness != null
                        ? `${recoverySummary.readiness}`
                        : "-"
                    }
                  />
                  <RecoveryStat
                    label="HRV (7d gem.)"
                    value={recoverySummary.hrv != null ? `${recoverySummary.hrv}` : "—"}
                  />
                  <RecoveryStat
                    label="Rust-HR (7d gem.)"
                    value={
                      recoverySummary.restingHr != null
                        ? `${recoverySummary.restingHr}`
                        : "—"
                    }
                  />
                  <RecoveryStat
                    label="Slaap (7d gem.)"
                    value={
                      recoverySummary.sleepHours != null
                        ? `${recoverySummary.sleepHours}u`
                        : "—"
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {recoverySummary.note}
                </p>
                {(() => {
                  const advice = zwbeterWordenAdvice(
                    currentTrainingReadiness,
                    myProfile?.zrl_division,
                  );
                  return (
                    <div className={`rounded-md p-3 ${advice.block}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">ZWBeterWorden</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${advice.pill}`}
                        >
                          {advice.level > 0 ? `Niveau ${advice.level}/5` : "—"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">{advice.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{advice.description}</p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Nog geen herstel-data gevonden in intervals.icu. Log je slaap/HRV
                (bv. via Garmin/Oura/Whoop-koppeling daar) en het verschijnt hier.
              </p>
            ))}
        </section>
      )}

      <AdjustTodayForm />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-5 text-primary" />
            Trainer-toegang
          </h2>
          <TrainerAccessPanel
            assignments={assignments.map((assignment) => ({
              id: assignment.id,
              trainerId: assignment.trainer_id,
              trainerName:
                assignment.trainer_id === user.id
                  ? "Ikzelf"
                  : trainerMap.get(assignment.trainer_id)?.display_name ?? "Trainer",
            }))}
            trainers={selectableTrainers.map((trainer) => ({
              id: trainer.id,
              label:
                trainer.id === user.id
                  ? `${trainer.display_name ?? "Ik"} (ikzelf)`
                  : trainer.display_name ?? "Trainer",
            }))}
          />
        </div>

        <form action={formAction(createTrainingGoal)} className="rounded-lg border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <ClipboardList className="size-5 text-primary" />
            Nieuw trainingsdoel
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm">
              Titel
              <input name="title" required placeholder="ZRL Round 5 pieken" className="mt-1 w-full rounded-md border bg-background px-3 py-2" />
            </label>
            <label className="text-sm">
              Doeltype
              <select name="goal_type" className="mt-1 w-full rounded-md border bg-background px-3 py-2">
                {Object.entries(GOAL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Targetdatum
              <input name="target_date" type="date" className="mt-1 w-full rounded-md border bg-background px-3 py-2" />
            </label>
            <label className="text-sm">
              Uren per week
              <input name="max_hours_per_week" type="number" min="1" max="30" step="0.5" className="mt-1 w-full rounded-md border bg-background px-3 py-2" />
            </label>
            <label className="text-sm">
              Voorkeur
              <select name="preferred_mode" className="mt-1 w-full rounded-md border bg-background px-3 py-2">
                <option value="mixed">Mix</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
              </select>
            </label>
            <label className="text-sm">
              Ervaring
              <select name="experience_level" className="mt-1 w-full rounded-md border bg-background px-3 py-2">
                <option value="intermediate">Gemiddeld</option>
                <option value="beginner">Beginner</option>
                <option value="advanced">Gevorderd</option>
              </select>
            </label>
            <label className="text-sm">
              Belasting
              <select name="desired_intensity" className="mt-1 w-full rounded-md border bg-background px-3 py-2">
                <option value="balanced">Gebalanceerd</option>
                <option value="easy">Voorzichtig</option>
                <option value="hard">Ambitieus</option>
              </select>
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm">Beschikbare dagen</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {["ma", "di", "wo", "do", "vr", "za", "zo"].map((day) => (
                  <label key={day} className="rounded-md border px-2 py-1 text-sm">
                    <input type="checkbox" name="available_days" value={day} className="mr-1" />
                    {day}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="sm:col-span-2 text-sm">
              Blessures, risico&apos;s of aandachtspunten
              <textarea name="risk_notes" rows={3} className="mt-1 w-full rounded-md border bg-background px-3 py-2" />
            </label>
          </div>
          <button className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Doel opslaan
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {conn?.athlete_id ? (
          <a
            href={`https://intervals.icu/athletes/${conn.athlete_id}/calendar`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 transition hover:border-primary/40"
          >
            <h2 className="font-semibold">Bekijk schema in intervals.icu</h2>
            <ExternalLink className="size-5 shrink-0 text-muted-foreground" />
          </a>
        ) : null}

        <CollapsibleCard
          title="Komende workouts"
          subtitle="Uit intervals.icu en ZWB-schema's"
        >
          {upcomingEvents.length === 0 && upcomingZwbMemberWorkouts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Geen geplande workouts.</p>
          ) : (
            <ul className="divide-y">
              {upcomingZwbMemberWorkouts.map((workout) => (
                <li key={workout.id} className="p-4">
                  <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                    <span className="text-sm text-muted-foreground">
                      {new Date(workout.scheduled_at).toLocaleDateString("nl-NL", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        timeZone: "Europe/Amsterdam",
                      })}
                    </span>
                    <div className="min-w-0">
                      <WorkoutTitle workout={workout} athleteId={conn?.athlete_id} />
                      <p className="text-xs text-muted-foreground">
                        ZWB-schema - {workout.duration_minutes} min - {INTENSITY_LABELS[workout.intensity] ?? workout.intensity}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{workout.publish_status}</span>
                  </div>
                  <WorkoutBlocks
                    blocks={normalizeWorkoutBlocks(workout.structure_json, workout.intensity as WorkoutIntensity)}
                    ftpWatts={myProfile?.ftp_watts}
                  />
                  {workout.publish_status === "published" && workout.intervals_event_id ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={`/api/training/workouts/${workout.id}/fit`}
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                      >
                        <Download className="size-3" />
                        Download FIT
                      </a>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      FIT nog niet beschikbaar.
                    </p>
                  )}
                </li>
              ))}
              {upcomingEvents.map((event) => (
                <li key={String(event.id)} className="grid gap-2 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                  <span className="text-sm text-muted-foreground">
                    {new Date(event.start_date_local).toLocaleDateString("nl-NL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <p className="truncate font-medium">{event.name ?? "Workout"}</p>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {event.icu_training_load ? `${Math.round(event.icu_training_load)} TSS` : "-"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>

        <CollapsibleCard title="Mijn doelen">
          {goals.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Geen trainingsdoelen.</p>
          ) : (
            <ul className="divide-y">
              {goals.map((goal) => (
                <li key={goal.id} className="p-4">
                  <p className="font-medium">{goal.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {GOAL_LABELS[goal.goal_type] ?? goal.goal_type}
                    {goal.target_date ? ` - ${new Date(goal.target_date).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" })}` : ""}
                    {goal.max_hours_per_week ? ` - max ${goal.max_hours_per_week}u/week` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>

        <CollapsibleCard title="Mijn ZWB-schema's">
        {plans.length === 0 ? (
          <EmptyState>Geen ZWB-trainingsschema&apos;s.</EmptyState>
        ) : (
          <div className="divide-y">
            {plans.map((plan) => (
              <article key={plan.id}>
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div>
                    <h3 className="font-semibold">{plan.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(plan.start_date).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" })} - {new Date(plan.end_date).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" })}
                    </p>
                  </div>
                  <PlanBadge status={plan.status} />
                </div>
                {(() => {
                  // Een renner mag zijn eigen dag-aanpassing (afgeleid plan) zelf
                  // goedkeuren/publiceren, ook zonder trainer/bestuur-rol.
                  const ownAdaptation = Boolean(plan.parent_plan_id);
                  const mayApprove = canSelfManagePlans || ownAdaptation;
                  const mayPublish = canSelfPublishPlans || ownAdaptation;
                  if (!mayApprove && !mayPublish) return null;
                  return (
                    <div className="border-y p-3">
                      <PlanActions
                        planId={plan.id}
                        status={plan.status}
                        mayApprove={mayApprove}
                        mayPublish={mayPublish}
                      />
                    </div>
                  );
                })()}
                {plan.summary && <p className="px-4 pb-3 text-sm text-muted-foreground whitespace-pre-line">{plan.summary}</p>}
                <WorkoutList
                  workouts={myWorkoutsByPlan.get(plan.id) ?? []}
                  editable={false}
                  ftpWatts={myProfile?.ftp_watts}
                  reports={myReportsByWorkout}
                  intervalsAthleteId={conn?.athlete_id}
                />
              </article>
            ))}
          </div>
        )}
        </CollapsibleCard>
      </section>
        </>
      ) : null}

      {activeTab === "trainer" && (
        <section className="space-y-4">
          <CoachWorkspace
            assignments={coachAssignments}
            profiles={coachProfiles}
            goals={coachGoals}
            activities={coachActivities}
            plans={coachPlans}
            workoutsByPlan={coachWorkouts}
            workoutsByProfile={coachWorkoutsByProfile}
            intervalEvents={coachIntervalEvents}
            intervalAthleteIds={coachIntervalAthleteIds}
            loadMetrics={coachLoadMetrics}
            wellness={coachWellness}
            reportsByWorkout={coachReportsByWorkout}
            aiGenerations={coachAiGenerations}
            selectedAthleteId={requestedAthleteId}
            canUseAi={canUseAi}
            canGenerateAi={access.has("training.ai_generate")}
            canPublish={access.has("training.publish_plans")}
            nowMs={now.getTime()}
          />
        </section>
      )}
    </div>
  );
}

function eFTPDeltaLabel(delta: number) {
  return `${delta > 0 ? "+" : ""}${delta.toFixed(0)}w`;
}
