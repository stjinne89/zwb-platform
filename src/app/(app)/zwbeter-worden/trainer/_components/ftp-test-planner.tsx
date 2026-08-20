"use client";

// Het inplannen van een FTP-test hoort bij de trainer: wánneer je meet is een
// keuze in de opbouw van het schema. Het lid vult na afloop alleen de uitslag in
// op zijn eigen schemapagina.
//
// De test komt als vast blok in het schema, dus de planner werkt eromheen en een
// herziening streept hem niet weg. Dezelfde twee protocollen staan ook in de
// workout-bibliotheek, voor wie hem liever op een andere plek in de week zet.

import { useCallback, useState } from "react";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FTP_TEST_LABELS,
  FTP_TEST_TYPES,
  ftpTestDurationMinutes,
  type FtpTestType,
} from "@/lib/training/ftp-test";
import { planFtpTest } from "../../_actions";
import { useAiDraftPoll } from "../../_components/use-ai-draft-poll";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export type FtpTestPlannerProps = {
  athleteId: string;
  todayKey: string;
  hasPlan: boolean;
  upcoming: { date: string; testType: FtpTestType } | null;
  awaitingResult: { date: string; testType: FtpTestType } | null;
  lastTest: { testedOn: string; testType: FtpTestType; ftpWatts: number } | null;
};

function dayLabel(dayKey: string) {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

export function FtpTestPlanner({
  athleteId,
  todayKey,
  hasPlan,
  upcoming,
  awaitingResult,
  lastTest,
}: FtpTestPlannerProps) {
  const [testType, setTestType] = useState<FtpTestType>("ramp");
  const [date, setDate] = useState(todayKey);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onCompleted = useCallback(() => {
    setResult("Het schema is eromheen bijgewerkt.");
  }, []);
  const poll = useAiDraftPoll({
    onCompleted,
    failureMessage: "Bijwerken van het schema is mislukt.",
  });
  const busy = saving || poll.pending;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    poll.setError(null);
    setResult(null);
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("athlete_id", athleteId);
      formData.set("date", date);
      formData.set("test_type", testType);
      const outcome = await planFtpTest(formData);
      if (!outcome.ok) {
        poll.setError(outcome.error);
        return;
      }
      if (outcome.generationId) {
        setResult("Ingepland. Het schema wordt eromheen bijgewerkt…");
        poll.watch(outcome.generationId);
      } else {
        setResult("Ingepland.");
      }
    } catch {
      poll.setError("FTP-test inplannen is mislukt.");
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
        ) : (
          <span className="text-sm text-muted-foreground">Nog geen test gedaan</span>
        )}
      </div>

      {awaitingResult ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {FTP_TEST_LABELS[awaitingResult.testType]} van {dayLabel(awaitingResult.date)} wacht op
          de uitslag van het lid.
        </p>
      ) : upcoming ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {FTP_TEST_LABELS[upcoming.testType]} staat op {dayLabel(upcoming.date)}.
        </p>
      ) : !hasPlan ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Dit lid heeft geen lopend schema om een test in te zetten.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {FTP_TEST_TYPES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTestType(option)}
                className={`rounded-md border px-3 py-1.5 text-sm transition ${
                  option === testType
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:border-primary/40"
                }`}
              >
                {FTP_TEST_LABELS[option]} · {ftpTestDurationMinutes(option)} min
              </button>
            ))}
          </div>
          <label className="block text-sm sm:max-w-xs">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Datum
            </span>
            <input
              name="date"
              type="date"
              value={date}
              min={todayKey}
              onChange={(event) => setDate(event.target.value)}
              className={FIELD}
            />
          </label>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Bezig…" : "Test inplannen"}
          </Button>
        </form>
      )}

      {poll.error && <p className="mt-2 text-sm text-destructive">{poll.error}</p>}
      {result && <p className="mt-2 text-sm text-primary">{result}</p>}
    </section>
  );
}
