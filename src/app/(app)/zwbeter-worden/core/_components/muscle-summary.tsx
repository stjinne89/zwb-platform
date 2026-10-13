// Spierkaart met de namen van de belangrijkste groepen ernaast. Eén component
// voor een oefening, een serie en de week: het verschil zit alleen in de
// belasting die erin gaat.

import { MuscleMap } from "@/components/mobility/muscle-map";
import {
  MUSCLE_LABELS,
  exerciseLoad,
  exerciseMuscles,
  normalizeLoad,
  rankedGroups,
  type MuscleLoad,
} from "@/lib/training/muscles";

export function MuscleSummary({
  load,
  size = "sm",
  limit = 3,
  className,
}: {
  /** Ruwe belasting; wordt hier naar 0-1 geschaald. */
  load: MuscleLoad;
  size?: "sm" | "lg";
  /** Hoeveel groepen bij naam genoemd worden, zwaarste eerst. */
  limit?: number;
  className?: string;
}) {
  const scaled = normalizeLoad(load);
  const names = rankedGroups(scaled)
    .slice(0, limit)
    .map((group) => MUSCLE_LABELS[group]);
  if (names.length === 0) return null;

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <MuscleMap load={scaled} className={size === "lg" ? "w-36 shrink-0" : "w-14 shrink-0"} />
      {size === "lg" ? (
        <ul className="space-y-1 text-sm">
          {names.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{names.join(" · ")}</p>
      )}
    </div>
  );
}

/** Voor één oefening: alleen de hoofdspieren bij naam, de hulpspieren lichter
 * op de kaart. */
export function ExerciseMuscleSummary({ slug, className }: { slug: string; className?: string }) {
  const muscles = exerciseMuscles(slug);
  if (!muscles) return null;
  return (
    <MuscleSummary
      load={exerciseLoad(muscles)}
      limit={muscles.primary.length}
      className={className}
    />
  );
}
