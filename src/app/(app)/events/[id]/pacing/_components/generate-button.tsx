"use client";

// De AI-generatie draait in de achtergrond bij OpenAI; de server geeft alleen
// een generatie-id terug en deze knop wacht tot het plan er staat. Zelfde ritme
// als useAiDraftPoll in de trainingsmodule, maar met een eigen endpoint per
// event.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Payload = {
  ok?: boolean;
  generationId?: string;
  status?: "queued" | "in_progress" | "completed";
  error?: string;
};

const FIRST_DELAY_MS = 2_000;
const INTERVAL_MS = 3_000;

export function GenerateButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!generationId) return;
    cancelled.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const response = await fetch(
          `/api/events/${eventId}/pacing/${generationId}`,
          { credentials: "same-origin", cache: "no-store" },
        );
        const payload = (await response.json()) as Payload;
        if (cancelled.current) return;

        if (!response.ok || !payload.ok) {
          setError(payload.error ?? "Voorstel ophalen is mislukt.");
          setGenerationId(null);
          setBusy(false);
          return;
        }
        if (payload.status === "completed") {
          setGenerationId(null);
          setBusy(false);
          router.refresh();
          return;
        }
        timer = setTimeout(poll, INTERVAL_MS);
      } catch {
        if (cancelled.current) return;
        setError("Voorstel ophalen is mislukt.");
        setGenerationId(null);
        setBusy(false);
      }
    }

    timer = setTimeout(poll, FIRST_DELAY_MS);
    return () => {
      cancelled.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [generationId, eventId, router]);

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/events/${eventId}/pacing`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.ok || !payload.generationId) {
        setError(payload.error ?? "Voorstel maken is mislukt.");
        setBusy(false);
        return;
      }
      setGenerationId(payload.generationId);
    } catch {
      setError("Voorstel maken is mislukt.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" onClick={start} disabled={busy}>
        <Sparkles data-icon="inline-start" className={busy ? "animate-pulse" : undefined} />
        {busy ? "Bezig..." : "Nieuw voorstel"}
      </Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
