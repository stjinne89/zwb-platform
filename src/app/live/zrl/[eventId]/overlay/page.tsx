import { notFound } from "next/navigation";
import { StreamOverlay, wantedTeams, zrlStatus } from "@/components/livestream/stream-overlay";
import { loadZrlLive } from "@/lib/zrl-live/snapshot";

// De eerste overlay-link (fase 2), per race in plaats van per stream. Blijft
// werken voor wie hem al in OBS heeft staan, in de opmaak van de stream-overlay
// (0341), met de stand altijd aan. Nieuwe links: /live/stream/<id>/overlay.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function generateMetadata() {
  return { title: "ZRL live — overlay", robots: { index: false, follow: false } };
}

type PageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ZrlOverlayPage({ params, searchParams }: PageProps) {
  const { eventId } = await params;
  const query = (await searchParams) ?? {};
  const outcome = await loadZrlLive(eventId);
  if (outcome.status === "not-found") notFound();

  if (outcome.status !== "ok") {
    return <StreamOverlay title="" status="Live · ZRL" stand={null} refreshSeconds={30} />;
  }
  const { view } = outcome;
  return (
    <StreamOverlay
      title={view.event.title}
      status={zrlStatus(view)}
      stand={{ view, teams: wantedTeams(query.teams) }}
      refreshSeconds={view.score.final ? null : 15}
    />
  );
}
