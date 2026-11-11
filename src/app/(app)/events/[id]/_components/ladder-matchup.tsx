import { cookies } from "next/headers";
import { EmptyState } from "@/components/app-ui";
import { MemberLink } from "@/components/member-link";
import { ChoiceTabs } from "@/components/choice-tabs";
import { PowerUnitProvider, PowerUnitToggle } from "@/components/power-unit";
import { DURATION_LABELS } from "@/lib/club-ladder/advice";
import type { FiveAdvice } from "@/lib/club-ladder/five-advice";
import { EVEN_PCT, ourAdvantages, type LadderMatchup, type MatchupSide } from "@/lib/club-ladder/matchup";
import { matchupHeat, type MatchupHeat } from "@/lib/club-ladder/matchup-heat";
import { SQUAD_FOCUS_LABELS, SQUAD_FOCUSES, type SquadFocus } from "@/lib/club-ladder/opponent-five";
import { DURATIONS } from "@/lib/club-ladder/team-power";
import { POWER_UNIT_COOKIE } from "@/lib/training/power-unit";
import { cn } from "@/lib/utils";
import { MatchupPower, MatchupRiderTable, MatchupUnitLabel } from "./ladder-matchup-riders";

const pct = (value: number) => `${value > 0 ? "+" : ""}${value}%`;
const kg = (value: number | null) => (value == null ? "–" : `${value} kg`);

/** ZWB tegen de tegenstander op een ladderrace: vermogen per duur, gewogen naar het parcours. */
export async function LadderMatchupView({
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
  // Watt alleen als iemand dat elders (Teams, ZWBeter Worden) koos; anders W/kg zoals de ladder.
  const unitCookie = (await cookies()).get(POWER_UNIT_COOKIE)?.value;
  return (
    <PowerUnitProvider initialUnit={unitCookie === "w" ? "w" : "wkg"} weightKg={null}>
      <section id="matchup" className="scroll-mt-20 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Matchup</h2>
          <PowerUnitToggle />
        </div>
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
    </PowerUnitProvider>
  );
}

function MatchupBody({ matchup, routeLabel }: { matchup: LadderMatchup; routeLabel: string | null }) {
  const { ours, theirs, durations, routeEdgePct } = matchup;
  const hasData = durations.some((row) => row.edgePct != null);
  const advantages = ourAdvantages(matchup);
  const showWeight = durations.some((row) => row.weight != null);
  const showKg = ours.weightKg != null || theirs.weightKg != null;
  const heat = matchupHeat([...ours.riders, ...theirs.riders]);

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
                  <th className="py-1.5 pr-3 text-left font-medium">
                    <MatchupUnitLabel />
                  </th>
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
                      <td className={cn("px-3 py-1.5 text-right", ahead && "font-semibold text-primary")}>
                        <MatchupPower wkg={row.ours} watts={ours.watts?.[row.duration]} />
                      </td>
                      <td className={cn("px-3 py-1.5 text-right", behind && "font-semibold")}>
                        <MatchupPower wkg={row.theirs} watts={theirs.watts?.[row.duration]} />
                      </td>
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
              ? `beste vijf ${ours.selection ? "uit de selectie" : "aangemeld op de ladder"}, 90 dagen`
              : matchup.basis === "squad"
                ? theirs.focus
                  ? `90 dagen; ${theirs.name} uit de laatste ${theirs.recentRaces} races`
                  : `beste vijf, 90 dagen; ${theirs.name} uit recente races`
                : `ladderraces ${ours.races} / ${theirs.races}`}
          </p>
        </>
      )}

      {matchup.ourFive && <OurFive advice={matchup.ourFive} ourName={ours.name} />}

      {(ours.riders.length > 0 || theirs.riders.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <SideRiders side={ours} heat={heat} />
          <SideRiders side={theirs} heat={heat} />
        </div>
      )}
    </div>
  );
}

/** Zoveel vijftallen in het advies; daaronder scheelt het steeds minder. */
const FIVE_OPTIONS_SHOWN = 6;

const names = (riders: FiveAdvice["withoutPower"]) =>
  riders.map((rider, index) => (
    <span key={rider.zwiftId}>
      {index > 0 && ", "}
      <MemberLink id={rider.profileId}>{rider.name}</MemberLink>
    </span>
  ));

/** Met meer dan vijf van ons: per vijftal wie op de bank zit en de verwachte score, beste eerst. */
function OurFive({ advice, ourName }: { advice: FiveAdvice; ourName: string }) {
  const options = advice.options.slice(0, FIVE_OPTIONS_SHOWN);
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{ourName} · onze vijf</p>
      <table className="w-full text-sm tabular-nums">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="py-1.5 pr-3 text-left font-medium">Op de bank</th>
            <th className="px-3 py-1.5 text-right font-medium">Verwacht</th>
            <th className="py-1.5 pl-3 text-right font-medium">
              <span className="sr-only">Advies</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {options.map((option, index) => (
            <tr key={option.five.join("-")} className={cn("border-b last:border-0", index === 0 && "bg-primary/5")}>
              <td className={cn("py-1.5 pr-3", index === 0 && "font-semibold")}>{names(option.rest)}</td>
              <td className={cn("px-3 py-1.5 text-right", option.win ? "text-primary" : "text-muted-foreground")}>
                {option.ours}–{option.theirs}
              </td>
              <td className="py-1.5 pl-3 text-right text-xs">
                {index === 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">advies</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {advice.withoutPower.length > 0 && (
        <p className="text-xs text-muted-foreground">Zonder vermogen: {names(advice.withoutPower)}</p>
      )}
    </div>
  );
}

function SideRiders({ side, heat }: { side: MatchupSide; heat: MatchupHeat }) {
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
          <MatchupRiderTable
            riders={side.riders}
            durations={DURATIONS.map((key) => ({ key, label: DURATION_LABELS[key] }))}
            recentRaces={side.recentRaces}
            showRaces={showRaces}
            heat={heat}
          />
        </div>
      )}
    </div>
  );
}
