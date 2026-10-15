// De twee protocolpagina's (lijst en detail), gedeeld door trainen en voeden.

import { notFound } from "next/navigation";
import { after } from "next/server";
import { protocolBySlug, startBlocker, type ProtocolPillar } from "@/lib/protocols";
import { protocolUsesCore } from "@/lib/protocols/core-temperature";
import { loadConnection, requireViewer, todayKeyAmsterdam } from "../../_data";
import {
  loadActiveRuns,
  loadChecks,
  loadCoreSessions,
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
  const usesCore = protocolUsesCore(protocol);
  const [checks, coreSessions, connection] = await Promise.all([
    loadChecks(viewer.supabase, run ? [run.id] : []),
    usesCore ? loadCoreSessions(viewer.supabase, run ? [run.id] : []) : Promise.resolve([]),
    usesCore && run ? loadConnection(viewer) : Promise.resolve(null),
  ]);

  // Net gereden: de kerntemperatuur na het antwoord ophalen, net als op Vandaag.
  if (run && connection?.api_key && connection.athlete_id) {
    const { admin, user } = viewer;
    after(async () => {
      const { fillCoreSessions } = await import("@/lib/protocols/core-fill");
      await fillCoreSessions(admin, user.id, connection, today).catch(() => null);
    });
  }

  return (
    <ProtocolDetail
      protocol={protocol}
      basePath={basePath}
      run={run}
      checks={checks}
      coreSessions={coreSessions}
      weightKg={profile.weightKg}
      blocker={startBlocker(protocol, profile.ageYears)}
      today={today}
      races={races}
    />
  );
}
