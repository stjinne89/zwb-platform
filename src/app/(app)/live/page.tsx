import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HelpLink, PageHeader } from "@/components/app-ui";
import { LiveBoard } from "./_components/live-board";
import {
  OwnTracksPanel,
  type OwnTracksTokenStatus,
} from "./_components/owntracks-panel";
import { StartLiveForm } from "./_components/start-form";
import { StopLiveButton } from "./_components/stop-button";
import type { ActiveSession } from "./types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MODE_LABELS: Record<ActiveSession["mode"], string> = {
  outdoor: "Outdoor",
  zwift: "Zwift",
  mywhoosh: "MyWhoosh",
  wahoo_indoor: "Wahoo",
  other_indoor: "Indoor",
};

const STALE_AFTER_MIN = 15;

async function getActiveCutoffIso() {
  return new Date(Date.now() - STALE_AFTER_MIN * 60 * 1000).toISOString();
}

export default async function LivePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Actieve sessies = ended_at IS NULL AND last_seen_at > now() - 15min
  const cutoff = await getActiveCutoffIso();

  const [
    { data: sessionRows },
    { data: positionRows },
    { data: trackerTokens },
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live"
        title="Samen fietsen"
        actions={mySession ? <StopLiveButton sessionId={mySession.id} /> : <HelpLink href="/hulp#owntracks" />}
      />

      <LiveBoard
        sessions={sessions}
        outdoorSessions={outdoorSessions}
        initialPositions={positionRows ?? []}
      >
        {!mySession && (
          <div className="space-y-4">
            <OwnTracksPanel tokenStatus={trackerStatus} />
            <StartLiveForm />
          </div>
        )}

        {mySession && (
          <div className="space-y-4">
            <OwnTracksPanel tokenStatus={trackerStatus} />
            <section className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-medium">Je bent live als {MODE_LABELS[mySession.mode]}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {mySession.mode === "outdoor"
                  ? "GPS via OwnTracks of LiveTrack-link."
                  : "Zichtbaar voor ZWB-leden."}
              </p>
              <a
                href="#stop-live"
                className="mt-2 inline-flex text-xs font-medium text-destructive hover:underline"
              >
                Stop bovenaan
              </a>
            </section>
          </div>
        )}
      </LiveBoard>
    </div>
  );
}
