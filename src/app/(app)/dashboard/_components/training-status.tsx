import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { SectionHeader } from "@/components/app-ui";
import { fetchIntervalsWellness, type IntervalsWellness } from "@/lib/intervals/client";
import { computeZwbStatus } from "@/lib/training/zwbeterworden";
import { loadSubjectiveRecovery } from "@/lib/training/subjective-recovery";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request";
import type { WellnessDevice } from "@/lib/training/wellness";

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

export async function TrainingStatus({
  conn,
  sex,
  wellnessDevice,
}: {
  conn: TrainingStatusConn | null;
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

  // Het advies als brede tegel, de drie cijfers elk als tegel. De eerstvolgende
  // workout staat al bovenaan het dashboard.
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
