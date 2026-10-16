"use client";

import { useState } from "react";
import { MemberLink } from "@/components/member-link";
import { cn } from "@/lib/utils";
import { Toggle, nl } from "../ik/_components/chart-tiles";

export type RiderRow = { id: string; name: string; km: number; hours: number; elevation: number };

const METRICS = [
  { key: "km", label: "Km", unit: "km" },
  { key: "hours", label: "Uren", unit: "u" },
  { key: "elevation", label: "Hm", unit: "m" },
] as const;

type Metric = (typeof METRICS)[number]["key"];

/**
 * De ranglijst van de club, te sorteren op km, uren of hoogtemeters. Een balk
 * per renner maakt de verhouding zichtbaar; je eigen rij staat in goud.
 */
export function TopRiders({ rows, viewerId }: { rows: RiderRow[]; viewerId: string | null }) {
  const [metric, setMetric] = useState<Metric>("km");
  const def = METRICS.find((item) => item.key === metric)!;
  const sorted = [...rows].filter((row) => row[metric] > 0).sort((a, b) => b[metric] - a[metric]);
  const max = Math.max(1, ...sorted.map((row) => row[metric]));
  const ownIndex = sorted.findIndex((row) => row.id === viewerId);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Toggle label="Rangschikken op" options={METRICS} value={metric} onChange={setMetric} />
        {ownIndex >= 0 && (
          <span className="text-sm text-muted-foreground">
            Jij staat <span className="st-kpi st-sm align-middle text-foreground">{ownIndex + 1}e</span>
          </span>
        )}
      </div>
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Geen ritten in deze periode.</p>
      ) : (
        // Tien rijen hoog; de rest scrolt.
        <ol className="max-h-[27rem] space-y-1 overflow-y-auto pr-1">
          {sorted.map((row, index) => {
            const own = row.id === viewerId;
            return (
              <li key={row.id} className="relative overflow-hidden rounded-sm">
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${Math.max(2, (row[metric] / max) * 100)}%`,
                    background: own ? "var(--st-hi)" : "var(--st-main)",
                    opacity: own ? 0.35 : 0.14,
                  }}
                />
                <span className="relative flex min-h-10 items-center justify-between gap-3 px-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">{index + 1}</span>
                    <MemberLink id={row.id} className={cn("truncate", own && "font-semibold")}>
                      {row.name}
                    </MemberLink>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {nl(row[metric], metric === "hours" && row[metric] < 10 ? 1 : 0)} {def.unit}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
