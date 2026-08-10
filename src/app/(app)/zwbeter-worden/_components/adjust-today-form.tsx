"use client";

import { type FormEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Moon, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markTodayRestDay } from "../_actions";
import { useAiDraftPoll, type DraftPayload } from "./use-ai-draft-poll";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

const FEELINGS: { value: string; label: string }[] = [
  { value: "tired", label: "Moe" },
  { value: "normal", label: "Normaal" },
  { value: "fresh", label: "Fris" },
];

export function AdjustTodayForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feeling, setFeeling] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [intervalsUrl, setIntervalsUrl] = useState<string | null>(null);

  const onCompleted = useCallback((payload: DraftPayload) => {
    setResult(
      payload.published
        ? "Aangepast. De training staat in ZWB en intervals.icu; je trainer kijkt er later naar."
        : "Voorstel klaargezet — bekijk het bij je schema's hieronder.",
    );
    setIntervalsUrl(payload.intervalsUrl ?? null);
    setOpen(false);
  }, []);
  const poll = useAiDraftPoll({
    onCompleted,
    firstDelayMs: 1_000,
    intervalMs: 2_500,
    failureMessage: "Voorstel ophalen is mislukt.",
  });
  const { error, setError } = poll;

  const busy = submitting || poll.pending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    const formData = new FormData(event.currentTarget);
    formData.set("feeling", feeling);

    setSubmitting(true);
    try {
      const response = await fetch("/api/training/today-adjustment", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const payload = isJson ? ((await response.json()) as DraftPayload) : null;

      if (!response.ok || !payload?.ok || !payload.generationId) {
        setError(payload?.error ?? "Voorstel maken is mislukt.");
        return;
      }
      poll.watch(payload.generationId);
    } catch {
      setError("Voorstel maken is mislukt.");
    } finally {
      setSubmitting(false);
    }
  }

  async function restDay(form: HTMLFormElement | null) {
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const formData = form ? new FormData(form) : new FormData();
      const outcome = await markTodayRestDay(formData);
      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }
      setResult("Rustdag genoteerd — de training van vandaag is vervallen.");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Rustdag opslaan is mislukt.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-5 text-primary" />
            Pas je training van vandaag aan
          </h2>
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            Aanpassen
          </Button>
        </div>
        {result && <p className="mt-2 text-sm text-primary">{result}</p>}
        {intervalsUrl && (
          <a
            href={intervalsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-2",
            )}
          >
            <ExternalLink data-icon="inline-start" />
            Open in intervals.icu
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-5 text-primary" />
        Pas je training van vandaag aan
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Beschikbare tijd vandaag (min)
          </span>
          <input
            name="available_minutes"
            type="number"
            min={10}
            max={480}
            placeholder="bv. 60"
            className={FIELD}
          />
        </label>
        <div>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hoe voel je je?
          </span>
          <div className="flex gap-1.5">
            {FEELINGS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFeeling(f.value)}
                className={`flex-1 rounded-md border px-2 py-2 text-sm transition ${
                  feeling === f.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:border-primary/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Notitie (optioneel)
        </span>
        <input
          name="note"
          placeholder="bv. benen zwaar van gisteren"
          className={FIELD}
        />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Bezig…" : "Maak voorstel"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(event) => restDay(event.currentTarget.form)}
          disabled={busy}
        >
          <Moon data-icon="inline-start" />
          Rustdag
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
