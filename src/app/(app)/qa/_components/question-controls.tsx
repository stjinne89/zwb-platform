"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { QaVisibility } from "@/lib/qa/data";
import { QA_ANSWER_MAX } from "@/lib/qa/limits";
import { answerAppQuestion, deleteAppQuestion, setAppQuestionVisibility } from "../_actions";

/** Voor wie qa.answer heeft: antwoord schrijven of aanpassen. */
export function AnswerForm({ id, answer }: { id: string; answer: string | null }) {
  const [editing, setEditing] = useState(answer === null);
  const [text, setText] = useState(answer ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!editing) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
        Antwoord aanpassen
      </Button>
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await answerAppQuestion(id, text);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="w-full space-y-2">
      <textarea
        rows={4}
        maxLength={QA_ANSWER_MAX}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Antwoord"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending || text.trim().length === 0} onClick={save}>
          {pending ? "Opslaan…" : answer === null ? "Beantwoorden" : "Opslaan"}
        </Button>
        {answer !== null && (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              setText(answer);
              setEditing(false);
            }}
          >
            Annuleren
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** Voor wie qa.answer heeft: een clubvraag afschermen, of weer voor de club zetten. */
export function VisibilityButton({ id, visibility }: { id: string; visibility: QaVisibility }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const next: QaVisibility = visibility === "club" ? "bestuur" : "club";
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await setAppQuestionVisibility(id, next);
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
      >
        {next === "bestuur" ? "Alleen bestuur" : "Voor iedereen"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </>
  );
}

export function DeleteQuestionButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Vraag verwijderen?")) return;
          startTransition(async () => {
            const res = await deleteAppQuestion(id);
            if (!res.ok) setError(res.error);
            else router.refresh();
          });
        }}
      >
        Verwijderen
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </>
  );
}
