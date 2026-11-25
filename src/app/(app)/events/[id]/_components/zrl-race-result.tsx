import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { loadZrlExpectedResult, type ZrlExpectedResult } from "@/lib/race-briefing/load";
import { ZrlTeamRank } from "./zrl-team-rank";
import { ZrlFieldTable, ZrlTeamsTable } from "./zrl-expected-tables";

// Op de plek van de uitslag van een ZRL-teamrace: vóór de race de verwachte
// uitslag (tot 2026-11-25 "Het veld" op de briefing), daarna de plaats van het team.

const HEADING = "text-sm font-semibold uppercase tracking-wide text-muted-foreground";

const FIELD_MISSING: Record<Exclude<NonNullable<ZrlExpectedResult["fieldMissing"]>, "started">, string> = {
  "no-zwift-event": "Aan deze race hangt nog geen Zwift-event.",
  "no-entrants": "Er staat nog niemand in de groep bij Zwift.",
  error: "Zwift gaf de groep nu niet. Probeer het later opnieuw.",
};

/** De verwachte plek van ons team, als er een verwachting is. */
function ownExpectedRank(view: ZrlExpectedResult): { rank: number; teams: number } | null {
  const teams = view.projection?.teams ?? [];
  if (view.format !== "ttt" && !view.projection?.basis) return null;
  const index = teams.findIndex((t) => t.own);
  return index < 0 ? null : { rank: index + 1, teams: teams.length };
}

/** Laadt het veld bij Zwift; staat in een Suspense-grens, zodat de racepagina niet wacht. */
export async function ZrlExpectedResultView({ eventId }: { eventId: string }) {
  const view = await loadZrlExpectedResult(eventId).catch(() => null);
  // Een kwartier na de start laadt het veld niet meer; dan is er de live stand.
  if (!view || view.fieldMissing === "started") return null;
  const own = ownExpectedRank(view);
  return (
    <section id="uitslag" className="scroll-mt-20 space-y-3">
      <h2 className={HEADING}>
        Verwachte uitslag
        {own && (
          <span className="ml-2 tabular-nums text-primary" aria-label={`${own.rank}e van ${own.teams} teams`}>
            {own.rank}e
          </span>
        )}
      </h2>
      {view.fieldMissing ? (
        <EmptyState>{FIELD_MISSING[view.fieldMissing]}</EmptyState>
      ) : (
        <div className="space-y-4">
          <ZrlTeamsTable view={view} />
          <ZrlFieldTable view={view} />
        </div>
      )}
    </section>
  );
}

export function ZrlExpectedResultFallback() {
  return (
    <section className="space-y-3" aria-busy="true">
      <h2 className={HEADING}>Verwachte uitslag</h2>
      <div className="h-40 animate-pulse rounded-lg border bg-muted/40" />
    </section>
  );
}

/** De plaats van het team in zijn divisie: WTRL als die er is, anders de vastgezette live stand. */
export function ZrlResultView({
  rank,
  teams,
  points,
  href,
  linkLabel,
}: {
  rank: number;
  teams: number;
  points: number | null;
  href: string;
  linkLabel: string;
}) {
  return (
    <section id="uitslag" className="scroll-mt-20 space-y-3">
      <h2 className={HEADING}>Uitslag</h2>
      <div className="flex items-stretch overflow-hidden rounded-lg border bg-card">
        <ZrlTeamRank rank={rank} teams={teams} />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
          <p className="font-semibold tabular-nums">
            {rank}e van {teams} teams
          </p>
          {points != null && <p className="text-sm tabular-nums text-muted-foreground">{points} punten</p>}
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {linkLabel}
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
