"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { MemberLink } from "@/components/member-link";
import { usePowerUnit } from "@/components/power-unit";
import type { MatchupRider } from "@/lib/club-ladder/matchup";
import type { PowerDuration } from "@/lib/club-ladder/routes";
import type { PowerWkg } from "@/lib/club-ladder/team-power";
import { nextRiderSort, riderWatts, sortMatchupRiders, type MatchupUnit, type RiderSort, type RiderSortKey } from "@/lib/club-ladder/matchup-sort";
import { cn } from "@/lib/utils";

const shown = (value: number | null | undefined, unit: MatchupUnit) =>
  value == null ? "–" : unit === "w" ? String(Math.round(value)) : value.toFixed(2);

/** Watt of W/kg uit de schakelaar boven de matchup; % FTP bestaat hier niet. */
export function useMatchupUnit(): MatchupUnit {
  return usePowerUnit().unit === "w" ? "w" : "wkg";
}

/** Eén waarde in de gekozen eenheid, voor de tabel per duur. */
export function MatchupPower({ wkg, watts }: { wkg: number | null | undefined; watts: number | null | undefined }) {
  const unit = useMatchupUnit();
  return <>{shown(unit === "w" ? watts : wkg, unit)}</>;
}

/** Kop van de tabel per duur: Watt of W/kg. */
export function MatchupUnitLabel() {
  return <>{useMatchupUnit() === "w" ? "Watt" : "W/kg"}</>;
}

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

  const unit = useMatchupUnit();
  const rows = useMemo(() => sortMatchupRiders(riders, sort, unit), [riders, sort, unit]);
  const powerOf = (rider: MatchupRider): PowerWkg | null => (unit === "w" ? riderWatts(rider.wkg, rider.weightKg) : rider.wkg);
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
              <MemberLink id={rider.profileId}>{rider.name}</MemberLink>
              {rider.source === "ladder" && <span className="ml-1 text-muted-foreground">(ladder)</span>}
            </td>
            {durations.map((d) => (
              <td key={d.key} className="px-1.5 py-1 text-right">
                {shown(powerOf(rider)?.[d.key], unit)}
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
