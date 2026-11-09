"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { MemberLink } from "@/components/member-link";
import { PowerUnitToggle } from "@/components/power-unit";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive-table";
import { DURATION_LABELS } from "@/lib/club-ladder/advice";
import type { LadderPlace } from "@/lib/club-ladder/briefing";
import { heatHue, ladderPower, ladderPowerRange, nextLadderSort, sortLadderPlaces, type LadderSort, type LadderSortKey } from "@/lib/club-ladder/briefing-sort";
import type { PowerDuration } from "@/lib/club-ladder/routes";
import { DURATIONS } from "@/lib/club-ladder/team-power";
import { cn } from "@/lib/utils";
import { useMatchupUnit } from "../../_components/ladder-matchup-riders";

const nl2 = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Verwachte uitslag van een ladderrace: kies de duren, sorteer per kolom. */
export function LadderResultTable({
  rows,
  keyDuration,
  ownTeam,
  opponent,
}: {
  rows: LadderPlace[];
  keyDuration: PowerDuration;
  ownTeam: string | null;
  opponent: string;
}) {
  const [durations, setDurations] = useState<PowerDuration[]>([keyDuration]);
  const [sort, setSort] = useState<LadderSort | null>(null);
  const unit = useMatchupUnit();
  const sorted = useMemo(() => sortLadderPlaces(rows, sort, unit), [rows, sort, unit]);

  const toggleDuration = (d: PowerDuration) => {
    if (!durations.includes(d)) return setDurations(DURATIONS.filter((x) => x === d || durations.includes(x)));
    // Minstens één duur blijft staan.
    if (durations.length === 1) return;
    if (sort?.key === d) setSort(null);
    setDurations(durations.filter((x) => x !== d));
  };

  const header = (key: LadderSortKey, label: string, align: "left" | "right" = "left") => {
    const active = sort?.key === key;
    return (
      <button
        type="button"
        onClick={() => setSort((current) => nextLadderSort(current, key))}
        aria-label={`Sorteer op ${key === "place" ? "plek" : label}`}
        aria-pressed={active}
        className={cn(
          "inline-flex items-center gap-0.5 uppercase tracking-wide hover:text-foreground",
          align === "right" && "flex-row-reverse",
          active && "text-foreground",
        )}
      >
        {label}
        {active && (sort!.direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    );
  };

  const ranges = useMemo(
    () => new Map(DURATIONS.map((d) => [d, ladderPowerRange(rows, d, unit)] as const)),
    [rows, unit],
  );

  const power = (row: LadderPlace, d: PowerDuration) => {
    const value = ladderPower(row, unit)?.[d];
    if (value == null) return "—";
    const hue = heatHue(value, ranges.get(d) ?? null);
    return (
      <span
        className="inline-block min-w-12 rounded px-1.5 py-0.5 text-right tabular-nums"
        style={hue == null ? undefined : { backgroundColor: `hsl(${hue} 70% 50% / 0.3)` }}
      >
        {unit === "w" ? String(Math.round(value)) : nl2.format(value)}
      </span>
    );
  };

  const columns: Array<ResponsiveColumn<LadderPlace>> = [
    { key: "place", header: header("place", "#"), cell: (r) => (r.rating === null ? "—" : r.place), secondary: true },
    {
      key: "name",
      header: header("name", "Renner"),
      primary: true,
      cell: (r) => (
        <span className={cn(r.own && "font-semibold")}>
          <MemberLink id={r.profileId}>{r.name}</MemberLink>
          {r.source === "ladder" && <span className="ml-1 text-xs font-normal text-muted-foreground">(ladder)</span>}
        </span>
      ),
    },
    { key: "team", header: "Ploeg", cell: (r) => (r.own ? ownTeam : opponent) },
    { key: "points", header: header("points", "Punten", "right"), cell: (r) => (r.rating === null ? "—" : r.points), align: "right" },
    ...durations.map(
      (d): ResponsiveColumn<LadderPlace> => ({
        key: d,
        header: header(d, DURATION_LABELS[d], "right"),
        cell: (r) => power(r, d),
        align: "right",
      }),
    ),
    { key: "zrs", header: header("zrs", "ZRS", "right"), cell: (r) => (r.racingScore == null ? "—" : Math.round(r.racingScore)), align: "right" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Duren" className="inline-flex rounded-md border bg-background p-0.5">
          {DURATIONS.map((d) => {
            const on = durations.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDuration(d)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition",
                  on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {DURATION_LABELS[d]}
              </button>
            );
          })}
        </div>
        <PowerUnitToggle />
      </div>
      <ResponsiveTable
        columns={columns}
        rows={sorted}
        rowKey={(r) => String(r.zwiftId)}
        rowClassName={(r) => (r.own ? "bg-primary/5" : undefined)}
      />
    </div>
  );
}
