import { StravaAttribution } from "@/components/strava-brand";
import { EmptyState } from "@/components/app-ui";
import {
  rideLoadRows,
  weeklyLoad,
  STRAVA_RIDE_COLUMNS,
  type StravaRideRow,
} from "@/lib/training/ride-metrics";
import { toTrainingLoadPoints } from "@/lib/training/load-points";
import { ActivityLoadPanel } from "../_components/activity-load-panel";
import { DataFreshness } from "../_components/data-freshness";
import { TrainingLoadMetrics } from "../_components/training-load-chart";
import {
  lastWellnessDayOf,
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
  const loadPoints = toTrainingLoadPoints(snapshot.wellness);
  const zwbStatus = zwbStatusFor(snapshot.wellness, conn, profile);
  const lastWellnessDay = lastWellnessDayOf(snapshot.wellness);

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
            action: { href: "/dashboard#strava-sync", label: "Naar Strava-sync" },
          },
          ...(conn
            ? [
                {
                  label: "Hersteldata (intervals.icu)",
                  at: lastWellnessDay,
                  dateOnly: true,
                  action: { href: "/zwbeter-worden#herstel", label: "Naar herstel-instelling" },
                },
              ]
            : []),
        ]}
      />

      <TrainingLoadMetrics
        points={loadPoints}
        ctl={zwbStatus.ctl}
        tsb={zwbStatus.tsb}
        today={todayKeyAmsterdam()}
        panelClassName="rounded-lg border bg-card p-4"
        idSuffix="belasting"
      />

      <section className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Belasting</h2>
          <p className="text-sm text-muted-foreground">TSS per week, en je laatste ritten</p>
        </div>
        {activityLoad.length === 0 ? (
          <EmptyState>Nog geen belasting bekend.</EmptyState>
        ) : (
          <ActivityLoadPanel
            weeks={weeklyLoad(activityLoad, 12, loadPoints)}
            recent={activityLoad.slice(0, 14)}
          />
        )}
      </section>

      <StravaAttribution />
    </div>
  );
}
