import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/app/omnium/_components/auto-refresh";
import { BackLink } from "@/components/app-ui";
import { ZwbMark } from "@/components/zwb-logo";
import { WTRL_ZRL_RESULTS_URL } from "@/lib/teams/wtrl-results";
import { loadZrlLive, type ZrlLiveView } from "@/lib/zrl-live/snapshot";
import type { RiderScore } from "@/lib/zrl-live/scoring";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { freezeZrlResultNow, saveZrlTeamAssignment } from "./_actions";

type PageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";
// "Uitslag vastzetten" haalt de race vers bij Zwift op: ongeveer acht seconden.
export const maxDuration = 30;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventId } = await params;
  const outcome = await loadZrlLive(eventId);
  return { title: outcome.status === "ok" ? `ZRL live — ${outcome.view.event.title}` : "ZRL live" };
}

function clock(ms: number) {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(ms);
}

function Header({ title }: { title: string }) {
  return (
    <header className="flex items-center gap-3">
      <ZwbMark className="h-10 w-10" />
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">ZWB Cycling · ZRL live</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
    </header>
  );
}

function Status({ view }: { view: ZrlLiveView }) {
  const { score } = view;
  if (score.final) {
    return (
      <p className="text-sm text-muted-foreground">
        Eindstand volgens Zwift · officieel:{" "}
        <a href={WTRL_ZRL_RESULTS_URL} target="_blank" rel="noopener noreferrer" className="underline">
          WTRL-uitslag
        </a>
      </p>
    );
  }
  const started = view.fetchedAt >= view.startAt;
  return (
    <p className="text-sm text-muted-foreground">
      {started ? "Voorlopig" : `Start ${clock(view.startAt).slice(0, 5)}`} · {view.subgroupLabel} ·{" "}
      {score.starters} gestart · bijgewerkt {clock(view.fetchedAt)}
    </p>
  );
}

function Points({ rider }: { rider: RiderScore }) {
  return (
    <span className="tabular-nums text-muted-foreground">
      {rider.fal} · {rider.fts} · {rider.fin + rider.podium}
    </span>
  );
}

