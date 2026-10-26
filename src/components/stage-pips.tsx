// Upgradeniveau van een Zwift-frame als vijf streepjes, zoals in de garage van
// Zwift. Hoe hoger, hoe meer gevuld en hoe warmer de kleur: goud op stage 5,
// daaronder teal, petrol en salie (--zwb-stage-N in globals.css).

import { cn } from "@/lib/utils";

const STEPS = [1, 2, 3, 4, 5];

export function StagePips({ stage, className }: { stage: number; className?: string }) {
  const level = Math.min(5, Math.max(0, Math.round(stage)));
  const color = level > 0 ? `var(--zwb-stage-${level})` : undefined;
  return (
    <span role="img" aria-label={`Stage ${level}`} className={cn("inline-flex items-end gap-0.5", className)}>
      {STEPS.map((step) => (
        <span
          key={step}
          className={cn("w-1 rounded-sm", step > level && "border border-muted-foreground/40")}
          style={{ height: `${4 + step * 2}px`, backgroundColor: step <= level ? color : undefined }}
        />
      ))}
    </span>
  );
}
