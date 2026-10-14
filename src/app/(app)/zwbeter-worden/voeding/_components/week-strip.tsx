// De laatste zeven dagen van Naleving: per dag het dagtype en twee stippen,
// links koolhydraten en rechts eiwit, gevuld als de onderkant gehaald is. Ook
// gebruikt op de trainerspagina.

import Link from "next/link";
import { FUEL_DAY_LABELS } from "@/lib/nutrition/day-type";
import type { WeekDay, WeekTally } from "@/lib/nutrition/log";

function dotClass(reached: boolean | null) {
  return `size-2 rounded-full border border-primary ${reached ? "bg-primary" : ""}`;
}

function weekMark(entry: WeekDay) {
  if (!entry.logged) return "Niet ingevuld";
  const part = (label: string, reached: boolean | null) => `${label} ${reached ? "gehaald" : "niet gehaald"}`;
  return `${part("Koolhydraten", entry.carbsReached)}, ${part("eiwit", entry.proteinReached)}`;
}

export function WeekStrip({
  days,
  tally,
  selected,
  hrefFor,
}: {
  days: WeekDay[];
  tally: WeekTally[];
  selected?: string;
  /** Zonder link zijn de dagen alleen om te lezen. */
  hrefFor?: (day: string) => string;
}) {
  const cellClass = (day: string) =>
    `flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-md border p-1 ${
      hrefFor ? "hover:border-primary" : ""
    } ${day === selected ? "border-primary" : ""}`;

  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Deze week</h3>
      <ol className="grid grid-cols-7 gap-1 text-center text-xs">
        {days.map((entry) => {
          const content = (
            <>
              <span className="font-medium">
                {new Date(`${entry.day}T12:00:00Z`).toLocaleDateString("nl-NL", { weekday: "short", timeZone: "UTC" })}
              </span>
              <span className="max-w-full truncate capitalize text-muted-foreground">{entry.dayType}</span>
              <span role="img" aria-label={weekMark(entry)} className="flex h-3 items-center gap-1">
                {entry.logged ? (
                  <>
                    <span className={dotClass(entry.carbsReached)} />
                    <span className={dotClass(entry.proteinReached)} />
                  </>
                ) : (
                  <span className="text-muted-foreground">–</span>
                )}
              </span>
            </>
          );
          return (
            <li key={entry.day}>
              {hrefFor ? (
                <Link
                  href={hrefFor(entry.day)}
                  aria-current={entry.day === selected ? "date" : undefined}
                  className={cellClass(entry.day)}
                >
                  {content}
                </Link>
              ) : (
                <div className={cellClass(entry.day)}>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
      {tally.length > 0 && (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {tally.map((entry) => (
            <li key={entry.dayType}>
              {FUEL_DAY_LABELS[entry.dayType]}: koolhydraten gehaald op {entry.carbsReached} van {entry.logged}{" "}
              {entry.logged === 1 ? "ingevulde dag" : "ingevulde dagen"}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
