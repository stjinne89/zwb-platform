import Link from "next/link";
import { Activity, CalendarClock, Dumbbell, Gauge, HeartPulse } from "lucide-react";
import { InlineMoreLink, SectionHeader } from "@/components/app-ui";
import { fetchIntervalsWellness, type IntervalsWellness } from "@/lib/intervals/client";
import { computeZwbStatus } from "@/lib/training/zwbeterworden";
import { loadSubjectiveRecovery } from "@/lib/training/subjective-recovery";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request";
import type { WellnessDevice } from "@/lib/training/wellness";
import {
  INTENSITY_COLORS,
  INTENSITY_LABELS,
  type WorkoutIntensity,
} from "@/lib/training/workouts";

export type TrainingStatusConn = {
  api_key: string;
  athlete_id: string;
  wellness_opt_in: boolean | null;
};

export type TrainingStatusWorkout = {
  title: string;
  scheduled_at: string;
  intensity: string;
  /** Trainingsvorm van het kernwerk; zie plannedWorkoutIntensity(). */
  intensityLabel?: string;
  duration_minutes: number | null;
};

const RECOVERY_LABELS: Record<string, string> = {
  fresh: "Fris",
  normal: "Normaal",
  fatigued: "Vermoeid",
  unknown: "-",
};

function formatTsb(tsb: number | null): string {
  if (tsb == null) return "-";
  const rounded = Math.round(tsb);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function formatWorkoutDate(value: string): string {
  return new Date(value).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

export async function TrainingStatus({
  conn,
  nextWorkout,
  sex,
  wellnessDevice,
  tegels,
}: {
  tegels?: boolean;
  conn: TrainingStatusConn | null;
  nextWorkout: TrainingStatusWorkout | null;
  sex: string | null;
  wellnessDevice: WellnessDevice | null;
}) {
  let wellness: IntervalsWellness[] = [];
  // Gevoel en klachten van het lid wegen mee in de readiness, net als op de
  // trainingspagina; anders geven dashboard en ZWBeter een ander oordeel.
  const subjectivePromise = Promise.all([createClient(), getRequestUser()])
    .then(([supabase, user]) =>
      user ? loadSubjectiveRecovery(supabase, user.id, { includeSymptoms: true }) : null,
    )
    .catch(() => null);
  if (conn?.api_key && conn.athlete_id) {
    try {
      wellness = await fetchIntervalsWellness(conn.api_key, conn.athlete_id, 90);
    } catch {
      // intervals.icu onbereikbaar → val terug op het niveau-0-advies
    }
  }
  const subjective = await subjectivePromise;

  const status = computeZwbStatus(wellness, {
    wellnessOptIn: Boolean(conn?.wellness_opt_in),
    sex,
    wellnessDevice,
    subjective,
  });
  const { advice, ctl, tsb, recoverySummary } = status;
  const hasMetrics = ctl != null || tsb != null || recoverySummary != null;
  const intensity = (nextWorkout?.intensity ?? "endurance") as WorkoutIntensity;

  // Design "tegels": het advies als brede tegel, de drie cijfers elk als tegel.
  // De eerstvolgende workout staat daar al bovenaan het dashboard.
  if (tegels) {
    const recovery =
      recoverySummary?.readiness != null
        ? String(recoverySummary.readiness)
        : recoverySummary
          ? (RECOVERY_LABELS[recoverySummary.state] ?? "-")
          : "-";
    const stats = [
      { label: "Fitness", value: ctl != null ? String(Math.round(ctl)) : "-", sub: "CTL" },
      { label: "Vorm", value: formatTsb(tsb), sub: "TSB" },
      {
        label: "Herstel",
        value: recovery,
        sub:
          recoverySummary?.readiness != null
            ? (RECOVERY_LABELS[recoverySummary.state] ?? "")
            : "",
      },
    ];
    return (
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        <Link href="/zwbeter-worden" className="tg-tile tg-zwbeter col-span-3 !min-h-32">
          <span className="tg-tile-small">
            ZWBeter trainen{advice.level > 0 ? ` · niveau ${advice.level}` : ""}
          </span>
          <span className="tg-tile-title mt-0.5">{advice.title}</span>
          <span className="mt-1 text-sm opacity-90">{advice.description}</span>
        </Link>
        {hasMetrics &&
          stats.map((stat) => (
            <Link
              key={stat.label}
              href="/zwbeter-worden/belasting"
              className="tg-tile tg-zwbeter !min-h-32"
            >
              <span className="tg-tile-small">{stat.label}</span>
              <span className="tg-tile-num">{stat.value}</span>
              <span className="text-xs opacity-85">{stat.sub}</span>
            </Link>
          ))}
      </div>
    );
  }

  return (
    <section>
      <SectionHeader
        icon={HeartPulse}
        title="Jouw trainingsstatus"
        action={<InlineMoreLink href="/zwbeter-worden">Training</InlineMoreLink>}
      />
      <div className="space-y-3">
        <div className={`rounded-lg p-4 ${advice.block}`}>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${advice.pill}`}
          >
            ZWBeterWorden{advice.level > 0 ? ` · niveau ${advice.level}` : ""}
          </span>
          <p className="mt-2 text-lg font-semibold">{advice.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{advice.description}</p>
        </div>

        {hasMetrics && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat
              icon={<Activity className="size-4" />}
              label="Fitness"
              value={ctl != null ? String(Math.round(ctl)) : "-"}
              sub="CTL"
            />
            <Stat
              icon={<Gauge className="size-4" />}
              label="Vorm"
              value={formatTsb(tsb)}
              sub="TSB"
            />
            <Stat
              icon={<HeartPulse className="size-4" />}
              label="Herstel"
              value={
                recoverySummary?.readiness != null
                  ? String(recoverySummary.readiness)
                  : recoverySummary
                    ? RECOVERY_LABELS[recoverySummary.state] ?? "-"
                    : "-"
              }
              sub={
                recoverySummary?.readiness != null
                  ? `${RECOVERY_LABELS[recoverySummary.state] ?? ""}${
                      recoverySummary.readinessSource === "afgeleid" ? " (berekend)" : ""
                    }`.trim() || undefined
                  : undefined
              }
            />
          </div>
        )}

        {nextWorkout ? (
          <Link
            href="/zwbeter-worden"
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 transition hover:bg-muted/50"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Dumbbell className="size-3.5" />
                Eerstvolgende workout
              </div>
              <p className="mt-1 truncate font-medium">{nextWorkout.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatWorkoutDate(nextWorkout.scheduled_at)}
              </p>
            </div>
            <div className="shrink-0 text-right text-sm">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: INTENSITY_COLORS[intensity] ?? "#94a3b8" }}
                />
                {nextWorkout.intensityLabel ?? INTENSITY_LABELS[intensity] ?? nextWorkout.intensity}
              </span>
              {nextWorkout.duration_minutes != null && (
                <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                  {nextWorkout.duration_minutes} min
                </p>
              )}
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            <CalendarClock className="size-4" />
            Nog geen geplande workout.
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function TrainingStatusSkeleton() {
  return (
    <section>
      <SectionHeader icon={HeartPulse} title="Jouw trainingsstatus" />
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-lg border bg-muted/40" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="h-20 animate-pulse rounded-lg border bg-muted/40" />
          <div className="h-20 animate-pulse rounded-lg border bg-muted/40" />
          <div className="h-20 animate-pulse rounded-lg border bg-muted/40" />
        </div>
      </div>
    </section>
  );
}
