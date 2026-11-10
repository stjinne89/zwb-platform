import Link from "next/link";
import { cache } from "react";
import { fetchIntervalsWellness, type IntervalsWellness } from "@/lib/intervals/client";
import { computeZwbStatus } from "@/lib/training/zwbeterworden";
import { loadSubjectiveRecovery } from "@/lib/training/subjective-recovery";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request";
import { readinessAgeLabel, type WellnessDevice } from "@/lib/training/wellness";
import { ClubText } from "@/components/club-texts-provider";

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

type StatusArgs = {
  conn: TrainingStatusConn | null;
  sex: string | null;
  wellnessDevice: WellnessDevice | null;
};

// Het advies staat bij Mijn training en de cijfers bij Mijn fitheid: twee
// tegelrijen, één keer intervals.icu ophalen. React's cache deelt het resultaat
// binnen dezelfde render; de sleutel zijn de losse waarden, niet het object.
const loadStatus = cache(
  async (
    apiKey: string | null,
    athleteId: string | null,
    wellnessOptIn: boolean,
    sex: string | null,
    wellnessDevice: WellnessDevice | null,
  ) => {
    let wellness: IntervalsWellness[] = [];
    // Gevoel en klachten van het lid wegen mee in de readiness, net als op de
    // trainingspagina; anders geven dashboard en ZWBeter een ander oordeel.
    const subjectivePromise = Promise.all([createClient(), getRequestUser()])
      .then(([supabase, user]) =>
        user ? loadSubjectiveRecovery(supabase, user.id, { includeSymptoms: true }) : null,
      )
      .catch(() => null);
    if (apiKey && athleteId) {
      try {
        wellness = await fetchIntervalsWellness(apiKey, athleteId, 90);
      } catch {
        // intervals.icu onbereikbaar → val terug op het niveau-0-advies
      }
    }
    const subjective = await subjectivePromise;
    return computeZwbStatus(wellness, { wellnessOptIn, sex, wellnessDevice, subjective });
  },
);

function statusFor({ conn, sex, wellnessDevice }: StatusArgs) {
  return loadStatus(
    conn?.api_key ?? null,
    conn?.athlete_id ?? null,
    Boolean(conn?.wellness_opt_in),
    sex,
    wellnessDevice,
  );
}

/** Het trainingsadvies van vandaag als brede tegel, voor de rij Mijn training. */
export async function TrainingAdvice(props: StatusArgs) {
  const { advice } = await statusFor(props);
  return (
    <Link href="/zwbeter-worden" className="tg-tile tg-zwbeter col-span-2">
      <span className="tg-tile-small">
        <ClubText text="{beter} trainen" />{advice.level > 0 ? ` · niveau ${advice.level}` : ""}
      </span>
      <span className="tg-tile-title mt-0.5">{advice.title}</span>
      <span className="mt-1 text-sm opacity-90"><ClubText text={advice.description} /></span>
    </Link>
  );
}

/** Fitness, vorm en herstel samen in een tegel, voor de rij Mijn fitheid: de
 * drie lees je samen, dus geen veegrij (eigenaar akkoord, 2026-11-09). */
export async function FitnessStatus(props: StatusArgs) {
  const { ctl, tsb, recoverySummary } = await statusFor(props);
  if (ctl == null && tsb == null && recoverySummary == null) return null;
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
      // Een meting van gisteren zegt dat erbij, anders leest hij als vandaag.
      sub:
        recoverySummary?.readiness != null
          ? (readinessAgeLabel(recoverySummary) ?? RECOVERY_LABELS[recoverySummary.state] ?? "")
          : "",
    },
  ];
  return <FitnessTile stats={stats} />;
}

export type FitnessStat = { label: string; value: string; sub: string };

/** De tegel zelf, zonder ophalen; ook op /ontwerp-voorbeeld. */
export function FitnessTile({ stats }: { stats: FitnessStat[] }) {
  return (
    <Link href="/zwbeter-worden/belasting" className="tg-tile tg-zwbeter">
      <span className="tg-tile-small">Fitheid</span>
      <dl className="mt-auto grid gap-2 pt-2">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-end justify-between gap-2">
            <dt className="min-w-0 leading-tight">
              <span className="block text-[0.9375rem]">{stat.label}</span>
              {stat.sub && <span className="block text-xs opacity-85">{stat.sub}</span>}
            </dt>
            <dd className="text-[1.75rem] font-light leading-none tracking-tight tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}
