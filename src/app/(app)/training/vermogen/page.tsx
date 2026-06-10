import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ArrowLeft, CircleHelp, Gauge, Scale, Users, Zap } from "lucide-react";
import { PageHeader } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { fetchIntervalsPowerCurve } from "@/lib/intervals/client";
import { normalizePowerCurvePoints } from "@/lib/intervals/power-curve";
import { wattsAtDuration, POWER_DURATIONS } from "@/lib/teams/power-profile";
import { ConnectIntervalsForm } from "../_components/connect-form";
import { SyncPowerButton } from "../../teams/_components/sync-power-button";
import {
  PowerCurveChart,
  type ComparisonRider,
  type PowerCurvePoint,
} from "./_components/power-curve-chart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PERIODS = [
  { value: "42d", label: "6 weken" },
  { value: "90d", label: "90 dagen" },
  { value: "all", label: "All-time" },
] as const;

type PowerProfileRow = {
  profile_id: string;
  rider_type: string | null;
  weight_kg: number | string | null;
  watts_15s: number | null;
  watts_30s: number | null;
  watts_1m: number | null;
  watts_2m: number | null;
  watts_5m: number | null;
  watts_10m: number | null;
  watts_20m: number | null;
  curve_points?: unknown;
  profiles: { display_name: string | null } | Array<{ display_name: string | null }> | null;
};

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function profileName(
  profiles: PowerProfileRow["profiles"],
) {
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  return profile?.display_name ?? "ZWB-lid";
}

function fixedPoints(row: PowerProfileRow): PowerCurvePoint[] {
  const values = [
    row.watts_15s,
    row.watts_30s,
    row.watts_1m,
    row.watts_2m,
    row.watts_5m,
    row.watts_10m,
    row.watts_20m,
  ];
  return POWER_DURATIONS.flatMap((duration, index) => {
    const watts = numberOrNull(values[index]);
    return watts == null ? [] : [{ seconds: duration.seconds, watts }];
  });
}

function storedCurvePoints(row: PowerProfileRow) {
  if (!Array.isArray(row.curve_points)) return [];
  const points = row.curve_points.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const point = value as Record<string, unknown>;
    const seconds = Number(point.seconds);
    const watts = Number(point.watts);
    const wattsPerKg = Number(point.wattsPerKg);
    if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(watts) || watts <= 0) {
      return [];
    }
    return [{
      seconds,
      watts,
      wattsPerKg:
        Number.isFinite(wattsPerKg) && wattsPerKg > 0
          ? wattsPerKg
          : null,
    }];
  });
  return normalizePowerCurvePoints(points);
}

function downsample(points: PowerCurvePoint[], limit = 260) {
  if (points.length <= limit) return points;
  const result: PowerCurvePoint[] = [];
  for (let index = 0; index < limit; index += 1) {
    const position = Math.round((index / (limit - 1)) * (points.length - 1));
    const point = points[position];
    if (!result.length || result[result.length - 1].seconds !== point.seconds) result.push(point);
  }
  return result;
}

function formatValue(value: number | null, suffix: string) {
  return value == null ? "-" : `${Math.round(value)}${suffix}`;
}

