"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { refreshRacepasses, saveRacepasses } from "../_actions";
import type { TeamOption } from "./import-form";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export type RacepassEntry = { url: string; siteUrl: string | null };
/** Bestaande passes, per racedatum per team. */
export type RacepassMap = Record<string, Record<string, RacepassEntry>>;
export type RacepassImportStatus = { lastSuccess: string | null; lastError: string | null };

function dateLabel(dateKey: string) {
  return new Date(`${dateKey}T12:00:00Z`).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function RacepassForm({
  teams,
  dates,
  current,
  status,
  canImport,
}: {
  teams: TeamOption[];
  dates: string[];
  current: RacepassMap;
  status: RacepassImportStatus;
  canImport: boolean;
}) {
  const [raceDate, setRaceDate] = useState(dates[0] ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const router = useRouter();

  function refresh() {
    setMessage(null);
    startRefresh(async () => {
      const result = await refreshRacepasses();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(result.saved > 0 ? `${result.saved} bijgewerkt.` : "Geen wijzigingen.");
      router.refresh();
    });
  }

  const entries = current[raceDate] ?? {};

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {dates.length > 0 && (
          <select
            value={raceDate}
            onChange={(e) => {
              setRaceDate(e.target.value);
              setMessage(null);
            }}
            aria-label="Race"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {dates.map((date) => (
              <option key={date} value={date}>
                {dateLabel(date)}
              </option>
            ))}
          </select>
        )}
        {canImport && (
          <Button type="button" variant="outline" onClick={refresh} disabled={refreshing}>
            {refreshing ? "Bezig…" : "Ophalen van site"}
          </Button>
        )}
        {canImport && status.lastSuccess && (
          <span className="text-sm text-muted-foreground">Opgehaald {status.lastSuccess}</span>
        )}
      </div>
      {canImport && status.lastError && (
        <p className="text-sm text-destructive">{status.lastError}</p>
      )}
      {raceDate && (
        <RacepassFields
          key={`${raceDate}:${JSON.stringify(entries)}`}
          teams={teams}
          raceDate={raceDate}
          entries={entries}
          message={message}
          onMessage={setMessage}
        />
      )}
      {!raceDate && message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

function RacepassFields({
  teams,
  raceDate,
  entries,
  message,
  onMessage,
}: {
  teams: TeamOption[];
  raceDate: string;
  entries: Record<string, RacepassEntry>;
  message: string | null;
  onMessage: (message: string | null) => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(entries).map(([teamId, entry]) => [teamId, entry.url])),
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    onMessage(null);
    startTransition(async () => {
      const result = await saveRacepasses({
        raceDate,
        passes: teams.map((team) => ({ teamId: team.id, url: urls[team.id] ?? "" })),
      });
      onMessage(result.ok ? "Opgeslagen." : result.error);
      if (result.ok) router.refresh();
    });
  }

  return (
    <>
      <ul className="space-y-2">
        {teams.map((team) => {
          const siteUrl = entries[team.id]?.siteUrl ?? null;
          const value = urls[team.id] ?? "";
          return (
            <li key={team.id} className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-center">
              <label htmlFor={`racepass-${team.id}`} className="text-sm font-medium">
                {team.name}
              </label>
              <div className="space-y-1">
                <input
                  id={`racepass-${team.id}`}
                  type="url"
                  value={value}
                  onChange={(e) => setUrls((prev) => ({ ...prev, [team.id]: e.target.value }))}
                  placeholder="https://www.wtrl.racing/RacePass/…"
                  className={FIELD}
                />
                {siteUrl && value !== siteUrl && (
                  <button
                    type="button"
                    onClick={() => setUrls((prev) => ({ ...prev, [team.id]: siteUrl }))}
                    className="text-xs text-destructive underline underline-offset-2"
                  >
                    Site wijkt af, overnemen
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-3">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Bezig…" : "Racepasses opslaan"}
        </Button>
        {message && <span className="text-sm text-muted-foreground">{message}</span>}
      </div>
    </>
  );
}
