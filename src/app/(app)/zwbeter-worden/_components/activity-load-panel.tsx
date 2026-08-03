import type { RideLoad, WeeklyLoad } from "@/lib/training/ride-metrics";
import { formatChartDate } from "@/lib/charts/format";
import { tickIndices } from "@/lib/charts/responsive";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number | null) {
  if (!seconds) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}u ${minutes}m` : `${minutes}m`;
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
  const maxLoad = Math.max(...weeks.map((week) => week.load), 1);
  const withoutPower = recent.filter((row) => !row.hasPowerMeter).length;
  const labelTicks = new Set(tickIndices(weeks.length, 4));

  return (
    <div className="space-y-5 p-4">
      {weeks.length > 0 ? (
        <div>
          {/* De staafzone staat los van de waarderegel: een hoogte in procenten
              heeft een kolom met definitieve hoogte nodig, en anders snoepen de
              tekstregels hoogte van de hoogste staven af. */}
          <div className="flex h-32 items-stretch gap-1">
            {weeks.map((week, index) => (
              <div key={week.weekStart} className="flex h-full min-w-0 flex-1 flex-col gap-1">
                <span
                  className={cn(
                    "h-4 overflow-visible whitespace-nowrap text-center text-xs tabular-nums text-muted-foreground",
                    !labelTicks.has(index) && "invisible sm:visible",
                  )}
                >
                  {week.load || ""}
                </span>
                <span className="relative flex-1">
                  <span
                    title={`${formatChartDate(week.weekStart)} - ${week.load} TSS, ${week.hours}u, ${week.kilojoules} kJ`}
                    className="absolute inset-x-0 bottom-0 rounded-t bg-[var(--chart-1)]"
                    style={{ height: `${Math.max(2, (week.load / maxLoad) * 100)}%` }}
                  />
                </span>
              </div>
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
