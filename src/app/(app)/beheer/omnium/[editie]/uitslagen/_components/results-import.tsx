"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { defaultModeFor } from "@/lib/omnium/import";
import type { ParseMode } from "@/lib/omnium/parse-results";
import { OMNIUM_LEAGUES } from "@/lib/omnium/scales";
import type { Discipline } from "@/lib/omnium/scoring";
import {
  previewOmniumResults,
  saveOmniumResults,
  type PreviewRow,
} from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

const MODE_LABELS: Record<ParseMode, string> = {
  finish: "Finishvolgorde",
  segment: "Segmenttijd",
  crit_points: "Punten per renner",
  crit_detailed: "Sprint- en finishblokken",
  sheet_csv: "Sheet-CSV",
};

function modesFor(discipline: Discipline): ParseMode[] {
  if (discipline === "sprint") return ["segment", "finish"];
  if (discipline === "crit") return ["crit_points", "crit_detailed"];
  return ["finish"];
}

export function ResultsImport({
  editionEventId,
  discipline,
  title,
  resultsState,
}: {
  editionEventId: string;
  discipline: Discipline;
  title: string;
  resultsState: string;
}) {
  const [raw, setRaw] = useState("");
  const [mode, setMode] = useState<ParseMode>(defaultModeFor(discipline));
  const [defaultLeague, setDefaultLeague] = useState("");
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [issues, setIssues] = useState<
    Array<{ lineNumber: number; raw: string; reason: string }>
  >([]);
  const [newRiders, setNewRiders] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const modes = modesFor(discipline);

  function preview() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await previewOmniumResults({
        editionEventId,
        raw,
        mode,
        defaultLeague: defaultLeague || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRows(res.rows);
      setIssues(res.issues);
      setNewRiders(res.newRiders);
    });
  }

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await saveOmniumResults({
        editionEventId,
        raw,
        mode,
        defaultLeague: defaultLeague || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(
        `${res.saved} uitslagen opgeslagen${res.createdRiders > 0 ? `, ${res.createdRiders} nieuwe renners` : ""}.`,
      );
      setRows(null);
      setRaw("");
      router.refresh();
    });
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        <span
          className={
            resultsState === "final"
              ? "rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
              : "rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
          }
        >
          {resultsState === "final" ? "uitslag binnen" : "nog geen uitslag"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {modes.length > 1 && (
          <div>
            <label className={LABEL} htmlFor={`${editionEventId}-mode`}>
              Invoervorm
            </label>
            <select
              id={`${editionEventId}-mode`}
              className={FIELD}
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as ParseMode);
                setRows(null);
              }}
            >
              {modes.map((value) => (
                <option key={value} value={value}>
                  {MODE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className={LABEL} htmlFor={`${editionEventId}-league`}>
            League als de regel er geen heeft
          </label>
          <select
            id={`${editionEventId}-league`}
            className={FIELD}
            value={defaultLeague}
            onChange={(event) => setDefaultLeague(event.target.value)}
          >
            <option value="">Geen</option>
            {OMNIUM_LEAGUES.map((league) => (
              <option key={league} value={league}>
                {league}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor={`${editionEventId}-raw`}>
          Uitslag plakken
        </label>
        <textarea
          id={`${editionEventId}-raw`}
          rows={6}
          value={raw}
          onChange={(event) => {
            setRaw(event.target.value);
            setRows(null);
          }}
          className={`${FIELD} font-mono text-xs`}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      {rows && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {rows.length} regels
            {newRiders > 0 ? `, ${newRiders} nieuwe renners` : ""}
            {issues.length > 0 ? `, ${issues.length} overgeslagen` : ""}
          </p>
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5">#</th>
                    <th className="px-2 py-1.5">Renner</th>
                    <th className="px-2 py-1.5">League</th>
                    <th className="px-2 py-1.5">Status</th>
                    <th className="px-2 py-1.5 text-right">Punten</th>
                    <th className="px-2 py-1.5">Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.lineNumber}>
                      <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                        {row.position ?? "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        {row.name}
                        {row.teamName && (
                          <span className="text-muted-foreground"> · {row.teamName}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-xs">{row.league}</td>
                      <td className="px-2 py-1.5 text-xs">{row.status}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {row.points}
                      </td>
                      <td className="px-2 py-1.5 text-xs">
                        {row.match === "known" ? (
                          <span className="text-muted-foreground">
                            {row.matchedVia === "zwift_id" ? "Zwift-ID" : "naam"}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            nieuw
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {issues.length > 0 && (
            <ul className="space-y-0.5 text-xs text-destructive">
              {issues.map((issue) => (
                <li key={issue.lineNumber}>
                  Regel {issue.lineNumber}: {issue.reason} — {issue.raw}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || raw.trim().length === 0}
          onClick={preview}
        >
          {pending ? "Bezig…" : "Voorbeeld"}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending || !rows || rows.length === 0}
          onClick={save}
        >
          Opslaan
        </Button>
      </div>
    </section>
  );
}
