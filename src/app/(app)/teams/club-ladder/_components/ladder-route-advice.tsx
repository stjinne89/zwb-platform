import { Fragment } from "react";
import { EmptyState } from "@/components/app-ui";
import { ChoiceTabs } from "@/components/choice-tabs";
import { DURATION_LABELS, type LadderAdvice } from "@/lib/club-ladder/advice";
import { EDGE_TONE_BORDER, EDGE_TONE_TEXT, edgeTone, formatEdge } from "@/lib/club-ladder/edge-tone";
import { SQUAD_FOCUS_LABELS } from "@/lib/club-ladder/opponent-five";
import type { LadderRouteAdvice, OpponentSquad } from "@/lib/club-ladder/route-advice";
import { cn } from "@/lib/utils";
import { LadderAdviceRoutes } from "./ladder-advice-routes";
import type { LadderRouteRow } from "./ladder-routes";

const wkgFormat = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wkgLabel = (value: number) => wkgFormat.format(value);

/**
 * Parcoursadvies tegen één tegenstander, met een tab per type ploeg als er te
 * kiezen valt. `routesOnly` laat het vermogen per duur weg: op de eventpagina
 * staat dat al in de matchup.
 */
export function LadderRouteAdviceView({
  routeAdvice,
  opponent,
  options,
  selection,
  routesOnly = false,
}: {
  routeAdvice: LadderRouteAdvice | null;
  opponent: string;
  options: LadderRouteRow[];
  selection: boolean;
  routesOnly?: boolean;
}) {
  if (routeAdvice?.byFocus) {
    return (
      <div className="mt-3">
        <ChoiceTabs
          label={`Ploeg van ${opponent}`}
          tabs={routeAdvice.byFocus.map((row) => ({
            key: row.focus,
            label: SQUAD_FOCUS_LABELS[row.focus],
            content: (
              <AdviceView
                advice={row.advice}
                opponent={opponent}
                options={options}
                selection={selection}
                squad={row.squad}
                routesOnly={routesOnly}
              />
            ),
          }))}
        />
      </div>
    );
  }
  return (
    <AdviceView
      advice={routeAdvice?.advice ?? null}
      opponent={opponent}
      options={options}
      selection={selection}
      squad={routeAdvice?.squad ?? null}
      routesOnly={routesOnly}
    />
  );
}

function AdviceView({
  advice,
  opponent,
  options,
  selection,
  squad,
  routesOnly,
}: {
  advice: LadderAdvice | null;
  opponent: string;
  options: LadderRouteRow[];
  selection: boolean;
  squad?: OpponentSquad | null;
  routesOnly: boolean;
}) {
  if (!advice) return <EmptyState className="mt-3">Nog geen wedstrijden van {opponent} bewaard.</EmptyState>;
  const extraFavorite =
    advice.bestFavorite && !advice.routes.some((route) => route.slug === advice.bestFavorite!.slug) ? advice.bestFavorite : null;
  // Alleen de getoonde parcoursen naar de browser: met de knoppen staat dit blok vier keer op de pagina.
  const shown = new Set([...advice.routes, ...(extraFavorite ? [extraFavorite] : [])].map((route) => route.slug));
  return (
    <div className="mt-3 space-y-3">
      {!routesOnly && (
        <>
          <div className="space-y-1.5 text-xs">
            {advice.durations.map((row) => {
              const tone = edgeTone(row.edgePct);
              return (
                <div key={row.duration} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="w-12 shrink-0 text-muted-foreground">{DURATION_LABELS[row.duration]}</span>
                  <span
                    className={cn(
                      "rounded-md border px-2 py-0.5 font-medium tabular-nums",
                      tone ? [EDGE_TONE_TEXT[tone], EDGE_TONE_BORDER[tone]] : "text-muted-foreground",
                    )}
                  >
                    {row.edgePct == null ? "–" : formatEdge(row.edgePct)}
                  </span>
                  {row.pairs.map((pair, index) => {
                    const pairTone = edgeTone(pair.pct);
                    return (
                      <span key={index} className="whitespace-nowrap tabular-nums text-muted-foreground">
                        {wkgLabel(pair.ours)}/{wkgLabel(pair.theirs)}{" "}
                        <span className={cn(pairTone && EDGE_TONE_TEXT[pairTone])}>{formatEdge(pair.pct)}</span>
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {(advice.weightKg.ours != null || advice.weightKg.theirs != null) && (
              <span className="rounded-md border px-2 py-1 tabular-nums text-muted-foreground">
                Gewicht {advice.weightKg.ours ?? "–"} / {advice.weightKg.theirs ?? "–"} kg
              </span>
            )}
            <span className="px-1 py-1 text-muted-foreground">
              {selection ? "Selectie · " : ""}
              {advice.ours.riders} / {advice.theirs.riders} renners met vermogen
            </span>
          </div>
          {advice.missing.length > 0 && <p className="text-xs text-muted-foreground">Zonder vermogen: {advice.missing.join(", ")}</p>}
        </>
      )}
      {squad && squad.riders.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {opponent}:{" "}
          {/* De komma buiten het nowrap-stuk, anders breekt de regel nergens af. */}
          {squad.riders.map((rider, index) => (
            <Fragment key={`${rider.name}-${index}`}>
              {index > 0 ? ", " : ""}
              <span className="whitespace-nowrap">
                {rider.name} <span className="tabular-nums">{rider.races}/{squad.races}</span>
              </span>
            </Fragment>
          ))}
        </p>
      )}
      <LadderAdviceRoutes routes={advice.routes} extraFavorite={extraFavorite} options={options.filter((option) => shown.has(option.slug))} />
    </div>
  );
}
