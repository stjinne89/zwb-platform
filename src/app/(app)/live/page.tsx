import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LiveMap } from "./_components/live-map";
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
  const indoorSessions = sessions.filter((s) => s.mode !== "outdoor");
  const externalSessions = sessions.filter((s) => s.external_track_url);
  const trackerStatus =
    ((trackerTokens?.[0] ?? null) as OwnTracksTokenStatus | null) ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-destructive" />
            Samen fietsen
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Zie welke ZWB&apos;ers nu rijden. Outdoor riders verschijnen via
            OwnTracks op de kaart, externe LiveTrack-links openen bij Garmin of
            Wahoo, en indoor riders delen waar je kunt joinen.
          </p>
        </div>
        {mySession && <StopLiveButton sessionId={mySession.id} />}
      </header>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-3">
          <LiveMap outdoorSessions={outdoorSessions} initialPositions={positionRows ?? []} />
          {outdoorSessions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Geen outdoor riders actief.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-md border bg-card">
            <div className="border-b p-4">
              <h2 className="font-semibold">Actieve riders ({sessions.length})</h2>
              <p className="text-xs text-muted-foreground">
                Sessies verdwijnen na {STALE_AFTER_MIN} minuten inactiviteit.
              </p>
            </div>
            {sessions.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Niemand is nu live.</p>
            ) : (
              <ul className="divide-y">
                {sessions.map((s) => (
                  <li key={s.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {s.profileName}
                          <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">
                            {MODE_LABELS[s.mode]}
                          </span>
                        </p>
                        {s.status_text && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {s.status_text}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          Sinds{" "}
                          {new Date(s.started_at).toLocaleTimeString("nl-NL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {s.external_track_url && (
                        <a
                          href={s.external_track_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-secondary"
                        >
                          LiveTrack
                          <ArrowUpRight className="size-3" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border bg-card p-4">
              <p className="text-2xl font-semibold">{indoorSessions.length}</p>
              <p className="text-sm text-muted-foreground">Indoor actief</p>
            </div>
            <div className="rounded-md border bg-card p-4">
              <p className="text-2xl font-semibold">{externalSessions.length}</p>
              <p className="text-sm text-muted-foreground">Met LiveTrack-link</p>
            </div>
          </section>

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
                    ? "Outdoor GPS komt binnen via OwnTracks of een externe LiveTrack-link."
                    : "Status zichtbaar voor alle ZWB-leden."}
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
        </div>
      </div>
    </div>
  );
}
