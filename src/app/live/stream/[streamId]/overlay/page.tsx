import { notFound } from "next/navigation";
import { StreamOverlay, wantedTeams, zrlStatus } from "@/components/livestream/stream-overlay";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadZrlLive } from "@/lib/zrl-live/snapshot";

// De OBS-overlay van één stream (0341). Openbaar, want OBS logt niet in; de
// link bevat alleen de id van de stream. event_streams is niet voor iedereen
// leesbaar, dus via de service-rol, en alleen titel, soort en schakelaar.
// Logo en sponsors staan er altijd; de stand alleen bij een ZRL-race met de
// schakelaar aan. Elke 15 seconden ververst, dus de schakelaar werkt mee.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function generateMetadata() {
  return { title: "Live — overlay", robots: { index: false, follow: false } };
}

type PageProps = {
  params: Promise<{ streamId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type StreamRow = {
  overlay_stand?: boolean | null;
  events: { id: string; title: string; type: string; start_at: string; team_id: string | null; zwift_event_id: string | null } | null;
};

export default async function StreamOverlayPage({ params, searchParams }: PageProps) {
  const { streamId } = await params;
  const query = (await searchParams) ?? {};
  // "*" zodat de pagina ook werkt zolang 0341 nog niet is toegepast.
  const { data } = await createAdminClient()
    .from("event_streams")
    .select("*, events(id, title, type, start_at, team_id, zwift_event_id)")
    .eq("id", streamId)
    .maybeSingle();
  const stream = data as StreamRow | null;
  const event = stream?.events;
  if (!stream || !event) notFound();

  const hasStand = event.type === "zrl" && Boolean(event.team_id && event.zwift_event_id);
  const started = new Date() >= new Date(event.start_at);
  const plain = (
    <StreamOverlay title={event.title} status={started ? "Live" : "Starts soon"} stand={null} refreshSeconds={15} />
  );
  if (!hasStand) return plain;

  const outcome = await loadZrlLive(event.id);
  if (outcome.status !== "ok") return plain;
  const { view } = outcome;
  return (
    <StreamOverlay
      title={event.title}
      status={zrlStatus(view)}
      stand={stream.overlay_stand !== false ? { view, teams: wantedTeams(query.teams) } : null}
      refreshSeconds={15}
    />
  );
}
