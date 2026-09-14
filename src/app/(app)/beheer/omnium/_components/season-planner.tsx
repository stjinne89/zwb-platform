"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  OMNIUM_2026_27_PLAN,
  planOmniumSeason,
  weekdayLabel,
} from "@/lib/omnium/season-plan";
import { conflictsForDate, hasBlockingConflict } from "@/lib/omnium/known-series";
import {
  planSeasonEditions,
  setSeasonCurrent,
  setSeasonPublished,
} from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

const SEVERITY_STYLE: Record<string, string> = {
  clash: "text-destructive",
  adjacent: "text-amber-600 dark:text-amber-400",
  series_window: "text-muted-foreground",
};

export function SeasonPlanner({
  seasonId,
  seasonSlug,
  isPublished,
  isCurrent,
}: {
  seasonId: string;
  seasonSlug: string;
  isPublished: boolean;
  isCurrent: boolean;
}) {
  const [firstMonth, setFirstMonth] = useState(OMNIUM_2026_27_PLAN.firstMonth);
  const [monthCount, setMonthCount] = useState(OMNIUM_2026_27_PLAN.monthCount);
  const [weekday, setWeekday] = useState(OMNIUM_2026_27_PLAN.weekday);
  const [occurrence, setOccurrence] = useState(OMNIUM_2026_27_PLAN.occurrence);
  const [timeLocal, setTimeLocal] = useState(OMNIUM_2026_27_PLAN.timeLocal);
  const [preshow, setPreshow] = useState(
    OMNIUM_2026_27_PLAN.preshowMinutesBefore ?? 30,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const planned = useMemo(
    () =>
      planOmniumSeason({
        season: seasonSlug,
        firstMonth,
        monthCount,
        weekday,
        occurrence,
        timeLocal,
        preshowMinutesBefore: preshow,
      }),
    [seasonSlug, firstMonth, monthCount, weekday, occurrence, timeLocal, preshow],
  );

  const rows = useMemo(
    () =>
      planned.map((edition) => ({
        ...edition,
        conflicts: conflictsForDate(edition.dateKey),
      })),
    [planned],
  );

  const blocking = rows.filter((row) => hasBlockingConflict(row.conflicts)).length;

  function run(action: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "Er ging iets mis.");
        return;
      }
      setMessage(done);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={LABEL} htmlFor="omnium-first-month">
            Eerste maand
          </label>
          <input
            id="omnium-first-month"
            type="month"
            value={firstMonth}
            onChange={(event) => setFirstMonth(event.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="omnium-month-count">
            Aantal edities
          </label>
          <input
            id="omnium-month-count"
            type="number"
            min={1}
            max={12}
            value={monthCount}
            onChange={(event) => setMonthCount(Number(event.target.value))}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="omnium-weekday">
            Dag
          </label>
          <select
            id="omnium-weekday"
            className={FIELD}
            value={weekday}
            onChange={(event) => setWeekday(Number(event.target.value))}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <option key={day} value={day}>
                {weekdayLabel(day)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor="omnium-occurrence">
            Welke van de maand
          </label>
          <select
            id="omnium-occurrence"
            className={FIELD}
            value={occurrence}
            onChange={(event) => setOccurrence(Number(event.target.value))}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}e
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor="omnium-time">
            Starttijd
          </label>
          <input
            id="omnium-time"
            type="time"
            value={timeLocal}
            onChange={(event) => setTimeLocal(event.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="omnium-preshow">
            Voorbeschouwing (min)
          </label>
          <input
            id="omnium-preshow"
            type="number"
            min={0}
            max={120}
            value={preshow}
            onChange={(event) => setPreshow(Number(event.target.value))}
            className={FIELD}
          />
        </div>
      </div>

      {rows.length > 0 && (
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Voorbeeld ({rows.length} edities
            {blocking > 0 ? `, ${blocking} met een botsing` : ""})
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {rows.map((row) => (
              <li key={row.number}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="tabular-nums text-muted-foreground">
                    {new Date(row.startAtIso).toLocaleString("nl-NL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/Amsterdam",
                    })}
                  </span>
                  <span>Editie {row.number}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(row.startAtIso)
                      .toISOString()
                      .slice(11, 16)}{" "}
                    UTC
                  </span>
                </div>
                {row.conflicts.length > 0 && (
                  <ul className="mt-0.5 space-y-0.5 pl-4 text-xs">
                    {row.conflicts.map((conflict, index) => (
                      <li
                        key={`${row.number}-${index}`}
                        className={SEVERITY_STYLE[conflict.severity]}
                      >
                        {conflict.series}: {conflict.detail}
                        {!conflict.confirmed && " (schatting)"}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || rows.length === 0}
          onClick={() =>
            run(
              () =>
                planSeasonEditions({
                  seasonId,
                  season: seasonSlug,
                  firstMonth,
                  monthCount,
                  weekday,
                  occurrence,
                  timeLocal,
                  preshowMinutesBefore: preshow,
                }),
              "Seizoen gepland.",
            )
          }
        >
          {pending ? "Bezig…" : "Edities aanmaken"}
        </Button>
        {!isCurrent && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => setSeasonCurrent(seasonId), "Lopend seizoen gezet.")}
          >
            Lopend seizoen maken
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(
              () => setSeasonPublished(seasonId, !isPublished),
              isPublished ? "Seizoen offline gehaald." : "Seizoen gepubliceerd.",
            )
          }
        >
          {isPublished ? "Seizoen offline halen" : "Seizoen publiceren"}
        </Button>
      </div>
    </div>
  );
}
