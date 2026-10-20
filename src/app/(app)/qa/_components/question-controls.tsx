"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { QaVisibility } from "@/lib/qa/data";
import { QA_ANSWER_MAX } from "@/lib/qa/limits";
import {
  answerAppQuestion,
  deleteAppQuestion,
  mergeAppQuestion,
  setAlsoAsked,
  setAppQuestionFaq,
  setAppQuestionVisibility,
} from "../_actions";

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

/** "Ik ook" bij een clubvraag van een ander. */
export function AlsoAskedButton({ id, alsoAsked }: { id: string; alsoAsked: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <>
      <Button
        variant={alsoAsked ? "secondary" : "ghost"}
        size="sm"
        aria-pressed={alsoAsked}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await setAlsoAsked(id, !alsoAsked);
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
      >
        Ik ook
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </>
  );
}

/** Voor wie qa.answer heeft: een beantwoorde clubvraag in of uit de FAQ. */
export function FaqButton({ id, faq }: { id: string; faq: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await setAppQuestionFaq(id, !faq);
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
      >
        {faq ? "Uit FAQ" : "In FAQ"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </>
  );
}

/** Voor wie qa.answer heeft: een open vraag die er al staat samenvoegen. */
export function MergeControl({
  id,
  options,
}: {
  id: string;
  options: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (options.length === 0) return null;
  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Dubbel
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        aria-label="Zelfde vraag als"
        className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">Zelfde vraag als…</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={pending || !target}
        onClick={() =>
          startTransition(async () => {
            const res = await mergeAppQuestion(id, target);
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Samenvoegen…" : "Samenvoegen"}
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => setOpen(false)}>
        Annuleren
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
