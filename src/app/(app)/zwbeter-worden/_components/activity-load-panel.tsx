"use client";

import { useState } from "react";
import type { RideLoad, WeeklyLoad } from "@/lib/training/ride-metrics";
import { formatChartDate } from "@/lib/charts/format";
import { tickIndices } from "@/lib/charts/responsive";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number | null) {
  if (!seconds) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}u` : `${hours}u ${minutes}m`;
}

function formatCtlChange(value: number | null) {
  if (value == null) return "-";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("nl-NL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}`;
}

/** Week van maandag tot en met zondag, als "18 - 24 aug". */
function weekRange(weekStart: string) {
  const end = new Date(`${weekStart}T12:00:00`);
  end.setDate(end.getDate() + 6);
  return `${formatChartDate(weekStart)} - ${formatChartDate(end.toISOString().slice(0, 10))}`;
}

function WeekTooltip({ week, position }: { week: WeeklyLoad; position: number }) {
  // Zonder meting uitlijnen: bij de randen schuift de kaart naar binnen, in het
  // midden staat hij gecentreerd boven de kolom.
  const shift = position < 0.25 ? "0%" : position > 0.75 ? "-100%" : "-50%";

  return (
    <div
      className="pointer-events-none absolute top-0 z-10 w-44 rounded-md border bg-popover p-3 text-popover-foreground shadow-md"
      style={{ left: `${position * 100}%`, transform: `translateX(${shift})` }}
    >
      <p className="text-xs font-semibold">{weekRange(week.weekStart)}</p>
      <dl className="mt-2 space-y-1 text-xs tabular-nums">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">TSS</dt>
          <dd className="font-medium">{week.load}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">CTL</dt>
          <dd className="font-medium">{formatCtlChange(week.ctlChange)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Afstand</dt>
          <dd className="font-medium">{week.kilometers} km</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Tijd</dt>
          <dd className="font-medium">{formatDuration(week.seconds)}</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Weekbelasting als staafjes plus de ritten van de laatste twee weken.
 * Bewust geen SVG: staven van deze eenvoud lezen prima als CSS-blokken.
 */
export function ActivityLoadPanel({
  weeks,
  recent,
}: {
  weeks: WeeklyLoad[];
  recent: RideLoad[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const maxLoad = Math.max(...weeks.map((week) => week.load), 1);
  const withoutPower = recent.filter((row) => !row.hasPowerMeter).length;
  const labelTicks = new Set(tickIndices(weeks.length, 4));
  const activeWeek = active == null ? null : weeks[active] ?? null;

  return (
    <div className="space-y-5 p-4">
      {weeks.length > 0 ? (
        <div>
          <div
            className="relative flex h-32 items-stretch gap-1"
            onMouseLeave={() => setActive(null)}
          >
            {activeWeek && (
              <WeekTooltip
                week={activeWeek}
                position={((active ?? 0) + 0.5) / weeks.length}
              />
            )}
            {weeks.map((week, index) => (
              <button
                key={week.weekStart}
                type="button"
                aria-label={`Week van ${weekRange(week.weekStart)}: ${week.load} TSS`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                onClick={() => setActive((current) => (current === index ? null : index))}
                className="relative flex h-full min-w-0 flex-1 items-end rounded-t focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    "w-full rounded-t bg-[var(--chart-1)] transition-opacity",
                    active != null && active !== index && "opacity-40",
                  )}
                  style={{ height: `${Math.max(2, (week.load / maxLoad) * 100)}%` }}
                />
              </button>
            ))}
          </div>
          {/* Op smal scherm past niet elke weekdatum; dan tonen we alleen de
              ijkpunten en houden de lege cellen de uitlijning intact. */}
          <div className="mt-1 flex gap-1 text-xs text-muted-foreground">
            {weeks.map((week, index) => (
              <span
                key={week.weekStart}
                className={cn(
                  "min-w-0 flex-1 overflow-visible whitespace-nowrap text-center sm:truncate",
                  !labelTicks.has(index) && "invisible sm:visible",
                )}
              >
                {formatChartDate(week.weekStart)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog geen ritten met belastinggegevens gevonden.
        </p>
      ) : (
        <div>
          <ResponsiveTable
            rows={recent}
            rowKey={(row) => String(row.id)}
            minWidth={640}
            columns={[
              {
                key: "name",
                header: "Rit",
                primary: true,
                cell: (row) => row.name ?? "Rit",
                cellClassName: "max-w-40 truncate",
              },
              {
                key: "date",
                header: "Datum",
                secondary: true,
                cell: (row) => formatChartDate(row.start_date_local),
                cellClassName: "whitespace-nowrap text-muted-foreground",
              },
              {
                key: "time",
                header: "Tijd",
                align: "right",
                cell: (row) => formatDuration(row.moving_time_seconds),
              },
              {
                key: "tss",
                header: "TSS",
                align: "right",
                cell: (row) => (row.training_load ? Math.round(row.training_load) : "-"),
              },
              {
                key: "if",
                header: "IF",
                align: "right",
                cell: (row) => (row.intensity ? row.intensity.toFixed(2) : "-"),
              },
              {
                key: "np",
                header: "NP",
                align: "right",
                cell: (row) =>
                  row.normalized_watts ? `${Math.round(row.normalized_watts)}w` : "-",
              },
              {
                key: "kj",
                header: "kJ",
                align: "right",
                cell: (row) => (row.kilojoules ? Math.round(row.kilojoules) : "-"),
              },
            ]}
          />
          {withoutPower > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {withoutPower === 1 ? "Eén rit is" : `${withoutPower} ritten zijn`} zonder
              vermogensmeter gereden; daarvoor zijn TSS, IF en NP niet te bepalen.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
