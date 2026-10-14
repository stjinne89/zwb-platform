// De taken van vandaag uit de lopende protocollen, op de Vandaag-pagina. Zelfde
// opzet als CoreTodayCard: eigen queries, niets uit de fietspijplijn.

import Link from "next/link";
import { ChevronRight, ListChecks } from "lucide-react";
import { protocolBySlug, tasksForDay } from "@/lib/protocols";
import type { Viewer } from "../../_data";
import { loadActiveRuns, loadChecks, loadProtocolProfile } from "../../_protocol-data";
import { ProtocolDayTasks } from "./protocol-views";

export async function ProtocolTodayCard({ viewer, today }: { viewer: Viewer; today: string }) {
  const runs = await loadActiveRuns(viewer.supabase, viewer.user.id);
  if (runs.length === 0) return null;
  const [checks, profile] = await Promise.all([
    loadChecks(viewer.supabase, runs.map((run) => run.id)),
    loadProtocolProfile(viewer.supabase, viewer.user.id, today),
  ]);

  const items = runs.flatMap((run) => {
    const protocol = protocolBySlug(run.protocolSlug);
    if (!protocol || today < run.startDate) return [];
    const day = tasksForDay(protocol, run, today, profile.weightKg, checks);
    return day && day.tasks.length > 0 ? [{ run, protocol }] : [];
  });
  if (items.length === 0) return null;

  return (
    <section className="space-y-2 rounded-lg border bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <ListChecks className="size-5 text-primary" />
        Protocollen
      </h2>
      {items.map(({ run, protocol }) => (
        <div key={run.id} className="border-t pt-2 first-of-type:border-t-0">
          <Link
            href={
              protocol.pillar === "trainen"
                ? `/zwbeter-worden/protocollen/${protocol.slug}`
                : `/zwbeter-worden/voeding/protocollen/${protocol.slug}`
            }
            className="flex min-h-[44px] items-center justify-between gap-3 text-sm font-medium hover:text-primary"
          >
            {protocol.title}
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
          <ProtocolDayTasks
            protocol={protocol}
            run={run}
            day={today}
            weightKg={profile.weightKg}
            checks={checks}
          />
        </div>
      ))}
    </section>
  );
}
