import { EmptyState } from "@/components/app-ui";
import { ChoiceTabs } from "@/components/choice-tabs";
import { DURATION_LABELS } from "@/lib/club-ladder/advice";
import { EVEN_PCT, ourAdvantages, type LadderMatchup, type MatchupSide } from "@/lib/club-ladder/matchup";
import { SQUAD_FOCUS_LABELS, SQUAD_FOCUSES, type SquadFocus } from "@/lib/club-ladder/opponent-five";
import { DURATIONS } from "@/lib/club-ladder/team-power";
import { cn } from "@/lib/utils";

const wkg = (value: number | null | undefined) => (value == null ? "–" : value.toFixed(2));
const pct = (value: number) => `${value > 0 ? "+" : ""}${value}%`;
const kg = (value: number | null) => (value == null ? "–" : `${value} kg`);

/** ZWB tegen de tegenstander op een ladderrace: vermogen per duur, gewogen naar het parcours. */
export function LadderMatchupView({
  matchup,
  byFocus,
  routeLabel,
}: {
  matchup: LadderMatchup;
  /** Per type de beste vijf van de tegenstander, om tussen te wisselen. */
  byFocus?: Record<SquadFocus, LadderMatchup> | null;
  routeLabel: string | null;
}) {
  // De echte ploeg van de tegenstander (opgesteld of aangemeld) als eerste tab, voor de types.
  const known = matchup.theirs.focus == null && matchup.theirs.riders.length > 0;
  const tabs = byFocus
    ? [
        ...(known
          ? [
              {
                key: "werkelijk",
                label: matchup.theirs.lineup ? "Opstelling" : "Aangemeld",
                content: <MatchupBody matchup={matchup} routeLabel={routeLabel} />,
              },
            ]
          : []),
        ...SQUAD_FOCUSES.map((focus) => ({
          key: focus,
          label: SQUAD_FOCUS_LABELS[focus],
          content: <MatchupBody matchup={byFocus[focus]} routeLabel={routeLabel} />,
        })),
      ]
    : null;
  return (
    <section id="matchup" className="scroll-mt-20 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Matchup</h2>
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
          <p className="font-semibold">{matchup.ours.name}</p>
          <span className="text-xs text-muted-foreground">tegen</span>
          <p className="text-right font-semibold">{matchup.theirs.name}</p>
        </div>
        {tabs ? (
          <ChoiceTabs label={`Ploeg van ${matchup.theirs.name}`} tabs={tabs} />
        ) : (
          <MatchupBody matchup={matchup} routeLabel={routeLabel} />
        )}
      </div>
    </section>
  );
}

