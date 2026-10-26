"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import {
  FTP_TEST_LABELS,
  FTP_TEST_TYPES,
  type FtpTestType,
} from "@/lib/training/ftp-test";

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

/**
 * `trainer`: in de cockpit, met FTP-test en (ingeklapt) de prompt.
 * `self`: op Mijn doelen voor wie zichzelf coacht; één knop, en het schema
 * publiceert vanzelf (zie draft.ts). Tot 2026-10-26 moest zo iemand zichzelf
 * als trainer aanwijzen en via de cockpit en de rennerkiezer.
 */
export function AiDraftForm({
  athleteId,
  goalId,
  defaultPrompt,
  canUseAi,
  canGenerateAi,
  initialGenerationId,
  initialStatus,
  variant = "trainer",
}: {
  athleteId: string;
  goalId: string;
  defaultPrompt?: string;
  canUseAi: boolean;
  canGenerateAi: boolean;
  initialGenerationId?: string;
  initialStatus?: DraftStatus;
  variant?: "trainer" | "self";
}) {
  const self = variant === "self";
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  // Een schema dat met een test begint rekent daarna met een gemeten FTP in
  // plaats van met het getal dat ooit in het profiel is getypt.
  const [ftpTest, setFtpTest] = useState<FtpTestType | "">("");
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
          // Op Mijn doelen verdwijnt dit formulier zodra het doel een schema
          // heeft; zonder verversen blijft de melding met de link staan.
          if (!self) router.refresh();
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
  }, [activeGenerationId, router, self]);

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
      {self ? null : (
        <>
          {/* De prompt is voor wie de planner bijstuurt, niet voor elk concept;
              dicht verstuurt hij gewoon mee. */}
          {defaultPrompt ? (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Prompt aanpassen</summary>
              <textarea
                name="prompt_text"
                rows={7}
                defaultValue={defaultPrompt}
                aria-label="AI-prompt"
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 font-mono text-xs"
              />
            </details>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="text-muted-foreground">
              Start met FTP-test
              <select
                name="ftp_test"
                value={ftpTest}
                onChange={(event) => setFtpTest(event.target.value as FtpTestType | "")}
                className="ml-2 rounded-md border bg-background px-2 py-1"
              >
                <option value="">Nee</option>
                {FTP_TEST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {FTP_TEST_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            {ftpTest ? (
              <label className="text-muted-foreground">
                Op
                <input
                  name="ftp_test_date"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="ml-2 rounded-md border bg-background px-2 py-1"
                />
              </label>
            ) : null}
          </div>
        </>
      )}
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Bot className="size-4" />
        {self
          ? submitting || active
            ? "Schema wordt gemaakt..."
            : "Maak mijn schema"
          : submitting || active
            ? "AI-concept loopt..."
            : "AI-concept maken"}
      </button>
      {self ? null : !canUseAi ? (
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
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
          {self
            ? state.status === "completed"
              ? "Je schema staat klaar."
              : "Je schema wordt gemaakt..."
            : state.message}
          {/* Het concept staat op de tab Schema; zonder deze link moest de
              trainer het daar onderaan zelf zoeken. */}
          {state.status === "completed" && state.planId ? (
            <Link
              href={
                self
                  ? "/zwbeter-worden/schema"
                  : `/zwbeter-worden/trainer/schema?athlete=${athleteId}&plan=${state.planId}#schema-${state.planId}`
              }
              className="font-medium underline underline-offset-2"
            >
              Bekijken
            </Link>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}
