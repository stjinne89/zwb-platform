"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";

type DraftStatus = "queued" | "in_progress" | "completed" | "failed" | "cancelled";

type DraftState = {
  ok: boolean;
  generationId?: string;
  status?: DraftStatus;
  planId?: string;
  error?: string;
  message?: string;
} | null;

type DraftPayload = {
  ok?: boolean;
  generationId?: string;
  status?: DraftStatus;
  planId?: string;
  error?: string;
  message?: string;
};

export function AiDraftForm({
  athleteId,
  goalId,
  defaultPrompt,
  canUseAi,
  canGenerateAi,
  initialGenerationId,
  initialStatus,
}: {
  athleteId: string;
  goalId: string;
  defaultPrompt: string;
  canUseAi: boolean;
  canGenerateAi: boolean;
  initialGenerationId?: string;
  initialStatus?: DraftStatus;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(
    initialGenerationId ?? null,
  );
  const [state, setState] = useState<DraftState>(
    initialGenerationId
      ? {
          ok: true,
          generationId: initialGenerationId,
          status: initialStatus ?? "queued",
          message: "AI-concept wordt gemaakt...",
        }
      : null,
  );
  const active = Boolean(
    activeGenerationId &&
      (state?.status === "queued" || state?.status === "in_progress"),
  );
  const disabled = submitting || active || !canUseAi || !canGenerateAi;

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
          setState({
            ok: false,
            generationId,
            error:
              payload?.error ??
              "AI-concept ophalen is mislukt.",
          });
          setActiveGenerationId(null);
          return;
        }

        if (payload.status === "completed") {
          setState({
            ok: true,
            generationId: payload.generationId,
            status: payload.status,
            planId: payload.planId,
            message: "AI-concept aangemaakt.",
          });
          setActiveGenerationId(null);
          router.refresh();
          return;
        }

        if (payload.status === "failed" || payload.status === "cancelled") {
          setState({
            ok: false,
            generationId: payload.generationId,
            status: payload.status,
            error: payload.error ?? "AI-concept maken faalde.",
          });
          setActiveGenerationId(null);
          return;
        }

        setState({
          ok: true,
          generationId: payload.generationId,
          status: payload.status,
          message: "AI-concept wordt gemaakt...",
        });
        timeoutId = setTimeout(poll, 5_000);
      } catch {
        if (cancelled) return;
        setState({
          ok: false,
          generationId,
          error:
            "AI-concept ophalen is mislukt.",
        });
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
    const formData = new FormData(event.currentTarget);
    setState(null);

    setSubmitting(true);
    try {
      const response = await fetch("/api/training/ai-draft", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const payload = isJson ? ((await response.json()) as DraftPayload) : null;

      if (!response.ok || !payload?.ok || !payload.generationId) {
        setState({
          ok: false,
          error:
            payload?.error ??
            "AI-concept maken is mislukt.",
        });
        return;
      }

      setState({
        ok: true,
        generationId: payload.generationId,
        status: payload.status ?? "queued",
        message: payload.message ?? "AI-concept wordt gemaakt...",
      });
      setActiveGenerationId(payload.generationId);
      router.refresh();
    } catch {
      setState({
        ok: false,
        error:
          "AI-concept maken is mislukt.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <input type="hidden" name="athlete_id" value={athleteId} />
      <input type="hidden" name="goal_id" value={goalId} />
      <label className="block text-xs text-muted-foreground">
        AI-prompt
        <textarea
          name="prompt_text"
          rows={7}
          defaultValue={defaultPrompt}
          className="mt-1 w-full rounded-md border bg-background px-2 py-1 font-mono text-xs"
        />
      </label>
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Bot className="size-4" />
        {submitting || active ? "AI-concept loopt..." : "AI-concept maken"}
      </button>
      {!canUseAi ? (
        <p className="text-xs text-muted-foreground">
          AI-generatie is niet beschikbaar.
        </p>
      ) : !canGenerateAi ? (
        <p className="text-xs text-muted-foreground">
          AI-generatie is niet beschikbaar voor jouw account.
        </p>
      ) : null}
      {state?.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : state?.message ? (
        <p className="rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
