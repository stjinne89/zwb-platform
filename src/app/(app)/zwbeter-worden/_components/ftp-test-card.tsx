"use client";

// De FTP-test aan de kant van het lid: de uitslag invullen, en zien wanneer de
// volgende staat. Het inplannen zelf zit op het trainerscherm — wánneer je test
// hoort bij de opbouw van het schema, niet bij de dag zelf.
//
// Zonder de uitslag is de test een zware rit en verandert er niets: elk wattage
// in de weken erna hangt aan de FTP die hier wordt gemeten.
//
// Het invulveld staat vooringevuld met wat intervals.icu die dag heeft gemeten;
// het lid kan dat overschrijven. Een test die buiten het schema om is gereden,
// vul je hier los in.

import { useCallback, useEffect, useRef, useState } from "react";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FTP_TEST_LABELS,
  FTP_TEST_RESULT_LABELS,
  FTP_TEST_TYPES,
  type FtpTestType,
} from "@/lib/training/ftp-test";
import { saveFtpTestResult, suggestFtpTestResult } from "../_actions";
import { useAiDraftPoll } from "./use-ai-draft-poll";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export type FtpTestCardProps = {
  todayKey: string;
  upcoming: { workoutId: string; date: string; testType: FtpTestType } | null;
  awaitingResult: { workoutId: string; date: string; testType: FtpTestType } | null;
  lastTest: { testedOn: string; testType: FtpTestType; ftpWatts: number } | null;
};

function dayLabel(dayKey: string) {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

export function FtpTestCard({ todayKey, upcoming, awaitingResult, lastTest }: FtpTestCardProps) {
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [looseOpen, setLooseOpen] = useState(false);
  const [looseType, setLooseType] = useState<FtpTestType>("ramp");
  const [looseDate, setLooseDate] = useState(todayKey);
  const [watts, setWatts] = useState("");
  const [measured, setMeasured] = useState<number | null>(null);
  // Heeft het lid zelf iets getypt, dan overschrijft een late meting dat niet.
  const typed = useRef(false);

  const onCompleted = useCallback(() => {
    setResult("Je schema is bijgewerkt.");
  }, []);
  const poll = useAiDraftPoll({
    onCompleted,
    failureMessage: "Bijwerken van je schema is mislukt.",
  });
  const busy = saving || poll.pending;

  // De test waar het invulveld nu over gaat: die uit het schema, of een losse.
  const target = awaitingResult
    ? awaitingResult
    : looseOpen
      ? { workoutId: null, date: looseDate, testType: looseType }
      : null;
  const targetDate = target?.date ?? null;
  const targetType = target?.testType ?? null;

  useEffect(() => {
    if (!targetDate || !targetType) return;
    let cancelled = false;
    suggestFtpTestResult({ testedOn: targetDate, testType: targetType })
      .then((suggestion) => {
        if (cancelled) return;
        setMeasured(suggestion.watts);
        if (!typed.current) setWatts(suggestion.watts == null ? "" : String(suggestion.watts));
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [targetDate, targetType]);

  async function submitResult(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;
    poll.setError(null);
    setResult(null);
    setSaving(true);
    try {
      const formData = new FormData();
      if (target.workoutId) formData.set("workout_id", target.workoutId);
      formData.set("test_type", target.testType);
      formData.set("tested_on", target.date);
      formData.set("result_watts", watts);
      const outcome = await saveFtpTestResult(formData);
      if (!outcome.ok) {
        poll.setError(outcome.error);
        return;
      }
      typed.current = false;
      setWatts("");
      setLooseOpen(false);
      const changed =
        outcome.previousFtpWatts != null ? ` (was ${outcome.previousFtpWatts} W)` : "";
      if (outcome.generationId) {
        setResult(`FTP op ${outcome.ftpWatts} W${changed}. Je schema wordt bijgewerkt…`);
        poll.watch(outcome.generationId);
      } else {
        setResult(`FTP op ${outcome.ftpWatts} W${changed}.`);
      }
    } catch {
      poll.setError("Uitslag opslaan is mislukt.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Gauge className="size-5 text-primary" />
          FTP-test
        </h2>
        {lastTest ? (
          <span className="text-sm text-muted-foreground">
            Laatste: {dayLabel(lastTest.testedOn)} — {lastTest.ftpWatts} W
          </span>
        ) : null}
      </div>

      {target ? (
        <form onSubmit={submitResult} className="mt-3 space-y-3">
          {awaitingResult ? (
            <p className="text-sm text-muted-foreground">
              {FTP_TEST_LABELS[awaitingResult.testType]} van {dayLabel(awaitingResult.date)}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {FTP_TEST_TYPES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setLooseType(option)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition ${
                      option === looseType
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background hover:border-primary/40"
                    }`}
                  >
                    {FTP_TEST_LABELS[option]}
                  </button>
                ))}
              </div>
              <label className="block text-sm sm:max-w-xs">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Datum
                </span>
                <input
                  type="date"
                  value={looseDate}
                  max={todayKey}
                  required
                  onChange={(event) => setLooseDate(event.target.value)}
                  className={FIELD}
                />
              </label>
            </div>
          )}
          <label className="block text-sm sm:max-w-xs">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {FTP_TEST_RESULT_LABELS[target.testType]} (watt)
              {measured != null && watts === String(measured) ? " · intervals.icu" : ""}
            </span>
            <input
              name="result_watts"
              type="number"
              min={50}
              max={999}
              step={1}
              required
              value={watts}
              onChange={(event) => {
                typed.current = true;
                setWatts(event.target.value);
              }}
              className={FIELD}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Bezig…" : "Uitslag opslaan"}
            </Button>
            {!awaitingResult ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setLooseOpen(false)}
              >
                Annuleren
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {upcoming ? (
            <p className="text-sm text-muted-foreground">
              {FTP_TEST_LABELS[upcoming.testType]} staat op {dayLabel(upcoming.date)}.
            </p>
          ) : (
            <span />
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              typed.current = false;
              setWatts("");
              setMeasured(null);
              setResult(null);
              setLooseOpen(true);
            }}
          >
            Test invullen
          </Button>
        </div>
      )}

      {poll.error && <p className="mt-2 text-sm text-destructive">{poll.error}</p>}
      {result && <p className="mt-2 text-sm text-primary">{result}</p>}
    </section>
  );
}
