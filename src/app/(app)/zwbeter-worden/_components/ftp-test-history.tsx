"use client";

// De testhistorie op /zwbeter-worden/vermogen, met een correctie per regel.
//
// De ruwe meting typt het lid met de hand in en die gaat dus soms mis. Zonder
// correctie blijft zo'n typefout niet alleen in de historie staan maar ook in
// profiles.ftp_watts, en daarmee in elk wattage van het lopende schema; de enige
// uitweg was een nieuwe test doen.
//
// De FTP zelf is geen invoerveld: hij volgt uit meting en protocol, net als bij
// het opslaan van de uitslag. Anders kun je een regel achterlaten waarin de
// omrekenfactor niet meer klopt.

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FTP_TEST_LABELS,
  FTP_TEST_RESULT_LABELS,
  FTP_TEST_TYPES,
  ftpFromTest,
  type FtpTestType,
} from "@/lib/training/ftp-test";
import { correctFtpTestResult, removeFtpTestResult } from "../_actions";
import { useAiDraftPoll } from "./use-ai-draft-poll";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export type FtpTestHistoryRow = {
  id: string;
  testedOn: string;
  testType: FtpTestType;
  resultWatts: number;
  ftpWatts: number;
};

function dateLabel(dayKey: string) {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function typeLabel(testType: FtpTestType) {
  return testType === "ramp" ? "ramp" : "20 min";
}

/** Wat er na een correctie of verwijdering met de FTP van het profiel gebeurde. */
type ChangeOutcome = {
  ok: true;
  profileFtpWatts: number | null;
  profileChanged: boolean;
  profileWithoutTest: boolean;
  overwrittenByIntervals: boolean;
  generationId: string | null;
};

type ChangeResult = ChangeOutcome | { ok: false; error: string };

function outcomeMessage(done: string, outcome: ChangeOutcome) {
  const parts = [done];
  if (outcome.profileChanged) parts.push(`Je FTP staat nu op ${outcome.profileFtpWatts} W.`);
  if (outcome.profileWithoutTest) {
    parts.push(`Je profiel houdt ${outcome.profileFtpWatts} W aan; pas dat zelf aan op je profiel.`);
  }
  if (outcome.profileChanged && outcome.overwrittenByIntervals) {
    parts.push("Je profiel volgt intervals.icu, dus de eerstvolgende sync zet je eFTP terug.");
  }
  if (outcome.generationId) parts.push("Je schema wordt bijgewerkt…");
  return parts.join(" ");
}

export function FtpTestHistory({ tests }: { tests: FtpTestHistoryRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onCompleted = useCallback(() => {
    setMessage("Je schema is bijgewerkt.");
  }, []);
  const poll = useAiDraftPoll({
    onCompleted,
    failureMessage: "Bijwerken van je schema is mislukt.",
  });
  const busy = saving || poll.pending;

  async function run(work: () => Promise<ChangeResult>, done: string) {
    poll.setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const outcome = await work();
      if (!outcome.ok) {
        poll.setError(outcome.error);
        return;
      }
      setEditingId(null);
      setMessage(outcomeMessage(done, outcome));
      router.refresh();
      if (outcome.generationId) poll.watch(outcome.generationId);
    } catch {
      poll.setError("Er ging iets mis.");
    } finally {
      setSaving(false);
    }
  }

  async function save(test: FtpTestHistoryRow, formData: FormData) {
    formData.set("test_id", test.id);
    await run(() => correctFtpTestResult(formData), "Uitslag aangepast.");
  }

  async function remove(test: FtpTestHistoryRow) {
    if (!confirm(`Testuitslag van ${dateLabel(test.testedOn)} verwijderen?`)) return;
    const formData = new FormData();
    formData.set("test_id", test.id);
    await run(() => removeFtpTestResult(formData), "Uitslag verwijderd.");
  }

  return (
    <>
      <ul className="mt-3 divide-y text-sm">
        {tests.map((test) =>
          editingId === test.id ? (
            <li key={test.id} className="py-3">
              <EditRow
                test={test}
                busy={busy}
                onCancel={() => setEditingId(null)}
                onSave={(formData) => save(test, formData)}
              />
            </li>
          ) : (
            <li key={test.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span>
                {dateLabel(test.testedOn)}
                <span className="ml-2 text-muted-foreground">{typeLabel(test.testType)}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="tabular-nums">
                  <span className="text-muted-foreground">
                    {Math.round(test.resultWatts)} W gemeten
                  </span>
                  <span className="ml-3 font-medium">{test.ftpWatts} W FTP</span>
                </span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      poll.setError(null);
                      setMessage(null);
                      setEditingId(test.id);
                    }}
                    disabled={busy}
                    title="Uitslag aanpassen"
                    aria-label={`Uitslag van ${dateLabel(test.testedOn)} aanpassen`}
                    className="rounded-md border p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(test)}
                    disabled={busy}
                    title="Uitslag verwijderen"
                    aria-label={`Uitslag van ${dateLabel(test.testedOn)} verwijderen`}
                    className="rounded-md border p-1.5 text-muted-foreground transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </span>
              </span>
            </li>
          ),
        )}
      </ul>

      {poll.error && <p className="mt-2 text-sm text-destructive">{poll.error}</p>}
      {message && <p className="mt-2 text-sm text-primary">{message}</p>}
    </>
  );
}

function EditRow({
  test,
  busy,
  onSave,
  onCancel,
}: {
  test: FtpTestHistoryRow;
  busy: boolean;
  onSave: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const [testType, setTestType] = useState<FtpTestType>(test.testType);
  const [resultWatts, setResultWatts] = useState(String(Math.round(test.resultWatts)));

  const watts = Number(resultWatts);
  const preview = Number.isFinite(watts) && watts > 0 ? ftpFromTest(testType, watts) : null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(new FormData(event.currentTarget));
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Datum
          </span>
          <input
            name="tested_on"
            type="date"
            required
            defaultValue={test.testedOn}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Testvorm
          </span>
          <select
            name="test_type"
            value={testType}
            onChange={(event) => setTestType(event.target.value as FtpTestType)}
            className={FIELD}
          >
            {FTP_TEST_TYPES.map((option) => (
              <option key={option} value={option}>
                {FTP_TEST_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {FTP_TEST_RESULT_LABELS[testType]} (watt)
          </span>
          <input
            name="result_watts"
            type="number"
            min={50}
            max={999}
            step={1}
            required
            value={resultWatts}
            onChange={(event) => setResultWatts(event.target.value)}
            className={FIELD}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Bezig…" : "Opslaan"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Annuleer
        </Button>
        {preview != null ? (
          <span className="text-sm tabular-nums text-muted-foreground">{preview} W FTP</span>
        ) : null}
      </div>
    </form>
  );
}
