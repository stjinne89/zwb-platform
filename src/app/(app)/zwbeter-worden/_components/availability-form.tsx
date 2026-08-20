"use client";

// Beschikbaarheid per weekdag, in minuten. Schuifbalken in plaats van invoer:
// dit is een grove inschatting ("dinsdag anderhalf uur"), geen precisiewerk, en
// op de telefoon sleep je dat sneller dan je het typt.

import { useCallback, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WEEKDAY_SLUGS, type MinutesByDay } from "@/lib/training/availability";
import { AvailabilityGrid, minutesLabel } from "./availability-grid";
import { saveWeekAvailability } from "../_actions";
import { useAiDraftPoll } from "./use-ai-draft-poll";

export type AvailabilityWeek = {
  key: string;
  label: string;
  /** Maandag van de week, of null voor het standaardpatroon. */
  weekStart: string | null;
  availability: {
    minutesByDay: MinutesByDay;
    source: "week" | "default" | "goal";
  };
};

export type AvailabilityOptions = {
  weeks: AvailabilityWeek[];
};

function toMinutes(availability: AvailabilityWeek["availability"]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const day of WEEKDAY_SLUGS) {
    result[day] = availability.minutesByDay[day] ?? 0;
  }
  return result;
}

export function AvailabilityForm({ options }: { options: AvailabilityOptions }) {
  const [weekKey, setWeekKey] = useState(options.weeks[0]?.key ?? "deze");
  const week = options.weeks.find((row) => row.key === weekKey) ?? options.weeks[0];

  const [drafts, setDrafts] = useState<Record<string, Record<string, number>>>(() =>
    Object.fromEntries(options.weeks.map((row) => [row.key, toMinutes(row.availability)])),
  );
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onCompleted = useCallback(() => {
    setResult("Je schema is bijgewerkt op je beschikbaarheid.");
  }, []);
  const poll = useAiDraftPoll({
    onCompleted,
    failureMessage: "Bijwerken van je schema is mislukt.",
  });

  const minutes = drafts[week?.key ?? ""] ?? {};
  const total = WEEKDAY_SLUGS.reduce((sum, day) => sum + (minutes[day] ?? 0), 0);
  const busy = saving || poll.pending;

  function setDay(day: string, value: number) {
    if (!week) return;
    setDrafts((current) => ({
      ...current,
      [week.key]: { ...current[week.key], [day]: value },
    }));
  }

  async function save() {
    if (!week) return;
    poll.setError(null);
    setResult(null);
    setSaving(true);
    try {
      const formData = new FormData();
      if (week.weekStart) formData.set("week_start", week.weekStart);
      for (const day of WEEKDAY_SLUGS) {
        formData.set(`minutes_${day}`, String(minutes[day] ?? 0));
      }

      const outcome = await saveWeekAvailability(formData);
      if (!outcome.ok) {
        poll.setError(outcome.error);
        return;
      }
      if (outcome.generationId) {
        setResult("Opgeslagen. Je schema wordt bijgewerkt…");
        poll.watch(outcome.generationId);
      } else {
        setResult("Opgeslagen.");
      }
    } catch {
      poll.setError("Beschikbaarheid opslaan is mislukt.");
    } finally {
      setSaving(false);
    }
  }

  if (!week) return null;

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarClock className="size-5 text-primary" />
          Beschikbaarheid
        </h2>
        <div className="flex rounded-md border bg-background p-0.5 text-xs">
          {options.weeks.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setWeekKey(option.key)}
              className={`rounded px-2 py-1 font-medium transition ${
                option.key === week.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <AvailabilityGrid
          minutes={minutes}
          idPrefix={`availability-${week.key}`}
          disabled={busy}
          onChange={setDay}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={save} disabled={busy}>
          {busy ? "Bezig…" : "Opslaan"}
        </Button>
        <span className="text-sm text-muted-foreground">
          {minutesLabel(total)} — {week.label.toLowerCase()}
          {week.availability.source !== "week" && week.weekStart
            ? " (nu nog volgens je standaardweek)"
            : ""}
        </span>
      </div>

      {poll.error && <p className="mt-2 text-sm text-destructive">{poll.error}</p>}
      {result && <p className="mt-2 text-sm text-primary">{result}</p>}
    </section>
  );
}
