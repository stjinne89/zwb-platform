"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { QA_QUESTION_MAX, QA_QUESTION_MIN } from "@/lib/qa/limits";
import { askAppQuestion } from "../_actions";

/** Bovenaan /qa. */
export function AskQuestionForm() {
  const [body, setBody] = useState("");
  const [bestuurOnly, setBestuurOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function send() {
    setError(null);
    setSent(false);
    startTransition(async () => {
      const res = await askAppQuestion({ body, bestuurOnly });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      setBestuurOnly(false);
      setSent(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <textarea
        rows={4}
        maxLength={QA_QUESTION_MAX}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setSent(false);
        }}
        placeholder="Je vraag over de app"
        aria-label="Je vraag over de app"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="size-4"
            checked={bestuurOnly}
            onChange={(e) => setBestuurOnly(e.target.checked)}
          />
          Alleen voor het bestuur
        </label>
        <Button
          size="sm"
          disabled={pending || body.trim().length < QA_QUESTION_MIN}
          onClick={send}
        >
          {pending ? "Versturen…" : "Versturen"}
        </Button>
      </div>
      {sent && <p className="text-sm text-muted-foreground">Je vraag is verstuurd.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
