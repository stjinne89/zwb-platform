"use client";

// Een AI-generatie draait in de achtergrond bij OpenAI; de server geeft alleen
// een generation-id terug en de pagina moet zelf wachten tot het schema er is.
// Die pollus stond eerst identiek in het dag-aanpassings- en het
// bijwerkformulier, en met het beschikbaarheids- en ritformulier erbij zouden
// dat er vier zijn geworden.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type DraftStatus = "queued" | "in_progress" | "completed" | "failed" | "cancelled";

export type DraftPayload = {
  ok?: boolean;
  generationId?: string;
  status?: DraftStatus;
  planId?: string;
  error?: string;
  message?: string;
  published?: boolean;
  intervalsUrl?: string | null;
};

export function useAiDraftPoll({
  onCompleted,
  firstDelayMs = 1_500,
  intervalMs = 3_000,
  failureMessage = "Schema ophalen is mislukt.",
}: {
  onCompleted: (payload: DraftPayload) => void;
  firstDelayMs?: number;
  intervalMs?: number;
  failureMessage?: string;
}) {
  const router = useRouter();
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!generationId) return;
    const id = generationId;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const response = await fetch(`/api/training/ai-draft/${id}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const isJson = response.headers.get("content-type")?.includes("application/json");
        const payload = isJson ? ((await response.json()) as DraftPayload) : null;
        if (cancelled) return;

        if (!response.ok || !payload?.ok) {
          setError(payload?.error ?? failureMessage);
          setGenerationId(null);
          return;
        }

        if (payload.status === "completed") {
          setGenerationId(null);
          onCompleted(payload);
          router.refresh();
          return;
        }

        if (payload.status === "failed" || payload.status === "cancelled") {
          setError(payload.error ?? failureMessage);
          setGenerationId(null);
          return;
        }

        timeoutId = setTimeout(poll, intervalMs);
      } catch {
        if (cancelled) return;
        setError(failureMessage);
        setGenerationId(null);
      }
    }

    timeoutId = setTimeout(poll, firstDelayMs);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [generationId, router, onCompleted, firstDelayMs, intervalMs, failureMessage]);

  const reset = useCallback(() => setError(null), []);

  return {
    /** Zolang dit gezet is loopt er een generatie en staat de knop op bezig. */
    generationId,
    watch: setGenerationId,
    error,
    setError,
    reset,
    pending: generationId != null,
  };
}
