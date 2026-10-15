"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { QUESTION_MAX } from "@/lib/wie-weet-wat/limits";
import { askQuestion } from "../_actions";

export function QuestionForm({
  expertId,
  topic,
  tipId,
  needsConsent,
}: {
  expertId: string;
  topic: string;
  tipId: string | null;
  needsConsent: boolean;
}) {
  const [body, setBody] = useState("");
  const [consent, setConsent] = useState(!needsConsent);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function send() {
    setError(null);
    startTransition(async () => {
      const res = await askQuestion({ expertId, topic, body, tipId, consent });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/leden/wie-weet-wat/gesprekken/${res.data?.threadId}`);
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        autoFocus
        rows={5}
        maxLength={QUESTION_MAX}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-label="Je vraag"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {needsConsent && (
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            Ik ga akkoord met{" "}
            <Link href="/privacy#wie-weet-wat" className="underline underline-offset-2">
              Wie weet wat in de privacyverklaring
            </Link>
            .
          </span>
        </label>
      )}
      <Button disabled={pending || !consent || body.trim().length === 0} onClick={send}>
        {pending ? "Versturen…" : "Versturen"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
