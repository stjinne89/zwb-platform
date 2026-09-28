import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { refreshExternalLiveSessions } from "@/lib/live/external-refresh";
import { inboundDomain } from "@/lib/live/inbound-mail";
import { HelpLink, PageHeader } from "@/components/app-ui";
import { LiveBoard } from "./_components/live-board";
import {
  OwnTracksPanel,
  type OwnTracksTokenStatus,
} from "./_components/owntracks-panel";
import { LiveTrackPanel } from "./_components/livetrack-panel";
import { StopLiveButton } from "./_components/stop-button";
import type { ActiveSession, RiderStats } from "./types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SOURCE_LABELS: Partial<Record<ActiveSession["source"], string>> = {
  owntracks: "OwnTracks",
  garmin: "Garmin",
  wahoo: "Wahoo",
};

const STALE_AFTER_MIN = 15;

async function getActiveCutoffIso() {
  return new Date(Date.now() - STALE_AFTER_MIN * 60 * 1000).toISOString();
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/**
 * Laatste meting en eerste punt per outdoor-sessie. Zonder migratie 0193 zijn
 * er geen sensorkolommen; dan alleen snelheid.
 */
async function loadRiderStats(supabase: ServerClient, sessionIds: string[]) {
  const stats: Record<string, RiderStats> = {};
  await Promise.all(
    sessionIds.map(async (sessionId) => {
      const latest = async (columns: string) =>
        supabase
          .from("live_positions")
          .select(columns)
          .eq("session_id", sessionId)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle();
      const full = await latest(
        "recorded_at, speed_kmh, power_w, cadence_rpm, heart_rate, distance_m",
      );
      const last = full.error ? (await latest("recorded_at, speed_kmh")).data : full.data;
      const { data: first } = await supabase
        .from("live_positions")
        .select("recorded_at")
        .eq("session_id", sessionId)
        .order("recorded_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!last || !first) return;
      const row = last as unknown as Record<string, unknown>;
      stats[sessionId] = {
        recordedAt: row.recorded_at as string,
        rideStartAt: first.recorded_at as string,
        speedKmh: num(row.speed_kmh),
        powerW: num(row.power_w),
        cadenceRpm: num(row.cadence_rpm),
        heartRate: num(row.heart_rate),
        distanceM: num(row.distance_m),
      };
    }),
  );
  return stats;
}

export default async function LivePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Garmin/Wahoo eerst bijwerken, zodat nieuwe posities en beëindigde ritten
  // in deze render meekomen.
  await refreshExternalLiveSessions();

  // Actieve sessies = ended_at IS NULL AND last_seen_at > now() - 15min
  const cutoff = await getActiveCutoffIso();

  const [
    { data: sessionRows },
    { data: positionRows },
    { data: trackerTokens },
    { data: mailTokens },
    { data: wahooTokens },
    { data: ownProfile },
  ] = await Promise.all([
    supabase
      .from("live_sessions")
      .select(
        "id, profile_id, mode, source, status_text, external_track_url, started_at, last_seen_at, profiles(display_name)",
      )
      .is("ended_at", null)
      .gte("last_seen_at", cutoff)
      .order("started_at", { ascending: false }),
    supabase
      .from("live_positions")
      .select("session_id, profile_id, lat, lng, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(500),
    supabase
      .from("live_tracker_tokens")
      .select("id, enabled, last_seen_at, revoked_at, created_at")
      .eq("profile_id", user.id)
      .eq("provider", "owntracks")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("live_tracker_tokens")
      .select("id, enabled, last_seen_at, revoked_at, created_at")
      .eq("profile_id", user.id)
      .eq("provider", "mail")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("live_tracker_tokens")
      .select("id, enabled, last_seen_at, revoked_at, created_at")
      .eq("profile_id", user.id)
      .eq("provider", "wahoo_link")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("profiles")
      .select("live_heart_rate_consent_at")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const sessions: ActiveSession[] = (sessionRows ?? []).map((s) => ({
    id: s.id,
    profileId: s.profile_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profileName: ((s.profiles as any)?.display_name as string) ?? "ZWB'er",
    mode: s.mode as ActiveSession["mode"],
    source: (s.source ?? "manual") as ActiveSession["source"],
    status_text: s.status_text,
    external_track_url: s.external_track_url,
    started_at: s.started_at,
    last_seen_at: s.last_seen_at,
  }));

  const mySession = sessions.find((s) => s.profileId === user.id) ?? null;
  const outdoorSessions = sessions.filter((s) => s.mode === "outdoor");
  const trackerStatus =
    ((trackerTokens?.[0] ?? null) as OwnTracksTokenStatus | null) ?? null;
  const mailStatus = (mailTokens?.[0] ?? null) as OwnTracksTokenStatus | null;
  const wahooStatus = (wahooTokens?.[0] ?? null) as OwnTracksTokenStatus | null;
  const mailPanel = (
    <LiveTrackPanel
      mailStatus={mailStatus}
      wahooStatus={wahooStatus}
      mailEnabled={Boolean(inboundDomain())}
      sharingHeartRate={Boolean(ownProfile?.live_heart_rate_consent_at)}
    />
  );
  const riderStats = await loadRiderStats(
    supabase,
    outdoorSessions.map((s) => s.id),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live"
        title="Samen fietsen"
        actions={mySession ? <StopLiveButton sessionId={mySession.id} /> : <HelpLink href="/hulp#livetrack" />}
      />

      <LiveBoard
        sessions={sessions}
        outdoorSessions={outdoorSessions}
        initialPositions={positionRows ?? []}
        riderStats={riderStats}
      >
        <div className="space-y-4">
          {mySession && (
            <section className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-medium">
                Je bent live via {SOURCE_LABELS[mySession.source] ?? "Samen fietsen"}
              </p>
              <a
                href="#stop-live"
                className="mt-2 inline-flex text-xs font-medium text-destructive hover:underline"
              >
                Stop bovenaan
              </a>
            </section>
          )}
          {mailPanel}
          <OwnTracksPanel tokenStatus={trackerStatus} />
        </div>
      </LiveBoard>
    </div>
  );
}