export default async function PowerPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rawPeriod = (await searchParams).period;
  const requestedPeriod = Array.isArray(rawPeriod) ? rawPeriod[0] : rawPeriod;
  const period = PERIODS.some((option) => option.value === requestedPeriod)
    ? requestedPeriod!
    : "90d";

  const [profileResult, connectionResult, comparisonResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, weight_kg, ftp_watts")
        .eq("id", user.id)
        .single(),
      supabase
        .from("intervals_connections")
        .select("athlete_id, api_key")
        .eq("profile_id", user.id)
        .maybeSingle(),
      supabase
        .from("rider_power_profiles")
        .select(
          "profile_id, rider_type, weight_kg, watts_15s, watts_30s, watts_1m, watts_2m, watts_5m, watts_10m, watts_20m, curve_points, profiles(display_name)",
        )
        .in("sync_status", ["ok", "partial"])
        .neq("profile_id", user.id),
    ]);
  const profile = profileResult.data;
  const connection = connectionResult.data;
  let comparisonRows: unknown[] | null = comparisonResult.data;
  if (comparisonResult.error?.message.includes("curve_points")) {
    const fallback = await supabase
      .from("rider_power_profiles")
      .select(
        "profile_id, rider_type, weight_kg, watts_15s, watts_30s, watts_1m, watts_2m, watts_5m, watts_10m, watts_20m, profiles(display_name)",
      )
      .in("sync_status", ["ok", "partial"])
      .neq("profile_id", user.id);
    comparisonRows = fallback.data;
  }

  let curve: Awaited<ReturnType<typeof fetchIntervalsPowerCurve>> | null = null;
  let curveError: string | null = null;
  if (connection?.api_key && connection.athlete_id) {
    try {
      curve = await fetchIntervalsPowerCurve(connection.api_key, connection.athlete_id, period);
    } catch (error) {
      curveError = error instanceof Error ? error.message : "Kon de powercurve niet laden.";
    }
  }

  const curvePoints = curve?.points ?? [];
  const ownPoints = downsample(curvePoints);
  const comparisonRiders: ComparisonRider[] = ((comparisonRows ?? []) as unknown as PowerProfileRow[])
    .map((row) => {
      const storedPoints = storedCurvePoints(row);
      return {
        id: row.profile_id,
        name: profileName(row.profiles),
        riderType: row.rider_type,
        weightKg: numberOrNull(row.weight_kg),
        points: downsample(storedPoints.length >= 3 ? storedPoints : fixedPoints(row)),
        hasFullCurve: storedPoints.length >= 3,
      };
    })
    .filter((rider) => rider.points.length >= 3)
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
  const ownWeightKg = numberOrNull(profile?.weight_kg);
  const ftpWatts = numberOrNull(curve?.ftpWatts) ?? numberOrNull(profile?.ftp_watts);
  const power5m = wattsAtDuration(curvePoints, 300);
  const power20m = wattsAtDuration(curvePoints, 1200);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ZWB Training"
        title="Mijn vermogen"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/hulp#vermogen">
              <Button variant="outline">
                <CircleHelp data-icon="inline-start" />
                Uitleg
              </Button>
            </Link>
            <Link href="/training">
              <Button variant="outline">
                <ArrowLeft data-icon="inline-start" />
                Coach-cockpit
              </Button>
            </Link>
            {connection ? <SyncPowerButton scope="self" /> : null}
          </div>
        }
      />

      {!connection ? (
        <ConnectIntervalsForm />
      ) : (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((option) => (
                <Link
                  key={option.value}
                  href={`/training/vermogen?period=${option.value}`}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    option.value === period
                      ? "bg-primary text-primary-foreground"
                      : "border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </section>

          {curveError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {curveError}
            </p>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={Zap} label="FTP / eFTP" value={formatValue(ftpWatts, " W")} />
            <Metric icon={Gauge} label="5 minuten" value={formatValue(power5m, " W")} />
            <Metric icon={Activity} label="20 minuten" value={formatValue(power20m, " W")} />
            <Metric
              icon={Scale}
              label="Huidig gewicht"
              value={ownWeightKg == null ? "-" : `${ownWeightKg.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} kg`}
            />
          </section>

          {ownPoints.length > 1 ? (
            <section className="rounded-lg border bg-card p-4 sm:p-5">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">Power-duration curve</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  <Users className="size-3.5" />
                  {comparisonRiders.length} vergelijkbare ZWB-profielen
                </span>
              </div>
              <PowerCurveChart
                ownName={profile?.display_name ?? "Jij"}
                ownWeightKg={ownWeightKg}
                ownPoints={ownPoints}
                riders={comparisonRiders}
              />
            </section>
          ) : (
            <section className="rounded-lg border border-dashed bg-card p-5">
              <h2 className="font-semibold">Nog geen powercurve gevonden</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Intervals gaf wel een koppeling terug, maar geen bruikbare vermogenspunten voor deze periode.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Metric({
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
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
