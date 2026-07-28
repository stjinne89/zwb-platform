import type { ActivityLoadRow, WeeklyLoad } from "@/lib/intervals/activities";
import { formatChartDate } from "@/lib/charts/format";

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
  recent: ActivityLoadRow[];
}) {
  const maxLoad = Math.max(...weeks.map((week) => week.load), 1);

  return (
    <div className="space-y-5 p-4">
      {weeks.length > 0 ? (
        <div>
          <div className="flex h-32 items-end gap-1">
            {weeks.map((week) => (
              <div key={week.weekStart} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {week.load || ""}
                </span>
                <div
                  title={`${formatChartDate(week.weekStart)} - ${week.load} TSS, ${week.hours}u, ${week.kilojoules} kJ`}
                  className="w-full rounded-t bg-[var(--chart-1)]"
                  style={{ height: `${Math.max(2, (week.load / maxLoad) * 90)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1 text-[10px] text-muted-foreground">
            {weeks.map((week) => (
              <span key={week.weekStart} className="min-w-0 flex-1 truncate text-center">
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-1 pr-3 font-medium">Datum</th>
                <th className="py-1 pr-3 font-medium">Rit</th>
                <th className="py-1 pr-3 text-right font-medium">Tijd</th>
                <th className="py-1 pr-3 text-right font-medium">TSS</th>
                <th className="py-1 pr-3 text-right font-medium">IF</th>
                <th className="py-1 pr-3 text-right font-medium">NP</th>
                <th className="py-1 text-right font-medium">kJ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recent.map((row) => (
                <tr key={row.intervals_id}>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-muted-foreground">
                    {formatChartDate(row.start_date_local)}
                  </td>
                  <td className="max-w-40 truncate py-1.5 pr-3">{row.name ?? "Rit"}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {formatDuration(row.moving_time_seconds)}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {row.training_load ? Math.round(row.training_load) : "-"}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {row.intensity ? row.intensity.toFixed(2) : "-"}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {row.normalized_watts ? `${Math.round(row.normalized_watts)}w` : "-"}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {row.kilojoules ? Math.round(row.kilojoules) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