export default async function ZrlLivePage({ params, searchParams }: PageProps) {
  const { eventId } = await params;
  const [outcome, access, query] = await Promise.all([
    loadZrlLive(eventId),
    createClient().then(getCurrentUserAccess),
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);
  const canAssign = access.has("teams.manage_results");
  const editing = canAssign && query.bewerk === "1";
  const frozenStatus = typeof query.vastzetten === "string" ? query.vastzetten : null;
  if (outcome.status === "not-found") notFound();

  if (outcome.status !== "ok") {
    const message =
      outcome.status === "no-zwift-event"
        ? "Dit event heeft geen Zwift-event."
        : outcome.status === "no-route"
          ? "De route van dit Zwift-event is onbekend."
          : "Zwift is nu niet bereikbaar.";
    return (
      <div className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-6">
        <AutoRefresh seconds={30} />
        {access.user && <BackLink href={`/events/${eventId}`} label="Event" />}
        <Header title="ZRL live" />
        <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  const { view } = outcome;
  const { score } = view;
  const label = (team: string | null) => (team ? view.teamLabels[team] ?? team : "—");
  const nameById = new Map(score.riders.map((r) => [r.athleteId, r.name]));
  const own = score.riders.filter((r) => view.ownRiders.includes(r.athleteId));
  const passes = score.passes.filter((pass) => pass.crossings.length > 0).reverse();

  return (
    <div className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-6">
      {!score.final && !editing && <AutoRefresh seconds={15} />}
      {access.user && <BackLink href={`/events/${view.event.id}`} label="Event" />}
      <div className="space-y-2">
        <Header title={view.event.title} />
        <Status view={view} />
        {canAssign && !editing && view.fetchedAt >= view.startAt && (
          <form action={freezeZrlResultNow} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="event_id" value={view.event.id} />
            <Button type="submit" variant="outline" size="sm">
              Uitslag vastzetten
            </Button>
            {frozenStatus && (
              <span className="text-sm text-muted-foreground">
                {frozenStatus === "bevroren" ? "Vastgezet." : `Niet vastgezet: ${frozenStatus}.`}
              </span>
            )}
          </form>
        )}
      </div>

      {editing && (
        <section className="rounded-lg border bg-card">
          <h2 className="flex items-center justify-between border-b px-4 py-3 text-sm font-semibold">
            Teams bijstellen
            <Link href={`/live/zrl/${view.event.id}`} className="text-xs font-normal underline">
              Klaar
            </Link>
          </h2>
          <datalist id="zrl-teams">
            {Object.values(view.teamLabels).map((team) => (
              <option key={team} value={team} />
            ))}
          </datalist>
          <ul className="divide-y">
            {view.entrants
              .filter((rider) => !view.ownRiders.includes(rider.athleteId))
              .sort((a, b) => Number(Boolean(a.team)) - Number(Boolean(b.team)) || a.name.localeCompare(b.name))
              .map((rider) => (
                <li key={rider.athleteId}>
                  <form action={saveZrlTeamAssignment} className="flex items-center gap-2 px-4 py-2 text-sm">
                    <input type="hidden" name="event_id" value={view.event.id} />
                    <input type="hidden" name="zwift_id" value={rider.athleteId} />
                    <span className="min-w-0 flex-1 truncate">{rider.name}</span>
                    <input
                      name="team"
                      list="zrl-teams"
                      defaultValue={rider.team ? label(rider.team) : ""}
                      aria-label={`Team van ${rider.name}`}
                      className="h-8 w-36 rounded-md border border-input bg-background px-2 text-sm"
                    />
                    <Button type="submit" variant="outline" size="sm">
                      Opslaan
                    </Button>
                  </form>
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border bg-card">
        <h2 className="border-b px-4 py-3 text-sm font-semibold">Teams</h2>
        {score.teams.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nog geen punten.</p>
        ) : (
          <ol className="divide-y">
            {score.teams.map((team) => (
              <li
                key={team.team}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-sm",
                  team.team === view.ownTeam && "bg-primary/10 font-semibold",
                )}
              >
                <span className="w-6 tabular-nums text-muted-foreground">{team.rank}</span>
                <span className="min-w-0 flex-1 truncate">{label(team.team)}</span>
                <span className="text-xs text-muted-foreground">{team.riders}</span>
                <span className="w-12 text-right tabular-nums">{team.total}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {own.length > 0 && (
        <section className="rounded-lg border bg-card">
          <h2 className="flex items-center justify-between border-b px-4 py-3 text-sm font-semibold">
            {view.event.teamName ?? "Ons team"}
            <span className="text-xs font-normal text-muted-foreground">FAL · FTS · FIN</span>
          </h2>
          <ul className="divide-y">
            {own.map((rider) => (
              <li key={rider.athleteId} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className={cn("min-w-0 flex-1 truncate", rider.void && "line-through")}>{rider.name}</span>
                <Points rider={rider} />
                <span className="w-12 text-right font-semibold tabular-nums">{rider.total}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {passes.length > 0 && (
        <section className="rounded-lg border bg-card">
          <h2 className="border-b px-4 py-3 text-sm font-semibold">Segmenten</h2>
          <ul className="divide-y">
            {passes.map((pass) => (
              <li key={pass.index} className="px-4 py-2 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">
                    {pass.name}
                    {score.passes.filter((p) => p.segmentId === pass.segmentId).length > 1 && ` ${pass.lap}`}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {pass.crossings.length}/{score.starters}
                  </span>
                </div>
                <ol className="mt-1 space-y-0.5 text-muted-foreground">
                  {pass.crossings.slice(0, 3).map((crossing) => (
                    <li key={crossing.athleteId} className="flex gap-2">
                      <span className="w-8 tabular-nums">{crossing.fal}</span>
                      <span
                        className={cn(
                          "truncate",
                          view.ownRiders.includes(crossing.athleteId) && "font-medium text-foreground",
                        )}
                      >
                        {nameById.get(crossing.athleteId) ?? crossing.athleteId}
                      </span>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="rounded-lg border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Alle renners</summary>
        {canAssign && !editing && (
          <p className="border-t px-4 py-2 text-sm">
            <Link href={`/live/zrl/${view.event.id}?bewerk=1`} className="underline">
              Teams bijstellen
            </Link>
          </p>
        )}
        <ol className="divide-y border-t">
          {score.riders.map((rider, i) => (
            <li key={rider.athleteId} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="w-6 tabular-nums text-muted-foreground">{i + 1}</span>
              <span className={cn("min-w-0 flex-1 truncate", rider.void && "line-through")}>
                {rider.name}
                <span className="ml-2 text-xs text-muted-foreground">{label(rider.team)}</span>
              </span>
              <Points rider={rider} />
              <span className="w-12 text-right tabular-nums">{rider.total}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
