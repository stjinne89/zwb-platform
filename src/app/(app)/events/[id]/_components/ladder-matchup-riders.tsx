"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { MatchupRider } from "@/lib/club-ladder/matchup";
import type { PowerDuration } from "@/lib/club-ladder/routes";
import { nextRiderSort, sortMatchupRiders, type RiderSort, type RiderSortKey } from "@/lib/club-ladder/matchup-sort";
import { cn } from "@/lib/utils";

const wkg = (value: number | null | undefined) => (value == null ? "–" : value.toFixed(2));

/** Renners van één kant; elke kolom sorteert met een klik, zonder klik op startplek. */
export function MatchupRiderTable({
  riders,
  durations,
  recentRaces,
  showRaces,
}: {
  riders: MatchupRider[];
  durations: Array<{ key: PowerDuration; label: string }>;
  recentRaces: number;
  showRaces: boolean;
}) {
  const [sort, setSort] = useState<RiderSort | null>(null);

  const rows = useMemo(() => sortMatchupRiders(riders, sort), [riders, sort]);
  const toggle = (key: RiderSortKey) => setSort((current) => nextRiderSort(current, key));

  const header = (key: RiderSortKey, label: string, align: "left" | "right", className: string) => {
    const active = sort?.key === key;
    return (
      <th
        key={key}
        className={cn("font-medium", align === "left" ? "text-left" : "text-right", className)}
        aria-sort={active ? (sort!.direction === "asc" ? "ascending" : "descending") : "none"}
      >
        <button
          type="button"
          onClick={() => toggle(key)}
          className={cn(
            "inline-flex items-center gap-0.5 rounded hover:text-foreground",
            align === "right" && "flex-row-reverse",
            active && "text-foreground",
          )}
        >
          {label}
          {active && (sort!.direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
        </button>
      </th>
    );
  };

  return (
    <table className="w-full text-xs tabular-nums">
      <thead className="text-muted-foreground">
        <tr className="border-b">
          {header("name", "Renner", "left", "py-1 pr-2")}
          {durations.map((d) => header(d.key, d.label, "right", "px-1.5 py-1"))}
          {header("zrs", "ZRS", "right", "py-1 pl-1.5")}
          {showRaces && header("races", "Races", "right", "py-1 pl-1.5")}
        </tr>
      </thead>
      <tbody>
        {rows.map((rider) => (
          <tr key={rider.zwiftId} className="border-b last:border-0">
            <td className="max-w-40 truncate py-1 pr-2">
              {rider.position != null && <span className="mr-1 text-muted-foreground">{rider.position}.</span>}
              {rider.name}
              {rider.source === "ladder" && <span className="ml-1 text-muted-foreground">(ladder)</span>}
            </td>
            {durations.map((d) => (
              <td key={d.key} className="px-1.5 py-1 text-right">
                {wkg(rider.wkg?.[d.key])}
              </td>
            ))}
            <td className="py-1 pl-1.5 text-right">{rider.racingScore == null ? "–" : Math.round(rider.racingScore)}</td>
            {showRaces && (
              <td className="py-1 pl-1.5 text-right">{rider.races == null ? "–" : `${rider.races}/${recentRaces}`}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
