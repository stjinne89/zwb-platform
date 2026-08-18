"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  SEVERITY_LABELS,
  SYMPTOM_OPTIONS,
  symptomLabel,
  type SymptomLog,
} from "@/lib/training/symptoms";
import { deleteSymptomLog, saveSymptomLog } from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function LogForm({
  today,
  existing,
  recent,
}: {
  today: string;
  existing: SymptomLog | null;
  recent: SymptomLog[];
}) {
  const [severity, setSeverity] = useState<number | null>(existing?.severity ?? null);
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [cycleStart, setCycleStart] = useState(existing?.cycle_start ?? false);
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(key: string) {
    setSymptoms((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    );
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveSymptomLog({
        logDate: today,
        severity,
        symptoms,
        cycleStart,
        note: note || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function removeDay(date: string) {
    if (!confirm("Deze dag verwijderen?")) return;
    startTransition(async () => {
      const res = await deleteSymptomLog(date);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Vandaag
        </h2>

        <div>
          <p className="mb-2 text-sm font-medium">Hoeveel last heb je?</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={severity === value ? "default" : "outline"}
                onClick={() => setSeverity(severity === value ? null : value)}
              >
                {SEVERITY_LABELS[value]}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Waar merk je het aan?</p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_OPTIONS.map((option) => (
              <Button
                key={option.key}
                type="button"
                size="sm"
                variant={symptoms.includes(option.key) ? "default" : "outline"}
                onClick={() => toggle(option.key)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cycleStart}
            onChange={(e) => setCycleStart(e.target.checked)}
          />
          Eerste dag van mijn menstruatie
        </label>

        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notitie (optioneel)"
          className={FIELD}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" disabled={pending} onClick={save}>
            {pending ? "Opslaan…" : "Opslaan"}
          </Button>
          {saved && <span className="text-sm text-muted-foreground">Opgeslagen.</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Afgelopen weken
          </h2>
          <ul className="mt-3 divide-y">
            {recent.map((log) => (
              <li key={log.id} className="flex flex-wrap items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm">
                    {new Date(log.log_date).toLocaleDateString("nl-NL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                    {log.severity != null && (
                      <span className="ml-2 text-muted-foreground">
                        {SEVERITY_LABELS[log.severity]}
                      </span>
                    )}
                    {log.cycle_start && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                        start
                      </span>
                    )}
                  </p>
                  {log.symptoms.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {log.symptoms.map(symptomLabel).join(" · ")}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => removeDay(log.log_date)}
                >
                  Verwijderen
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
