// De twee protocolpagina's (lijst en detail), gedeeld door trainen en voeden.

import { notFound } from "next/navigation";
import { after } from "next/server";
import { protocolBySlug, startBlocker, type ProtocolPillar } from "@/lib/protocols";
import { protocolUsesCore } from "@/lib/protocols/core-temperature";
import { loadDurabilityTests } from "@/lib/training/durability-test";
import { loadConnection, requireViewer, todayKeyAmsterdam } from "../../_data";
import {
  loadActiveRuns,
  loadChecks,
  loadCoreSessions,
  loadEventRaceOption,
  loadProtocolProfile,
  loadRaceOptions,
  loadRunsForProtocol,
} from "../../_protocol-data";
import { ProtocolDetail, ProtocolList } from "./protocol-views";
import { GUT_PROTOCOLS, gutHighAllowed } from "@/lib/nutrition/gut-training";
import { loadGutSource } from "../../voeding/_data";
import { setRideCarbs120 } from "../../voeding/_actions";
import { LogActionButton } from "../../voeding/_components/log-controls";

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
  eventId = null,
}: {
  pillar: ProtocolPillar;
  basePath: string;
  slug: string;
  /** Vanaf een eventpagina: dat event staat bovenaan als wedstrijd. */
  eventId?: string | null;
}) {
  const protocol = protocolBySlug(slug);
  if (!protocol || protocol.pillar !== pillar) notFound();

  const viewer = await requireViewer();
  const today = todayKeyAmsterdam();
  const [runs, profile, seasonRaces, fromEvent] = await Promise.all([
    loadRunsForProtocol(viewer.supabase, viewer.user.id, slug),
    loadProtocolProfile(viewer.supabase, viewer.user.id, today),
    protocol.anchor === "wedstrijd" ? loadRaceOptions(viewer, today) : Promise.resolve([]),
    protocol.anchor === "wedstrijd" && eventId ? loadEventRaceOption(viewer, eventId, today) : Promise.resolve(null),
  ]);
  const races = fromEvent
    ? [fromEvent, ...seasonRaces.filter((race) => race.date !== fromEvent.date)]
    : seasonRaces;
  const run = runs.find((item) => item.status === "actief") ?? null;
  // Na een afgeronde darmtraining: zelf kiezen voor 120 g per uur onderweg (stap 4).
  const gut = (GUT_PROTOCOLS as readonly string[]).includes(slug) ? await loadGutSource(viewer) : null;
  const rideCarbs = gut && gutHighAllowed(gut.runs, today) ? { on: gut.high } : null;
  const usesCore = protocolUsesCore(protocol);
  const [checks, coreSessions, connection, durabilityTests] = await Promise.all([
    loadChecks(viewer.supabase, run ? [run.id] : []),
    usesCore ? loadCoreSessions(viewer.supabase, run ? [run.id] : []) : Promise.resolve([]),
    usesCore && run ? loadConnection(viewer) : Promise.resolve(null),
    protocol.measure === "duurtest" ? loadDurabilityTests(viewer.supabase, viewer.user.id) : Promise.resolve([]),
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
    <div className="space-y-6">
      {rideCarbs ? (
        <section className="flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold">Onderweg</h2>
            <p className="text-sm text-muted-foreground">
              {rideCarbs.on ? "Tot 120 g per uur bij ritten vanaf 2,5 uur" : "Tot 90 g per uur"}
            </p>
          </div>
          <LogActionButton action={setRideCarbs120} fields={{ on: rideCarbs.on ? "nee" : "ja" }} size="sm">
            {rideCarbs.on ? "Terug naar 90 g" : "Tot 120 g per uur"}
          </LogActionButton>
        </section>
      ) : null}
      <ProtocolDetail
        protocol={protocol}
        basePath={basePath}
        run={run}
        checks={checks}
        coreSessions={coreSessions}
        durabilityTests={durabilityTests}
        weightKg={profile.weightKg}
        blocker={startBlocker(protocol, profile.ageYears)}
        today={today}
        races={races}
      />
    </div>
  );
}
