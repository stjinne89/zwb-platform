// De lopende protocollen op de Vandaag-pagina: waar elk staat (fase, dag of
// dagen tot de wedstrijd) en de taken van vandaag. Ook een protocol zonder taak
// vandaag of dat nog moet beginnen staat erin, zodat je ziet wat er loopt.
// Zelfde opzet als CoreTodayCard: eigen queries, niets uit de fietspijplijn.

import Link from "next/link";
import { ChevronRight, ListChecks } from "lucide-react";
import { isRunOver, protocolBySlug, runProgress } from "@/lib/protocols";
import type { Viewer } from "../../_data";
import { loadActiveRuns, loadChecks, loadCoreSessions, loadProtocolProfile } from "../../_protocol-data";
import { ProtocolDayTasks, formatDay } from "./protocol-views";

export async function ProtocolTodayCard({ viewer, today }: { viewer: Viewer; today: string }) {
  const runs = await loadActiveRuns(viewer.supabase, viewer.user.id);
  const items = runs.flatMap((run) => {
    const protocol = protocolBySlug(run.protocolSlug);
    return protocol && !isRunOver(protocol, run, today) ? [{ run, protocol }] : [];
  });
  if (items.length === 0) return null;

  const runIds = items.map(({ run }) => run.id);
  const [checks, coreSessions, profile] = await Promise.all([
    loadChecks(viewer.supabase, runIds),
    loadCoreSessions(viewer.supabase, runIds),
    loadProtocolProfile(viewer.supabase, viewer.user.id, today),
  ]);

  return (
    <section className="space-y-2 rounded-lg border bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <ListChecks className="size-5 text-primary" />
        Lopende protocollen
      </h2>
      {items.map(({ run, protocol }) => {
        const progress = runProgress(protocol, run, today);
        return (
          <div key={run.id} className="border-t pt-2 first-of-type:border-t-0">
            <Link
              href={
                protocol.pillar === "trainen"
                  ? `/zwbeter-worden/protocollen/${protocol.slug}`
                  : `/zwbeter-worden/voeding/protocollen/${protocol.slug}`
              }
              className="flex min-h-[44px] items-center justify-between gap-3 hover:text-primary"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{protocol.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {progress
                    ? [progress.phase, progress.label].filter(Boolean).join(" · ")
                    : `Begint op ${formatDay(run.startDate)}`}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
            {progress ? (
              <ProtocolDayTasks
                protocol={protocol}
                run={run}
                day={today}
                weightKg={profile.weightKg}
                checks={checks}
                coreSessions={coreSessions}
              />
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
