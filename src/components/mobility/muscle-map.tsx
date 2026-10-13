// Spierkaart: lichaam van voren en van achteren, met de getrainde spiergroepen
// ingekleurd. Server component, geen interactie.
//
// De kleur volgt dezelfde tokens als de oefeningfiguren: rustende vlakken in
// een lichte tint van de tekstkleur, belaste vlakken in `--figure-hot`, sterker
// naarmate de belasting hoger is.

import {
  MUSCLE_LABELS,
  rankedGroups,
  type MuscleLoad,
} from "@/lib/training/muscles";
import { ANTERIOR, POSTERIOR, type MuscleShape } from "./muscle-map-data";

/** Onder deze dekking is een belast vlak niet meer van een rustend vlak te
 * onderscheiden. */
const MIN_OPACITY = 0.35;

function Body({ shapes, load, x }: { shapes: MuscleShape[]; load: MuscleLoad; x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {shapes.map(([group, points], index) => {
        const value = group ? Math.min(1, load[group] ?? 0) : 0;
        return (
          <g key={index}>
            <polygon points={points} fill="currentColor" opacity={group ? 0.16 : 0.1} />
            {value > 0 && (
              <polygon
                points={points}
                fill="var(--figure-hot, var(--accent))"
                opacity={MIN_OPACITY + (1 - MIN_OPACITY) * value}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

/**
 * `load` loopt per spiergroep van 0 tot 1 (zie normalizeLoad). Zonder belasting
 * tekent de kaart alleen het lichaam.
 */
export function MuscleMap({ load, className }: { load: MuscleLoad; className?: string }) {
  const names = rankedGroups(load).map((group) => MUSCLE_LABELS[group]);

  return (
    <svg
      viewBox="0 0 212 222"
      className={`h-auto text-primary [--figure-hot:var(--accent)] dark:text-foreground dark:[--figure-hot:var(--primary)] ${className ?? "w-full"}`}
      role="img"
      aria-label={names.length > 0 ? `Spiergroepen: ${names.join(", ")}` : "Spiergroepen"}
    >
      <Body shapes={ANTERIOR} load={load} x={0} />
      <Body shapes={POSTERIOR} load={load} x={112} />
    </svg>
  );
}
