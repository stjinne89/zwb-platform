"use client";

import { type FormEvent, useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiDraftPoll, type DraftPayload } from "./use-ai-draft-poll";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

const GOAL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "zrl", label: "ZRL" },
  { value: "ladder", label: "Ladder" },
  { value: "outdoor_event", label: "Outdoor event" },
  { value: "gran_fondo", label: "Gran fondo" },
  { value: "ftp", label: "FTP" },
  { value: "base_fitness", label: "Basisconditie" },
  { value: "rebuild", label: "Herstel/opbouw" },
];

const INTENSITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "easy", label: "Voorzichtig" },
  { value: "balanced", label: "Gebalanceerd" },
  { value: "hard", label: "Ambitieus" },
];

export type PlanUpdateDefaults = {
  planId: string;
  planTitle: string;
  goalType: string;
  targetDate: string | null;
  maxHoursPerWeek: number | null;
  desiredIntensity: string;
};

export function PlanUpdateForm({
  defaults,
  reason: initialReason = "",
}: {
  defaults: PlanUpdateDefaults;
  /** Voorgevulde reden, bv. vanuit de naleving van een beoordeelde workout. */
  reason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onCompleted = useCallback(() => {
    setResult("Bijgewerkt schema staat klaar als concept — beoordeel en publiceer het.");
    setOpen(false);
  }, []);
  const poll = useAiDraftPoll({
    onCompleted,
    failureMessage: "Bijgewerkt schema ophalen is mislukt.",
  });
  const { error, setError } = poll;

  const busy = submitting || poll.pending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    const formData = new FormData(event.currentTarget);

    setSubmitting(true);
    try {
      const response = await fetch("/api/training/plan-update", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const payload = isJson ? ((await response.json()) as DraftPayload) : null;

      if (!response.ok || !payload?.ok || !payload.generationId) {
        setError(payload?.error ?? "Schema bijwerken is mislukt.");
        return;
      }
      poll.watch(payload.generationId);
    } catch {
      setError("Schema bijwerken is mislukt.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div
        id="schema-bijwerken"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
      >
        <h3 className="flex items-center gap-2 font-semibold">
          <RefreshCw className="size-5 text-primary" />
          Schema bijwerken
        </h3>
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          Bijwerken
        </Button>
        {result && <p className="w-full text-sm text-primary">{result}</p>}
      </div>
    );
  }

  return (
    <form id="schema-bijwerken" onSubmit={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <input type="hidden" name="plan_id" value={defaults.planId} />
      <h3 className="flex items-center gap-2 font-semibold">
        <RefreshCw className="size-5 text-primary" />
        Schema bijwerken
      </h3>
      <p className="text-sm text-muted-foreground">
        {defaults.planTitle} — vanaf vandaag tot de einddatum.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Max. uren per week
          </span>
          <input
            name="max_hours_per_week"
            type="number"
            min={1}
            max={30}
            step={0.5}
            defaultValue={defaults.maxHoursPerWeek ?? ""}
            className={FIELD}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Belasting
          </span>
          <select
            name="desired_intensity"
            defaultValue={defaults.desiredIntensity}
            className={FIELD}
          >
            {INTENSITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Doeltype
          </span>
          <select name="goal_type" defaultValue={defaults.goalType} className={FIELD}>
            {GOAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Targetdatum
          </span>
          <input
            name="target_date"
            type="date"
            defaultValue={defaults.targetDate ?? ""}
            className={FIELD}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Reden
        </span>
        <input
          name="reason"
          defaultValue={initialReason}
          placeholder="bv. minder tijd door werk"
          className={FIELD}
        />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Bezig…" : "Werk schema bij"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={busy}
        >
          Annuleer
        </Button>
      </div>
    </form>
  );
}
