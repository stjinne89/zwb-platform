import { redirect } from "next/navigation";
import { Activity, Calendar, Mountain, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  fetchIntervalsActivities,
  fetchIntervalsEvents,
  fetchIntervalsWellness,
  type IntervalsActivity,
  type IntervalsEvent,
  type IntervalsWellness,
} from "@/lib/intervals/client";
import { ConnectIntervalsForm } from "./_components/connect-form";
import { DisconnectIntervalsButton } from "./_components/disconnect-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatKm(meters?: number) {
  if (!meters) return "—";
  return `${(meters / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km`;
}

function formatHours(seconds?: number) {
  if (!seconds) return "—";
  const h = seconds / 3600;
  return `${h.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} u`;
}

function formatMeters(m?: number) {
  if (!m) return "—";
  return `${Math.round(m).toLocaleString("nl-NL")} m`;
}

function formatNumber(n?: number, digits = 0) {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
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

export default async function TrainingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conn } = await supabase
    .from("intervals_connections")
    .select("athlete_id, athlete_name, api_key, updated_at")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!conn) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Training</h1>
          <p className="mt-1 text-muted-foreground">
            Jouw fitness-curve, eFTP-trend en geplande workouts uit intervals.icu.
          </p>
        </header>
        <ConnectIntervalsForm />
      </div>
    );
  }

  let wellness: IntervalsWellness[] = [];
  let activities: IntervalsActivity[] = [];
  let events: IntervalsEvent[] = [];
  let fetchError: string | null = null;

  try {
    [wellness, activities, events] = await Promise.all([
      fetchIntervalsWellness(conn.api_key, conn.athlete_id!, 90),
      fetchIntervalsActivities(conn.api_key, conn.athlete_id!, 14),
      fetchIntervalsEvents(conn.api_key, conn.athlete_id!, 14),
    ]);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Onbekende fout.";
  }

  const wellnessSorted = [...wellness].sort((a, b) => a.id.localeCompare(b.id));
  const latest = wellnessSorted[wellnessSorted.length - 1];
  const eftpFirst = wellnessSorted.find((w) => w.eftp)?.eftp;
  const eftpLatest = [...wellnessSorted].reverse().find((w) => w.eftp)?.eftp;
  const eftpDelta = eftpLatest && eftpFirst ? eftpLatest - eftpFirst : null;

  const recentActivities = [...activities]
    .sort((a, b) => (b.start_date_local ?? "").localeCompare(a.start_date_local ?? ""))
    .slice(0, 7);

  const upcomingEvents = [...events]
    .filter((e) => e.start_date_local >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local))
    .slice(0, 5);

  const total14 = activities.reduce(
    (acc, a) => ({
      distance: acc.distance + (a.distance ?? 0),
      elevation: acc.elevation + (a.total_elevation_gain ?? 0),
      time: acc.time + (a.moving_time ?? 0),
      tss: acc.tss + (a.icu_training_load ?? 0),
    }),
    { distance: 0, elevation: 0, time: 0, tss: 0 },
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Training</h1>
          <p className="mt-1 text-muted-foreground">
            Gekoppeld als{" "}
            <strong>{conn.athlete_name ?? conn.athlete_id}</strong> via intervals.icu.
          </p>
        </div>
        <DisconnectIntervalsButton />
      </header>

      {fetchError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {fetchError}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={TrendingUp}
          label="Fitness (CTL)"
          value={formatNumber(latest?.ctl, 1)}
          hint="Chronic Training Load — lange termijn vorm"
        />
        <MetricCard
          icon={Activity}
          label="Form (TSB)"
          value={formatNumber(
            latest?.ctl !== undefined && latest?.atl !== undefined
              ? latest.ctl - latest.atl
              : undefined,
            1,
          )}
          hint="CTL − ATL: positief = fris, negatief = vermoeid"
        />
        <MetricCard
          icon={Mountain}
          label="eFTP"
          value={eftpLatest ? `${Math.round(eftpLatest)}w` : "—"}
          hint={
            eftpDelta !== null
              ? `${eftpDelta > 0 ? "+" : ""}${eftpDelta.toFixed(0)}w over 90 dagen`
              : "Geschat vanuit recente rides"
          }
        />
        <MetricCard
          icon={Calendar}
          label="14 dagen TSS"
          value={formatNumber(Math.round(total14.tss), 0)}
          hint={`${formatKm(total14.distance)} · ${formatHours(total14.time)} · ${formatMeters(total14.elevation)}`}
        />
      </section>

      <section className="rounded-md border bg-card">
        <div className="border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Calendar className="size-4 text-primary" />
            Komende workouts
          </h2>
          <p className="text-sm text-muted-foreground">
            Wat staat er deze en volgende week in je planning?
          </p>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Geen geplande workouts in de komende 14 dagen.
          </p>
        ) : (
          <ul className="divide-y">
            {upcomingEvents.map((e) => (
              <li
                key={String(e.id)}
                className="grid gap-2 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center"
              >
                <span className="text-sm text-muted-foreground">
                  {new Date(e.start_date_local).toLocaleDateString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{e.name ?? "Workout"}</p>
                  {e.category && (
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {e.category}
                    </p>
                  )}
                </div>
                <span className="text-sm tabular-nums text-muted-foreground sm:text-right">
                  {e.icu_training_load ? `${Math.round(e.icu_training_load)} TSS` : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-md border bg-card">
        <div className="border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Activity className="size-4 text-primary" />
            Laatste activiteiten
          </h2>
          <p className="text-sm text-muted-foreground">
            7 meest recente trainingen uit intervals.icu.
          </p>
        </div>
        {recentActivities.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Nog geen activiteiten in de laatste 14 dagen.
          </p>
        ) : (
          <ul className="divide-y">
            {recentActivities.map((a) => (
              <li
                key={a.id}
                className="grid gap-2 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center"
              >
                <span className="text-sm text-muted-foreground">
                  {a.start_date_local
                    ? new Date(a.start_date_local).toLocaleDateString("nl-NL", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })
                    : "—"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.name ?? "Activiteit"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatKm(a.distance)} · {formatHours(a.moving_time)}
                    {a.total_elevation_gain ? ` · ${formatMeters(a.total_elevation_gain)}` : ""}
                  </p>
                </div>
                <span className="text-sm tabular-nums text-muted-foreground sm:text-right">
                  {a.icu_training_load ? `${Math.round(a.icu_training_load)} TSS` : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
