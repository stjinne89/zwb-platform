"use client";

// Upgradeniveau kiezen door op de streepjes te klikken: het vijfde streepje is
// stage 5. Nog eens op het hoogste gevulde streepje zet het niveau op 0.
// Dezelfde kleuren als StagePips.

import { cn } from "@/lib/utils";
import { STAGE_STEPS, clampStage, stageColor, stagePipHeight } from "@/components/stage-pips";

export function StagePicker({
  stage,
  onChange,
  label,
  className,
}: {
  stage: number;
  onChange: (stage: number) => void;
  /** Waarvoor het niveau is, voor schermlezers. */
  label: string;
  className?: string;
}) {
  const level = clampStage(stage);
  const color = stageColor(level);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span role="radiogroup" aria-label={label} className="inline-flex items-end">
        {STAGE_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            role="radio"
            aria-checked={level === step}
            aria-label={`Stage ${step}`}
            title={`Stage ${step}`}
            onClick={() => onChange(level === step ? 0 : step)}
            className="group flex h-8 items-end px-[3px] pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <span
              className={cn(
                "block w-1.5 rounded-sm transition-colors",
                step > level && "border border-muted-foreground/40 group-hover:border-muted-foreground",
              )}
              style={{
                height: `${Math.round(stagePipHeight(step) * 1.5)}px`,
                backgroundColor: step <= level ? color : undefined,
              }}
            />
          </button>
        ))}
      </span>
      <span className="w-14 text-xs tabular-nums text-muted-foreground">Stage {level}</span>
    </span>
  );
}
