"use client";

// Spierkaart om aan te tikken: dezelfde figuur als MuscleMap, maar elke
// spiergroep is een schakelaar. Een groep staat op beide figuren (schouders voor
// en achter); tikken op een van beide zet hem aan of uit.
//
// Per figuur is elke groep één focusbaar element, zodat je ook met het
// toetsenbord door de groepen loopt; spatie of Enter schakelt.

import type { KeyboardEvent } from "react";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/training/muscles";
import { ANTERIOR, POSTERIOR, type MuscleShape } from "./muscle-map-data";

function groupsInOrder(shapes: MuscleShape[]) {
  const order: MuscleGroup[] = [];
  const points = new Map<MuscleGroup, string[]>();
  for (const [group, polygon] of shapes) {
    if (!group) continue;
    if (!points.has(group)) {
      order.push(group);
      points.set(group, []);
    }
    points.get(group)!.push(polygon);
  }
  return order.map((group) => ({ group, polygons: points.get(group)! }));
}

const FRONT = groupsInOrder(ANTERIOR);
const BACK = groupsInOrder(POSTERIOR);

function Body({
  shapes,
  groups,
  side,
  selected,
  onToggle,
  x,
}: {
  shapes: MuscleShape[];
  groups: { group: MuscleGroup; polygons: string[] }[];
  side: string;
  selected: ReadonlySet<MuscleGroup>;
  onToggle: (group: MuscleGroup) => void;
  x: number;
}) {
  const onKey = (group: MuscleGroup) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onToggle(group);
    }
  };

  return (
    <g transform={`translate(${x} 0)`}>
      {shapes
        .filter(([group]) => !group)
        .map(([, points], index) => (
          <polygon key={index} points={points} fill="currentColor" opacity={0.1} />
        ))}
      {groups.map(({ group, polygons }) => {
        const on = selected.has(group);
        return (
          <g
            key={group}
            role="checkbox"
            aria-checked={on}
            aria-label={`${MUSCLE_LABELS[group]}, ${side}`}
            tabIndex={0}
            onClick={() => onToggle(group)}
            onKeyDown={onKey(group)}
            className="group/muscle cursor-pointer outline-none"
          >
            {polygons.map((points, index) => (
              <polygon
                key={index}
                points={points}
                strokeWidth={0.8}
                className={
                  on
                    ? "fill-[var(--figure-hot)] stroke-transparent group-focus-visible/muscle:stroke-current"
                    : "fill-current stroke-transparent opacity-[0.16] group-hover/muscle:opacity-40 group-focus-visible/muscle:stroke-current group-focus-visible/muscle:opacity-40"
                }
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

export function MuscleMapPicker({
  selected,
  onToggle,
  className,
}: {
  selected: ReadonlySet<MuscleGroup>;
  onToggle: (group: MuscleGroup) => void;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 212 222"
      className={`h-auto touch-manipulation select-none text-primary [--figure-hot:var(--accent)] dark:text-foreground dark:[--figure-hot:var(--primary)] ${className ?? "w-full"}`}
      role="group"
      aria-label="Spiergroepen"
    >
      <Body shapes={ANTERIOR} groups={FRONT} side="voorkant" selected={selected} onToggle={onToggle} x={0} />
      <Body shapes={POSTERIOR} groups={BACK} side="achterkant" selected={selected} onToggle={onToggle} x={112} />
    </svg>
  );
}
