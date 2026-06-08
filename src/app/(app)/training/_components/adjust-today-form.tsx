"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

const FEELINGS: { value: string; label: string }[] = [
  { value: "tired", label: "Moe" },
  { value: "normal", label: "Normaal" },
  { value: "fresh", label: "Fris" },
];

type DraftStatus = "queued" | "in_progress" | "completed" | "failed" | "cancelled";

type DraftPayload = {
  ok?: boolean;
  generationId?: string;
  status?: DraftStatus;
  planId?: string;
  error?: string;
  message?: string;
};

export function AdjustTodayForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feeling, setFeeling] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = submitting || Boolean(activeGenerationId);

  // Poll de gedeelde AI-draft-status tot het concept klaar is.
  useEffect(() => {
    if (!activeGenerationId) return;
    const generationId = activeGenerationId;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const response = await fetch(`/api/training/ai-draft/${generationId}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const isJson = response.headers.get("content-type")?.includes("application/json");
        const payload = isJson ? ((await response.json()) as DraftPayload) : null;
        if (cancelled) return;

        if (!response.ok || !payload?.ok) {
          setError(payload?.error ?? `Status ophalen faalde (${response.status}).`);
          setActiveGenerationId(null);
          return;
        }

        if (payload.status === "completed") {
          setResult("Voorstel klaargezet — bekijk het bij je schema's hieronder.");
          setActiveGenerationId(null);
          setOpen(false);
          router.refresh();
          return;
        }

        if (payload.status === "failed" || payload.status === "cancelled") {
          setError(payload.error ?? "Aanpassing maken faalde.");
          setActiveGenerationId(null);
          return;
        }

        timeoutId = setTimeout(poll, 5_000);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Status ophalen faalde.");
        setActiveGenerationId(null);
      }
    }

    timeoutId = setTimeout(poll, 2_000);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeGenerationId, router]);

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
        setError(payload?.error ?? `Aanpassing maken faalde (${response.status}).`);
        return;
      }
      setActiveGenerationId(payload.generationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aanpassing maken faalde.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-5 text-primary" />
              Pas je training van vandaag aan
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Te moe, weinig tijd of juist fris? Laat de AI je schema van vandaag
              bijsturen.
            </p>
          </div>
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            Aanpassen
          </Button>
        </div>
        {result && <p className="mt-2 text-sm text-primary">{result}</p>}
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
            min={0}
            max={600}
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

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Bezig…" : "Maak voorstel"}
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
      <p className="text-xs text-muted-foreground">
        Het voorstel wordt op de achtergrond gemaakt en verschijnt als concept bij
        je schema&apos;s; je trainer (of jijzelf) kan het goedkeuren en publiceren.
      </p>
    </form>
  );
}
