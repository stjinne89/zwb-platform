import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/app-ui";
import { ModuleName } from "@/components/club-texts-provider";
import { loadLadderLive } from "@/lib/club-ladder/live-load";
import { inDsWindow } from "@/lib/ds/schedule";
import { zwiftDsConfigured } from "@/lib/events/zwift-club";
import { LadderLiveBoard } from "./_components/ladder-live-board";

// Live stand van een ladderrace (club-ladder/live.ts). De pagina rendert de
// eerste stand; het bord vraagt daarna zelf elke 15 s om een nieuwe.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Live stand" };

export default async function LadderLivePage({ params }: PageProps) {
  const { id } = await params;
  const outcome = await loadLadderLive(id);
  if (outcome.status === "not-found") notFound();

  const event = outcome.status === "ok" ? outcome.view.event : "event" in outcome ? outcome.event : null;
  const ladderUrl = outcome.status === "ok" ? outcome.view.event.ladderUrl : null;
  const dsHref = event && zwiftDsConfigured() && inDsWindow(event.startAt) ? `/ds/${id}` : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <BackLink href={`/events/${id}`} label="Race" />
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{event?.title ?? "Live stand"}</h1>
          <div className="flex gap-4 text-sm">
            {dsHref && (
              <Link href={dsHref} className="underline">
                <ModuleName module="live_race" />
              </Link>
            )}
            {ladderUrl && (
              <a href={ladderUrl} target="_blank" rel="noopener noreferrer" className="underline">
                Ladder-site
              </a>
            )}
          </div>
        </div>
      </div>
      <LadderLiveBoard eventId={id} initial={outcome} />
    </div>
  );
}
