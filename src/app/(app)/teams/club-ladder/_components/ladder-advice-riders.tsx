"use client";

import { useState } from "react";
import { MemberLink } from "@/components/member-link";
import type { OverviewRider } from "@/lib/club-ladder/advice";
import type { PowerDuration } from "@/lib/club-ladder/routes";
import { DURATION_LABELS, DURATIONS } from "@/lib/club-ladder/team-power";
import { cn } from "@/lib/utils";

const wkgFormat = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Een profielrenner van ons heet `profile:<id>`; die naam linkt naar zijn profiel. */
const profileId = (key: string) => (key.startsWith("profile:") ? key.slice("profile:".length) : null);

/**
 * Onze vijf en hun vijf in één lijst, op een duur gesorteerd (vraag van de
 * ploeg, 2026-11-19): zo is te zien wie een duur draagt, in plaats van alleen
 * het voordeel van de paren.
 */
export function LadderAdviceRiders({
  ours,
  theirs,
  opponent,
}: {
  ours: OverviewRider[];
  theirs: OverviewRider[];
  opponent: string;
}) {
  const [sort, setSort] = useState<PowerDuration>("m5");
  const rows = [
    ...ours.map((rider) => ({ rider, side: "ours" as const })),
    ...theirs.map((rider) => ({ rider, side: "theirs" as const })),
  ].sort((a, b) => (b.rider.wkg?.[sort] ?? -1) - (a.rider.wkg?.[sort] ?? -1) || a.rider.name.localeCompare(b.rider.name, "nl"));
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="py-1.5 pr-2 text-left font-medium">Renner</th>
            {DURATIONS.map((duration) => (
              <th key={duration} className="py-1.5 pl-2 text-right font-medium" aria-sort={sort === duration ? "descending" : undefined}>
                <button
                  type="button"
                  onClick={() => setSort(duration)}
                  className={cn("whitespace-nowrap hover:text-foreground", sort === duration && "text-foreground underline underline-offset-4")}
                >
                  {DURATION_LABELS[duration]}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ rider, side }) => (
            <tr key={`${side}-${rider.key}`} className={cn("border-b last:border-0", side === "ours" && "bg-primary/5")}>
              <td className="py-1.5 pr-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    aria-hidden
                    className={cn("size-2 shrink-0 rounded-full", side === "ours" ? "bg-primary" : "bg-muted-foreground/50")}
                  />
                  <span className="sr-only">{side === "ours" ? "Wij: " : `${opponent}: `}</span>
                  {side === "ours" ? (
                    <MemberLink id={profileId(rider.key)} className="truncate font-medium">
                      {rider.name}
                    </MemberLink>
                  ) : (
                    <span className="truncate">{rider.name}</span>
                  )}
                </span>
              </td>
              {DURATIONS.map((duration) => {
                const value = rider.wkg?.[duration];
                return (
                  <td key={duration} className={cn("py-1.5 pl-2 text-right", sort === duration ? "font-medium" : "text-muted-foreground")}>
                    {value == null ? "–" : wkgFormat.format(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
