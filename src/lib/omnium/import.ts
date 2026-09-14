// Brug tussen de geplakte uitslag en de puntenmotor.
//
// Puur gehouden zodat de preview op het beheerscherm exact dezelfde punten
// laat zien als wat er straks wordt opgeslagen. Zou de preview een eigen
// rekenweg hebben, dan is hij niets waard: dan bevestig je iets anders dan je
// ziet.

import { normalize } from "@/lib/text/normalize";
import type { ParsedResultRow, ParseMode } from "@/lib/omnium/parse-results";
import { DEFAULT_SCORING, type OmniumScoring } from "@/lib/omnium/scales";
import {
  scoreCritRoyale,
  scoreFinishOrder,
  type CritDirectEntry,
  type Discipline,
  type FinishEntry,
  type ScoredResult,
} from "@/lib/omnium/scoring";

/** De sleutel waarop renners over edities heen worden herkend. */
export function nameKeyOf(name: string): string {
  return normalize(name);
}

/** Welke invoervorm hoort standaard bij welk onderdeel. */
export function defaultModeFor(discipline: Discipline): ParseMode {
  if (discipline === "sprint") return "segment";
  if (discipline === "crit") return "crit_points";
  return "finish";
}

const SPRINT_BLOCK = /^sprint\s*(\d+)?$/i;

function sortedSprintBlocks(rows: ParsedResultRow[]): string[] {
  const blocks = new Set<string>();
  for (const row of rows) {
    if (row.block && SPRINT_BLOCK.test(row.block)) blocks.add(row.block);
  }
  return [...blocks].sort((a, b) => {
    const numberA = Number(SPRINT_BLOCK.exec(a)?.[1] ?? 0);
    const numberB = Number(SPRINT_BLOCK.exec(b)?.[1] ?? 0);
    return numberA - numberB;
  });
}

function toFinishEntry(
  row: ParsedResultRow,
  idOf: (row: ParsedResultRow) => string,
): FinishEntry {
  return {
    riderId: idOf(row),
    league: row.league ?? "",
    status: row.status,
    overallPosition: row.position,
    timeSeconds: row.timeSeconds,
    timeText: row.timeText,
    segmentSeconds: row.segmentSeconds,
  };
}

/**
 * Scoort de geparseerde regels van één onderdeel. `idOf` bepaalt waarop
 * renners worden samengevoegd: bij de preview is dat de genormaliseerde naam,
 * bij het opslaan het echte renner-ID.
 */
export function scoreParsedRows(
  rows: ParsedResultRow[],
  options: {
    discipline: Discipline;
    mode: ParseMode;
    scoring?: OmniumScoring;
    idOf?: (row: ParsedResultRow) => string;
  },
): ScoredResult[] {
  const scoring = options.scoring ?? DEFAULT_SCORING;
  const idOf = options.idOf ?? ((row: ParsedResultRow) => nameKeyOf(row.name));
  const { scales, tiePolicy } = scoring;

  if (options.mode === "crit_detailed") {
    const finish = rows
      .filter((row) => row.block === "finish")
      .map((row) => toFinishEntry(row, idOf));
    const sprints = sortedSprintBlocks(rows).map((block) =>
      rows
        .filter((row) => row.block === block)
        .map((row) => toFinishEntry(row, idOf)),
    );
    return scoreCritRoyale({ mode: "detailed", finish, sprints }, scales, {
      tiePolicy,
    });
  }

  if (options.mode === "crit_points") {
    const entries: CritDirectEntry[] = rows.map((row) => ({
      riderId: idOf(row),
      league: row.league ?? "",
      status: row.status,
      points: row.points ?? 0,
      overallPosition: row.position,
    }));
    return scoreCritRoyale({ mode: "direct", entries }, scales, { tiePolicy });
  }

  const entries = rows.map((row) => toFinishEntry(row, idOf));
  if (options.mode === "segment") {
    return scoreFinishOrder(entries, scales.sprint, {
      discipline: "sprint",
      tiePolicy,
      rankBy: "segment",
    });
  }

  const scale =
    options.discipline === "prologue" ? scales.prologue : scales.scratch;
  return scoreFinishOrder(entries, scale, {
    discipline: options.discipline,
    tiePolicy,
    // De Prologue is een tijdrit, dus daar is de tijd leidend als hij er staat.
    rankBy: options.discipline === "prologue" ? "time" : "position",
  });
}
