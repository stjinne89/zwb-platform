// De twee protocolpagina's (lijst en detail), gedeeld door trainen en voeden.

import { notFound } from "next/navigation";
import { protocolBySlug, startBlocker, type ProtocolPillar } from "@/lib/protocols";
import { requireViewer, todayKeyAmsterdam } from "../../_data";
import {
  loadActiveRuns,
  loadChecks,
  loadProtocolProfile,
  loadRaceOptions,
  loadRunsForProtocol,
} from "../../_protocol-data";
import { ProtocolDetail, ProtocolList } from "./protocol-views";

export async function ProtocolListPage({ pillar, basePath }: { pillar: ProtocolPillar; basePath: string }) {
  const viewer = await requireViewer();
  const runs = await loadActiveRuns(viewer.supabase, viewer.user.id);
  return (
    <ProtocolList
      pillar={pillar}
      basePath={basePath}
      activeSlugs={new Set(runs.map((run) => run.protocolSlug))}
    />
  );
}

export async function ProtocolDetailPage({
  pillar,
  basePath,
  slug,
}: {
  pillar: ProtocolPillar;
  basePath: string;
  slug: string;
}) {
  const protocol = protocolBySlug(slug);
  if (!protocol || protocol.pillar !== pillar) notFound();

  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();
  const [runs, profile, races] = await Promise.all([
    loadRunsForProtocol(viewer.supabase, viewer.user.id, slug),
    loadProtocolProfile(viewer.supabase, viewer.user.id, today),
    protocol.anchor === "wedstrijd" ? loadRaceOptions(viewer, today) : Promise.resolve([]),
  ]);
  const run = runs.find((item) => item.status === "actief") ?? null;
  const checks = await loadChecks(viewer.supabase, run ? [run.id] : []);

  return (
    <ProtocolDetail
      protocol={protocol}
      basePath={basePath}
      run={run}
      checks={checks}
      weightKg={profile.weightKg}
      blocker={startBlocker(protocol, profile.ageYears)}
      today={today}
      races={races}
    />
  );
}
