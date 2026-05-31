"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";

type DraftState = {
  ok: boolean;
  error?: string;
  message?: string;
} | null;

export function AiDraftForm({
  athleteId,
  goalId,
  defaultPrompt,
  canUseAi,
  canGenerateAi,
}: {
  athleteId: string;
  goalId: string;
  defaultPrompt: string;
  canUseAi: boolean;
  canGenerateAi: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<DraftState>(null);
  const disabled = pending || !canUseAi || !canGenerateAi;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setState(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/training/ai-draft", {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });
        const isJson = response.headers.get("content-type")?.includes("application/json");
        const payload = isJson
          ? ((await response.json()) as { ok?: boolean; error?: string; planId?: string })
          : null;

        if (!response.ok || !payload?.ok) {
          setState({
            ok: false,
            error:
              payload?.error ??
              `AI-concept maken faalde met serverstatus ${response.status}.`,
          });
          return;
        }

        setState({ ok: true, message: "AI-concept aangemaakt." });
        router.refresh();
      } catch (err) {
        setState({
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : "AI-concept maken faalde voordat de server antwoord gaf.",
        });
      }
    });
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
        {pending ? "AI-concept maken..." : "AI-concept maken"}
      </button>
      {!canUseAi ? (
        <p className="text-xs text-muted-foreground">OPENAI_API_KEY ontbreekt.</p>
      ) : !canGenerateAi ? (
        <p className="text-xs text-muted-foreground">
          Je rol mist het recht om AI-trainingsconcepten te maken.
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