function MatchupBody({ matchup, routeLabel }: { matchup: LadderMatchup; routeLabel: string | null }) {
  const { ours, theirs, durations, routeEdgePct } = matchup;
  const hasData = durations.some((row) => row.edgePct != null);
  const advantages = ourAdvantages(matchup);
  const showWeight = durations.some((row) => row.weight != null);
  const showKg = ours.weightKg != null || theirs.weightKg != null;

  return (
    <div className="space-y-4">
      {!hasData ? (
        <EmptyState>Nog geen vermogensdata van beide teams.</EmptyState>
      ) : (
        <>
          {routeEdgePct != null && (
            <p
              className={cn(
                "rounded-md border px-3 py-2 text-sm",
                routeEdgePct >= EVEN_PCT ? "border-primary/30 bg-primary/10 text-primary" : "bg-muted/40",
              )}
            >
              {routeLabel ? `Dit parcours (${routeLabel.toLowerCase()}): ` : "Dit parcours: "}
              {Math.abs(routeEdgePct) < EVEN_PCT
                ? "gelijk op"
                : routeEdgePct > 0
                  ? `voordeel ${ours.name} ${pct(routeEdgePct)}`
                  : `voordeel ${theirs.name} ${pct(-routeEdgePct)}`}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-1.5 pr-3 text-left font-medium">W/kg</th>
                  <th className="px-3 py-1.5 text-right font-medium">{ours.name}</th>
                  <th className="px-3 py-1.5 text-right font-medium">{theirs.name}</th>
                  <th className="px-3 py-1.5 text-right font-medium">Verschil</th>
                  {showWeight && <th className="py-1.5 pl-3 text-right font-medium">Telt</th>}
                </tr>
              </thead>
              <tbody>
                {durations.map((row) => {
                  const ahead = row.edgePct != null && row.edgePct >= EVEN_PCT;
                  const behind = row.edgePct != null && row.edgePct <= -EVEN_PCT;
                  return (
                    <tr key={row.duration} className={cn("border-b last:border-0", ahead && "bg-primary/5")}>
                      <td className="py-1.5 pr-3">{DURATION_LABELS[row.duration]}</td>
                      <td className={cn("px-3 py-1.5 text-right", ahead && "font-semibold text-primary")}>{wkg(row.ours)}</td>
                      <td className={cn("px-3 py-1.5 text-right", behind && "font-semibold")}>{wkg(row.theirs)}</td>
                      <td className={cn("px-3 py-1.5 text-right", ahead ? "text-primary" : "text-muted-foreground")}>
                        {row.edgePct == null ? "–" : Math.abs(row.edgePct) < EVEN_PCT ? "gelijk" : pct(row.edgePct)}
                      </td>
                      {showWeight && (
                        <td className="py-1.5 pl-3 text-right text-muted-foreground">
                          {row.weight == null ? "–" : `${Math.round(row.weight * 100)}%`}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {showKg && (
                  <tr className="border-t text-muted-foreground">
                    <td className="py-1.5 pr-3">Gewicht</td>
                    <td className="px-3 py-1.5 text-right">{kg(ours.weightKg)}</td>
                    <td className="px-3 py-1.5 text-right">{kg(theirs.weightKg)}</td>
                    <td className="px-3 py-1.5 text-right">{matchup.weightCounts ? "telt mee" : "–"}</td>
                    {showWeight && <td className="py-1.5 pl-3" />}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            {advantages.length > 0
              ? `${ours.name} sterker op ${advantages.map((d) => DURATION_LABELS[d]).join(", ")}`
              : `${ours.name} nergens sterker`}
            {" · "}
            {matchup.basis === "lineup"
              ? `beste vijf ${ours.selection ? "uit de selectie" : "aangemelden"}, 90 dagen`
              : matchup.basis === "squad"
                ? theirs.focus
                  ? `90 dagen; ${theirs.name} uit de laatste ${theirs.recentRaces} races`
                  : `beste vijf, 90 dagen; ${theirs.name} uit recente races`
                : `ladderraces ${ours.races} / ${theirs.races}`}
          </p>
        </>
      )}

      {(ours.riders.length > 0 || theirs.riders.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <SideRiders side={ours} />
          <SideRiders side={theirs} />
        </div>
      )}
    </div>
  );
}

function SideRiders({ side }: { side: MatchupSide }) {
  const showRaces = side.recentRaces > 0 && side.riders.some((rider) => rider.races != null);
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">
        {side.name} ·{" "}
        {side.focus
          ? `${SQUAD_FOCUS_LABELS[side.focus].toLowerCase()}ploeg`
          : side.riders.length === 0
            ? "geen aanmeldingen"
            : side.lineup
              ? "opstelling"
              : side.selection
                ? "selectie"
                : "aangemeld"}
      </p>
      {side.riders.length > 0 && (
        <div className="mt-1 overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="py-1 pr-2 text-left font-medium">Renner</th>
                {DURATIONS.map((d) => (
                  <th key={d} className="px-1.5 py-1 text-right font-medium">
                    {DURATION_LABELS[d]}
                  </th>
                ))}
                <th className="py-1 pl-1.5 text-right font-medium">ZRS</th>
                {showRaces && <th className="py-1 pl-1.5 text-right font-medium">Races</th>}
              </tr>
            </thead>
            <tbody>
              {side.riders.map((rider) => (
                <tr key={rider.zwiftId} className="border-b last:border-0">
                  <td className="max-w-40 truncate py-1 pr-2">
                    {rider.position != null && <span className="mr-1 text-muted-foreground">{rider.position}.</span>}
                    {rider.name}
                    {rider.source === "ladder" && <span className="ml-1 text-muted-foreground">(ladder)</span>}
                  </td>
                  {DURATIONS.map((d) => (
                    <td key={d} className="px-1.5 py-1 text-right">
                      {wkg(rider.wkg?.[d])}
                    </td>
                  ))}
                  <td className="py-1 pl-1.5 text-right">{rider.racingScore == null ? "–" : Math.round(rider.racingScore)}</td>
                  {showRaces && (
                    <td className="py-1 pl-1.5 text-right">{rider.races == null ? "–" : `${rider.races}/${side.recentRaces}`}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
