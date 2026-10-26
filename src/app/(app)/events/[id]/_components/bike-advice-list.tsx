// De snelste fietsen op een route, voor het pacingplan en de racebriefing.
// Rekenwerk in src/lib/pacing/bike-advice.ts; uitleg op /hulp#pacing-zwift.

import type { ReactNode } from "react";
import type { BikeChoice } from "@/lib/pacing/bike-advice";
import { cn } from "@/lib/utils";
import { StagePips } from "@/components/stage-pips";

function clock(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function gap(seconds: number): string {
  const rounded = Math.round(seconds);
  if (rounded === 0) return "—";
  const sign = rounded < 0 ? "−" : "+";
  const abs = Math.abs(rounded);
  return abs < 60 ? `${sign}${abs} s` : `${sign}${clock(abs)}`;
}

export type BikeAdviceRow = BikeChoice & {
  label?: string;
  /** Upgradeniveau tonen bij deze regel, ook als de lijst dat niet doet. */
  showStage?: boolean;
};

export function BikeAdviceList({
  rows,
  baseSeconds,
  action,
  showStage = false,
}: {
  rows: BikeAdviceRow[];
  /** Het verschil per regel is ten opzichte van deze tijd. */
  baseSeconds: number;
  action?: (row: BikeAdviceRow) => ReactNode;
  /** Upgradeniveau per regel, als de frames niet op hetzelfde niveau staan (garage). */
  showStage?: boolean;
}) {
  return (
    <ul className="divide-y rounded-md border text-sm">
      {rows.map((row) => {
        const diff = row.seconds - baseSeconds;
        const withStage = showStage || row.showStage === true;
        const detail = [row.wheels, showStage && row.owned === false ? "niet in je garage" : null]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={`${row.label ?? ""}${row.frame}|${row.wheels ?? ""}`} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-2 font-medium">
                <span className="truncate">
                  {row.label && <span className="mr-2 font-normal text-muted-foreground">{row.label}</span>}
                  {row.frame}
                </span>
                {withStage && <StagePips stage={row.stage} className="shrink-0" />}
              </p>
              {detail && <p className="truncate text-muted-foreground">{detail}</p>}
            </div>
            <span className="tabular-nums text-muted-foreground">{clock(row.seconds)}</span>
            <span
              className={cn(
                "w-16 text-right tabular-nums",
                Math.round(diff) < 0 && "text-emerald-600",
                Math.round(diff) > 0 && "text-muted-foreground",
              )}
            >
              {gap(diff)}
            </span>
            {action?.(row)}
          </li>
        );
      })}
    </ul>
  );
}
