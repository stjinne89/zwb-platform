import { Activity } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import {
  rideLoadRows,
  weeklyLoad,
  STRAVA_RIDE_COLUMNS,
  type StravaRideRow,
} from "@/lib/training/ride-metrics";
import { toTrainingLoadPoints } from "@/lib/training/load-points";
import { zwbeterWordenAdvice } from "@/lib/training/zwbeterworden";
import { ActivityLoadPanel } from "../_components/activity-load-panel";
import { DataFreshness } from "../_components/data-freshness";
import { TrainingLoadMetrics } from "../_components/training-load-chart";
import { WellnessOptInToggle } from "../_components/wellness-optin-toggle";
import { RecoveryStat, recoveryStateLabel } from "../_components/ui";
import {
  loadConnection,
  loadIntervalsSnapshot,
  loadProfile,
  requireViewer,
  todayKeyAmsterdam,
  zwbStatusFor,
} from "../_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export default async function ZwbeterWordenLoadPage() {
  const viewer = await requireViewer();
  const [profile, conn] = await Promise.all([loadProfile(viewer), loadConnection(viewer)]);

  // Genoeg voor de weekgrafiek van 12 weken, met marge.
  const since = new Date();
  since.setDate(since.getDate() - 120);

  const [snapshot, { data: rideRows }, { data: lastStravaSync }] = await Promise.all([
    loadIntervalsSnapshot(viewer, conn, { wellnessDays: 730 }),
    viewer.supabase
      .from("strava_activities")
      .select(STRAVA_RIDE_COLUMNS)
      .eq("profile_id", viewer.user.id)
      .gte("start_date", since.toISOString())
      .order("start_date", { ascending: false })
      .limit(400),
    viewer.supabase
      .from("strava_activities")
      .select("synced_at")
      .eq("profile_id", viewer.user.id)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Belasting uit Strava, met TSS en IF uit NP en de FTP van het lid —
  // intervals.icu geeft voor Strava-ritten niets terug.
  const activityLoad = rideLoadRows(
    (rideRows ?? []) as StravaRideRow[],
    profile?.ftp_watts == null ? null : Number(profile.ftp_watts),
  );
  const zwbStatus = zwbStatusFor(snapshot.wellness, conn, profile);
  const recoverySummary = zwbStatus.recoverySummary;
  const advice = zwbeterWordenAdvice(zwbStatus.readiness, profile?.zrl_division);

  // Laatste dag waarop intervals.icu daadwerkelijk een herstelwaarde had. De
  // panelen tonen 7-daagse gemiddelden, dus zonder deze regel lijkt een bron
  // die al dagen stilstaat op een kapotte koppeling.
  const lastWellnessDay =
    snapshot.wellness
      .filter(
        (day) =>
          day.restingHR != null ||
          day.hrv != null ||
          day.hrvSDNN != null ||
          day.sleepSecs != null ||
          day.readiness != null,
      )
      .map((day) => day.id)
      .sort()
      .at(-1) ?? null;

  return (
    <div className="space-y-4">
      {snapshot.fetchError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {snapshot.fetchError}
        </p>
      )}

      <DataFreshness
        sources={[
          {
            label: "Strava-ritten",
            at: lastStravaSync?.synced_at ?? null,
            action: { href: "/achievements", label: "Nu synchroniseren" },
          },
          ...(conn
            ? [
                {
                  label: "Hersteldata (intervals.icu)",
                  at: lastWellnessDay,
                  action: { href: "#herstel", label: "Naar herstel-instelling" },
                },
              ]
            : []),
        ]}
      />

      <TrainingLoadMetrics
        points={toTrainingLoadPoints(snapshot.wellness)}
        ctl={zwbStatus.ctl}
        tsb={zwbStatus.tsb}
        today={todayKeyAmsterdam()}
        panelClassName="rounded-lg border bg-card p-4"
        idSuffix="belasting"
      />

      <section className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Belasting per rit</h2>
          <p className="text-sm text-muted-foreground">TSS, intensiteit en arbeid per rit</p>
        </div>
        {activityLoad.length === 0 ? (
          <EmptyState>Nog geen belasting per rit bekend.</EmptyState>
        ) : (
          <ActivityLoadPanel weeks={weeklyLoad(activityLoad)} recent={activityLoad.slice(0, 14)} />
        )}
      </section>

      {conn && (
        <section id="herstel" className="scroll-mt-4 rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <Activity className="size-5 text-primary" />
              Herstel &amp; belastbaarheid
            </h2>
            <WellnessOptInToggle initialOptIn={Boolean(conn.wellness_opt_in)} />
          </div>

          {conn.wellness_opt_in &&
            (recoverySummary ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <RecoveryStat label="Status" value={recoveryStateLabel(recoverySummary.state)} />
                  <RecoveryStat
                    label="Readiness"
                    value={recoverySummary.readiness != null ? `${recoverySummary.readiness}` : "-"}
                    hint={
                      recoverySummary.readinessSource === "afgeleid"
                        ? "berekend door ZWB"
                        : undefined
                    }
                  />
                  <RecoveryStat
                    label="HRV (7d gem.)"
                    value={recoverySummary.hrv != null ? `${recoverySummary.hrv}` : "—"}
                  />
                  <RecoveryStat
                    label="Rust-HR (7d gem.)"
                    value={recoverySummary.restingHr != null ? `${recoverySummary.restingHr}` : "—"}
                  />
                  <RecoveryStat
                    label="Slaap (7d gem.)"
                    value={
                      recoverySummary.sleepHours != null ? `${recoverySummary.sleepHours}u` : "—"
                    }
                  />
                </div>
                {/* Zonder verse waarden zegt de notitie "binnen de normale
                    range" terwijl er niets gemeten is; dan liever de laatste
                    dag waarop er wél iets binnenkwam. */}
                {recoverySummary.hrv != null ||
                recoverySummary.restingHr != null ||
                recoverySummary.sleepHours != null ? (
                  <p className="text-xs text-muted-foreground">{recoverySummary.note}</p>
                ) : (
                  <p className="text-xs text-destructive">
                    {lastWellnessDay
                      ? `Geen herstelwaarden in de laatste 7 dagen; laatste meting ${new Date(
                          `${lastWellnessDay}T12:00:00`,
                        ).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}.`
                      : "Nog geen herstelwaarden ontvangen uit intervals.icu."}
                  </p>
                )}
                <div className={`rounded-md p-3 ${advice.block}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">ZWBeterWorden</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${advice.pill}`}>
                      {advice.level > 0 ? `Niveau ${advice.level}/5` : "—"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{advice.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{advice.description}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Nog geen herstel-data gevonden in intervals.icu.
              </p>
            ))}
        </section>
      )}
    </div>
  );
}
