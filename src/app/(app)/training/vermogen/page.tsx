import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ArrowLeft, CircleHelp, Gauge, Scale, Users, Zap } from "lucide-react";
import { PageHeader } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  athletePhysique,
  fetchIntervalsAthlete,
  fetchIntervalsPowerCurve,
  fetchIntervalsWellness,
  latestWellnessValue,
} from "@/lib/intervals/client";
import { wattsAtDuration } from "@/lib/teams/power-profile";
import {
  COMPARISON_RIDER_COLUMNS,
  COMPARISON_RIDER_COLUMNS_LEGACY,
  comparisonRidersFromRows,
  downsample,
} from "@/lib/teams/comparison-riders";
import { ConnectIntervalsForm } from "../_components/connect-form";
import { SyncPowerButton } from "../../teams/_components/sync-power-button";
import { PowerCurveChart } from "@/components/charts/power-curve-chart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PERIODS = [
  { value: "42d", label: "6 weken" },
  { value: "60d", label: "60 dagen" },
  { value: "90d", label: "90 dagen" },
  { value: "1y", label: "12 maanden" },
  { value: "all", label: "All-time" },
] as const;

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
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

  const [profileResult, connectionResult, comparisonResult, sportSettingsResult] =
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
        .select(COMPARISON_RIDER_COLUMNS)
        .in("sync_status", ["ok", "partial"])
        .neq("profile_id", user.id),
      supabase
        .from("profile_sport_settings")
        .select("cp_watts, w_prime_joules")
        .eq("profile_id", user.id)
        .maybeSingle(),
    ]);
  const sportSettings = sportSettingsResult.data;
  const profile = profileResult.data;
  const connection = connectionResult.data;
  let comparisonRows: unknown[] | null = comparisonResult.data;
  if (comparisonResult.error?.message.includes("curve_points")) {
    const fallback = await supabase
      .from("rider_power_profiles")
      .select(COMPARISON_RIDER_COLUMNS_LEGACY)
      .in("sync_status", ["ok", "partial"])
      .neq("profile_id", user.id);
    comparisonRows = fallback.data;
  }

  let curve: Awaited<ReturnType<typeof fetchIntervalsPowerCurve>> | null = null;
  let curveError: string | null = null;
  let intervalsEftp: number | null = null;
  let intervalsFtp: number | null = null;
  let intervalsWeightKg: number | null = null;
  if (connection?.api_key && connection.athlete_id) {
    const [curveResult, wellness, athlete] = await Promise.all([
      fetchIntervalsPowerCurve(connection.api_key, connection.athlete_id, period).catch(
        (error: unknown) => error instanceof Error ? error : new Error("Kon de powercurve niet laden."),
      ),
      fetchIntervalsWellness(connection.api_key, connection.athlete_id, 90).catch(() => []),
      fetchIntervalsAthlete(connection.api_key).catch(() => null),
    ]);
    if (curveResult instanceof Error) {
      curveError = curveResult.message;
    } else {
      curve = curveResult;
    }
    intervalsEftp = latestWellnessValue(wellness, "eftp");
    const athleteDefaults = athletePhysique(athlete);
    intervalsFtp = athleteDefaults.ftpWatts;
    intervalsWeightKg = latestWellnessValue(wellness, "weight") ?? athleteDefaults.weightKg;
  }

  const curvePoints = curve?.points ?? [];
  const ownPoints = downsample(curvePoints);
  const comparisonRiders = comparisonRidersFromRows(comparisonRows);
  const ownWeightKg = numberOrNull(profile?.weight_kg) ?? intervalsWeightKg;
  // eFTP uit intervals gaat voor; daarna de FTP uit intervals-instellingen of het profiel.
  const eftpWatts = numberOrNull(curve?.ftpWatts) ?? intervalsEftp;
  const ftpWatts = eftpWatts ?? intervalsFtp ?? numberOrNull(profile?.ftp_watts);
  const ftpSource = eftpWatts
    ? "eFTP uit intervals.icu"
    : intervalsFtp
      ? "FTP uit intervals.icu"
      : numberOrNull(profile?.ftp_watts)
        ? "FTP uit je profiel"
        : undefined;
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

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric
              icon={Zap}
              label="FTP / eFTP"
              value={formatValue(ftpWatts, " W")}
              hint={ftpSource}
            />
            <Metric icon={Gauge} label="5 minuten" value={formatValue(power5m, " W")} />
            <Metric icon={Activity} label="20 minuten" value={formatValue(power20m, " W")} />
            <Metric
              icon={Gauge}
              label="CP"
              value={formatValue(numberOrNull(sportSettings?.cp_watts), " W")}
              hint="Critical power uit intervals.icu"
            />
            <Metric
              icon={Zap}
              label="W'"
              value={
                sportSettings?.w_prime_joules
                  ? `${Math.round(Number(sportSettings.w_prime_joules) / 1000)} kJ`
                  : "-"
              }
              hint="Anaerobe capaciteit"
            />
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
