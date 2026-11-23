"use client";

import { type FormEvent, type ReactNode, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Moon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markTodayRestDay } from "../_actions";
import { ADJUST_TODAY_ANCHOR } from "./adjust-today-link";
import { useAiDraftPoll, type DraftPayload } from "./use-ai-draft-poll";
import { useClubTexts } from "@/components/club-texts-provider";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

const FEELINGS: { value: string; label: string }[] = [
  { value: "tired", label: "Moe" },
  { value: "normal", label: "Normaal" },
  { value: "fresh", label: "Fris" },
];

/**
 * `initialOpen`: het lid komt via de link bij "je schema wordt vannacht
 * bijgewerkt" (AdjustTodayLink) om vandaag meteen aan te passen; dan staat het
 * formulier al open.
 *
 * Staat op de dagkaart, dus zonder eigen kaart. `canRest`: er is vandaag een open
 * training om af te schrijven. `children`: de links naast de knop. `secondary`:
 * de kaart heeft al een hoofdknop (Naar het event).
 */
export function AdjustTodayForm({
  initialOpen = false,
  canRest = true,
  secondary = false,
  children,
}: {
  initialOpen?: boolean;
  canRest?: boolean;
  secondary?: boolean;
  children?: ReactNode;
}) {
  const clubTexts = useClubTexts();
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [feeling, setFeeling] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [intervalsUrl, setIntervalsUrl] = useState<string | null>(null);

  const onCompleted = useCallback((payload: DraftPayload) => {
    setResult(
      payload.published
        ? `Aangepast. De training staat in ${clubTexts.shortName} en intervals.icu; je trainer kijkt er later naar.`
        : "Voorstel klaargezet in je schema.",
    );
    setIntervalsUrl(payload.intervalsUrl ?? null);
    setOpen(false);
  }, [clubTexts.shortName]);
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
      <div id={ADJUST_TODAY_ANCHOR} className="mt-4 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 [&>a]:min-h-11">
          <Button
            type="button"
            variant={secondary ? "outline" : "default"}
            className="min-h-11 px-4"
            onClick={() => setOpen(true)}
          >
            Pas vandaag aan
          </Button>
          {children}
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
    <form
      id={ADJUST_TODAY_ANCHOR}
      onSubmit={submit}
      className="mt-4 scroll-mt-20 space-y-3 border-t pt-4"
    >
      <h3 className="font-semibold">Pas je training van vandaag aan</h3>

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
                className={`min-h-11 flex-1 rounded-md border px-2 py-2 text-sm transition ${
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
        <Button type="submit" className="min-h-11 px-4" disabled={busy}>
          {busy ? "Bezig…" : "Maak voorstel"}
        </Button>
        {canRest ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 px-4"
            onClick={(event) => restDay(event.currentTarget.form)}
            disabled={busy}
          >
            <Moon data-icon="inline-start" />
            Rustdag
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 px-4"
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
