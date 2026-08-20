"use client";

// De FTP-test aan de kant van het lid: de uitslag invullen, en zien wanneer de
// volgende staat. Het inplannen zelf zit op het trainerscherm — wánneer je test
// hoort bij de opbouw van het schema, niet bij de dag zelf.
//
// Zonder de uitslag is de test een zware rit en verandert er niets: elk wattage
// in de weken erna hangt aan de FTP die hier wordt gemeten.

import { useCallback, useState } from "react";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FTP_TEST_LABELS,
  FTP_TEST_RESULT_LABELS,
  type FtpTestType,
} from "@/lib/training/ftp-test";
import { saveFtpTestResult } from "../_actions";
import { useAiDraftPoll } from "./use-ai-draft-poll";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export type FtpTestCardProps = {
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

export function FtpTestCard({ upcoming, awaitingResult, lastTest }: FtpTestCardProps) {
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onCompleted = useCallback(() => {
    setResult("Je schema is bijgewerkt.");
  }, []);
  const poll = useAiDraftPoll({
    onCompleted,
    failureMessage: "Bijwerken van je schema is mislukt.",
  });
  const busy = saving || poll.pending;

  async function submitResult(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!awaitingResult) return;
    poll.setError(null);
    setResult(null);
    setSaving(true);
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("workout_id", awaitingResult.workoutId);
      formData.set("test_type", awaitingResult.testType);
      formData.set("tested_on", awaitingResult.date);
      const outcome = await saveFtpTestResult(formData);
      if (!outcome.ok) {
        poll.setError(outcome.error);
        return;
      }
      const changed =
        outcome.previousFtpWatts != null ? ` (was ${outcome.previousFtpWatts} W)` : "";
      // Volgt het profiel intervals.icu, dan houdt het deze waarde niet vast.
      const overwritten = outcome.overwrittenByIntervals
        ? " Je profiel volgt intervals.icu, dus de eerstvolgende sync zet je eFTP terug."
        : "";
      if (outcome.generationId) {
        setResult(
          `FTP op ${outcome.ftpWatts} W${changed}. Je schema wordt bijgewerkt…${overwritten}`,
        );
        poll.watch(outcome.generationId);
      } else {
        setResult(`FTP op ${outcome.ftpWatts} W${changed}.${overwritten}`);
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

      {awaitingResult ? (
        <form onSubmit={submitResult} className="mt-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            {FTP_TEST_LABELS[awaitingResult.testType]} van {dayLabel(awaitingResult.date)}
          </p>
          <label className="block text-sm sm:max-w-xs">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {FTP_TEST_RESULT_LABELS[awaitingResult.testType]} (watt)
            </span>
            <input
              name="result_watts"
              type="number"
              min={50}
              max={999}
              step={1}
              required
              className={FIELD}
            />
          </label>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Bezig…" : "Uitslag opslaan"}
          </Button>
        </form>
      ) : upcoming ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {FTP_TEST_LABELS[upcoming.testType]} staat op {dayLabel(upcoming.date)}.
        </p>
      ) : null}

      {poll.error && <p className="mt-2 text-sm text-destructive">{poll.error}</p>}
      {result && <p className="mt-2 text-sm text-primary">{result}</p>}
    </section>
  );
}
