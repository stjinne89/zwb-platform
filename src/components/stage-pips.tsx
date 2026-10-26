// Upgradeniveau van een Zwift-frame als vijf streepjes, zoals in de garage van
// Zwift. Hoe hoger, hoe meer gevuld en hoe warmer de kleur: goud op stage 5,
// daaronder teal, petrol en salie (--zwb-stage-N in globals.css).

import { cn } from "@/lib/utils";

export const STAGE_STEPS = [1, 2, 3, 4, 5];

/** Hoogte van het streepje voor dit niveau, in px: oplopend van 6 tot 14. */
export const stagePipHeight = (step: number) => 4 + step * 2;

export const clampStage = (stage: number) => Math.min(5, Math.max(0, Math.round(stage)));

/** De kleur van een niveau; stage 0 heeft er geen. */
export const stageColor = (level: number) => (level > 0 ? `var(--zwb-stage-${level})` : undefined);

export function StagePips({ stage, className }: { stage: number; className?: string }) {
  const level = clampStage(stage);
  const color = stageColor(level);
  return (
    <span role="img" aria-label={`Stage ${level}`} className={cn("inline-flex items-end gap-0.5", className)}>
      {STAGE_STEPS.map((step) => (
        <span
          key={step}
          className={cn("w-1 rounded-sm", step > level && "border border-muted-foreground/40")}
          style={{ height: `${stagePipHeight(step)}px`, backgroundColor: step <= level ? color : undefined }}
        />
      ))}
    </span>
  );
}
